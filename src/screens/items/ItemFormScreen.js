import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {Input, CustomAlert, LoadingOverlay} from '../../components/ui';
import {CategoryChips} from '../../components/CategoryChips';
import {ScheduleDateField} from '../../components/ScheduleDateField';
import {useImagePicker} from '../../hooks/useImagePicker';
import {useCategories} from '../../hooks/useCategories';
import {formatPrice, parsePrice} from '../../utils/formatPrice';
import {formatDateKo, formatDateISO} from '../../utils/formatDate';
import {supabase, suggestProductInfo, identifyItem} from '../../lib/supabase';
import {addMonths, nextReplacementFrom, formatMonths} from '../../utils/schedule';
import {onItemSaved} from '../../lib/reminders';

const WARRANTY_CATEGORIES = ['가전', '가구', '전자기기'];
// 배터리 점검은 전자기기 성격의 카테고리에서만 제안
const ELECTRONICS_CATEGORIES = ['가전', '전자기기'];
const REPLACEMENT_MONTH_OPTIONS = [1, 2, 3, 6, 12, 24];
const CATEGORY_NAME_MAP = {
  '전자기기': '가전',
  '생활용품': '잡화',
  '뷰티': '잡화',
  '식품': '잡화',
  '도서': '잡화',
};
const AI_DEBOUNCE_MS = 600;
const AI_MIN_LENGTH = 2;

const toDate = v => (v ? new Date(v) : null);
const toISO = d => (d ? formatDateISO(d) : null);

function ItemFormScreen({navigation, route}) {
  const existingItem = route.params?.item;
  const prefilledData = route.params?.prefilledData;
  const initialIsWishlist = route.params?.is_wishlist || false;
  const isEdit = !!existingItem;

  const {pickImage, takePhoto, uploadImage, previewUri, setExistingImageUrl} =
    useImagePicker({onPicked: asset => handlePhotoPicked(asset)});
  const {categories} = useCategories();

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [price, setPrice] = useState('');
  const [storeName, setStoreName] = useState('');
  const [link, setLink] = useState('');
  const [memo, setMemo] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [isWishlist, setIsWishlist] = useState(initialIsWishlist);
  const [showExtra, setShowExtra] = useState(false);

  const [warrantyDate, setWarrantyDate] = useState(null);
  // AI 제안으로 설정된 보증 개월 수. 값이 있으면 구입날짜 변경 시 만료일을 다시 계산한다
  const [warrantyMonths, setWarrantyMonths] = useState(null);
  const [batteryCheckDate, setBatteryCheckDate] = useState(null);
  const [showBatteryCheck, setShowBatteryCheck] = useState(false);
  const [replacementMonths, setReplacementMonths] = useState(null);
  const [replacementItem, setReplacementItem] = useState('');
  const [nextReplacementDate, setNextReplacementDate] = useState(null);
  // 다음 교체일을 직접 고르면 주기·구입일 변경에 따른 자동 계산을 멈춘다
  const [isNextReplacementManual, setIsNextReplacementManual] = useState(false);
  const [showReplacement, setShowReplacement] = useState(false);
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);
  const titleRef = useRef('');
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const lastQueriedRef = useRef('');
  const aiRequestSeqRef = useRef(0);

  // Alerts
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
    confirmText: '확인',
  });

  const selectedCategory = categories.find(c => c.id === categoryId);
  const showWarrantyField = selectedCategory && WARRANTY_CATEGORIES.includes(selectedCategory.name);
  const isElectronics = selectedCategory && ELECTRONICS_CATEGORIES.includes(selectedCategory.name);

  useEffect(() => {
    if (existingItem) {
      setTitle(existingItem.name || '');
      setDate(new Date(existingItem.item_date || Date.now()));
      setPrice(formatPrice(existingItem.price));
      setStoreName(existingItem.store_name || '');
      setLink(existingItem.link || '');
      setMemo(existingItem.memo || '');
      setCategoryId(existingItem.category_id || null);
      setExistingImageUrl(existingItem.image_url || '');
      setWarrantyDate(toDate(existingItem.warranty_date));
      setBatteryCheckDate(toDate(existingItem.battery_check_date));
      setShowBatteryCheck(!!existingItem.battery_check_date);
      setReplacementMonths(existingItem.replacement_months || null);
      setReplacementItem(existingItem.replacement_item || '');
      setNextReplacementDate(toDate(existingItem.next_replacement_date));
      setIsNextReplacementManual(!!existingItem.next_replacement_date);
      setShowReplacement(!!(existingItem.replacement_months || existingItem.next_replacement_date));
      if (existingItem.link || existingItem.memo) {
        setShowExtra(true);
      }
    } else if (prefilledData) {
      setTitle(prefilledData.name || '');
      setPrice(formatPrice(prefilledData.price) || '');
      setStoreName(prefilledData.store_name || '');
      setLink(prefilledData.link || '');
      setCategoryId(prefilledData.category_id || null);
      if (prefilledData.image_url) {
        setExistingImageUrl(prefilledData.image_url);
      }
      if (prefilledData.link) {
        setShowExtra(true);
      }
    }
  }, [existingItem, prefilledData]);

  // 알림의 "사진으로 기록" 버튼으로 들어온 경우 바로 카메라를 연다 (사진 인식으로 제목 자동 입력)
  useEffect(() => {
    if (route.params?.autoPhoto && !isEdit) {
      const timer = setTimeout(takePhoto, 400);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const showAlert = (config) => {
    setAlertConfig({...config, visible: true});
  };

  const onChangePrice = text => {
    setPrice(formatPrice(text));
  };

  const setQuickDate = daysAgo => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    setDate(d);
  };

  // 같은 제목은 한 번만 호출하고, 늦게 도착한 이전 요청의 응답은 버린다
  const requestAiSuggestion = useCallback(async name => {
    const query = name.trim();
    if (isEdit || query.length < AI_MIN_LENGTH || query === lastQueriedRef.current) return;
    lastQueriedRef.current = query;
    const seq = ++aiRequestSeqRef.current;
    setIsAiLoading(true);
    let result = null;
    try {
      result = await suggestProductInfo(query);
    } catch (e) {
      result = null;
    }
    if (seq !== aiRequestSeqRef.current) return;
    setIsAiLoading(false);
    setAiSuggestion(
      result && (result.category || result.warranty_months > 0 || result.replacement_months > 0) ? result : null,
    );
  }, [isEdit]);

  // 입력을 멈추면 자동으로 제안 요청 (포커스 해제 시에는 즉시)
  useEffect(() => {
    if (isEdit) return;
    if (!title.trim()) {
      aiRequestSeqRef.current++;
      lastQueriedRef.current = '';
      setIsAiLoading(false);
      setAiSuggestion(null);
      return;
    }
    const timer = setTimeout(() => requestAiSuggestion(title), AI_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, isEdit, requestAiSuggestion]);

  const handleTitleBlur = () => requestAiSuggestion(title);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // 사진을 고르면 제목이 비어 있을 때만 AI가 물건 이름을 채운다 (이후 제목 기반 제안으로 이어짐)
  const handlePhotoPicked = async asset => {
    if (isEdit || titleRef.current.trim() || !asset?.base64) return;
    setIsPhotoAnalyzing(true);
    const result = await identifyItem(asset.base64, asset.type);
    setIsPhotoAnalyzing(false);
    const name = result?.name?.trim();
    if (name && !titleRef.current.trim()) {
      setTitle(name.slice(0, 20));
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    Keyboard.dismiss();
    const catName = CATEGORY_NAME_MAP[aiSuggestion.category] || aiSuggestion.category;
    const cat = categories.find(c => c.name === catName);
    if (cat) setCategoryId(cat.id);
    if (aiSuggestion.warranty_months > 0) {
      setWarrantyMonths(aiSuggestion.warranty_months);
    }
    if (aiSuggestion.replacement_months > 0) {
      setReplacementMonths(aiSuggestion.replacement_months);
      // AI가 필터류 소모품이라고 알려주면 비어 있는 소모품 이름을 '필터'로 채운다
      if (aiSuggestion.has_filter) setReplacementItem(prev => prev || '필터');
      setIsNextReplacementManual(false);
      setShowReplacement(true);
    }
    setAiSuggestion(null);
  };

  useEffect(() => {
    if (warrantyMonths) setWarrantyDate(addMonths(date, warrantyMonths));
  }, [date, warrantyMonths]);

  useEffect(() => {
    if (!isNextReplacementManual) setNextReplacementDate(nextReplacementFrom(date, replacementMonths));
  }, [date, replacementMonths, isNextReplacementManual]);

  const selectReplacementMonths = months => {
    setReplacementMonths(months);
    setIsNextReplacementManual(false);
  };

  const removeReplacement = () => {
    setShowReplacement(false);
    setReplacementMonths(null);
    setReplacementItem('');
    setNextReplacementDate(null);
    setIsNextReplacementManual(false);
  };

  // 기준일로부터 n년 뒤 날짜를 채우는 빠른 선택 버튼
  const yearsAfter = (base, years, label) => ({
    label,
    getDate: () => addMonths(base, years * 12),
  });

  // 사용자가 만료일을 직접 지정/초기화하면 자동 계산을 멈춘다
  const setWarrantyDateManually = d => {
    setWarrantyMonths(null);
    setWarrantyDate(d);
  };

  const handleSave = () => {
    if (!title.trim()) {
      showAlert({
        title: '알림',
        message: '제목을 입력해주세요.',
        onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
      });
      return;
    }

    if (isEdit) {
      showAlert({
        title: '수정 확인',
        message: '정보를 수정하시겠습니까?',
        confirmText: '수정',
        cancelText: '취소',
        onConfirm: doSave,
        onCancel: () => setAlertConfig(prev => ({...prev, visible: false})),
      });
    } else {
      doSave();
    }
  };

  const doSave = async () => {
    setAlertConfig(prev => ({...prev, visible: false}));
    setLoading(true);

    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) {
        navigation.reset({routes: [{name: 'SignUp'}]});
        return;
      }

      const imageUrl = await uploadImage(user.email);

      const itemData = {
        name: title.trim(),
        price: parsePrice(price),
        item_date: formatDateISO(date),
        store_name: storeName.trim() || null,
        link: link.trim() || null,
        memo: memo.trim() || null,
        category_id: categoryId,
        image_url: imageUrl,
        is_wishlist: isWishlist,
        warranty_date: toISO(warrantyDate),
        replacement_months: replacementMonths,
        next_replacement_date: toISO(nextReplacementDate),
      };
      // 배터리 점검·소모품 이름 컬럼은 DB 마이그레이션 이후에 생기므로,
      // 값이 있거나 기존 데이터에 컬럼이 있을 때만 보낸다 (마이그레이션 전에도 저장이 깨지지 않도록)
      const optionalColumns = {
        battery_check_date: toISO(batteryCheckDate),
        replacement_item: replacementItem.trim() || null,
      };
      Object.entries(optionalColumns).forEach(([key, value]) => {
        if (value !== null || (isEdit && key in existingItem)) itemData[key] = value;
      });

      if (isEdit) {
        const {error} = await supabase
          .from('items')
          .update({...itemData, updated_at: new Date().toISOString()})
          .eq('seq', existingItem.seq);

        if (error) throw error;
        await onItemSaved({...itemData, seq: existingItem.seq});
      } else {
        const {data: inserted, error} = await supabase
          .from('items')
          .insert({
            ...itemData,
            user_id: user.email,
          })
          .select('seq')
          .single();

        if (error) throw error;
        await onItemSaved({...itemData, seq: inserted.seq});
      }

      navigation.goBack();
    } catch (e) {
      showAlert({
        title: '오류',
        message: '저장에 실패하였습니다.',
        onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isEdit ? '아이템 수정' : '아이템 등록'}
        </Text>
        <Pressable onPress={handleSave} style={styles.headerBtn}>
          <Text style={styles.saveText}>저장</Text>
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        style={styles.scroll}
        enableOnAndroid={true}
        extraScrollHeight={180}
        keyboardShouldPersistTaps="handled">
        {/* 이미지 */}
        <Pressable
          onPress={pickImage}
          style={styles.imageSection}>
          {previewUri ? (
            <Image source={{uri: previewUri}} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={40} color={colors.textTertiary} />
              <Text style={styles.imagePlaceholderText}>사진 추가</Text>
            </View>
          )}
        </Pressable>

        {/* 섹션 1: 필수 정보 */}
        <View style={styles.section}>
          <Input
            label="제목"
            value={title}
            onChangeText={setTitle}
            onBlur={handleTitleBlur}
            placeholder="아이템 이름"
            maxLength={20}
            returnKeyType="next"
          />

          {/* AI 로딩 / 제안 배너 */}
          {isPhotoAnalyzing && (
            <View style={styles.aiBanner}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiBannerText}>사진에서 물건을 알아보는 중...</Text>
            </View>
          )}
          {isAiLoading && (
            <View style={styles.aiBanner}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.aiBannerText}>AI가 정보를 분석 중...</Text>
            </View>
          )}
          {aiSuggestion && !isAiLoading && (
            <View style={styles.aiBanner}>
              <Text style={styles.aiBannerText}>
                AI 제안: {aiSuggestion.category}
                {aiSuggestion.warranty_months > 0 ? ` · 보증 ${formatMonths(aiSuggestion.warranty_months)}` : ''}
                {aiSuggestion.replacement_months > 0 ? ` · 교체 ${formatMonths(aiSuggestion.replacement_months)}마다` : ''}
              </Text>
              <View style={styles.aiBannerActions}>
                <Pressable onPress={applyAiSuggestion} style={styles.aiBannerBtn}>
                  <Text style={styles.aiBannerBtnText}>적용</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    setAiSuggestion(null);
                  }}
                  style={styles.aiBannerBtnOutline}>
                  <Text style={styles.aiBannerBtnOutlineText}>무시</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* AI 제안이 채우는 필드는 배너 바로 아래에 둬서 적용 결과가 바로 보이도록 */}
          <Text style={styles.fieldLabel}>카테고리</Text>
          <CategoryChips
            categories={categories}
            selectedId={categoryId}
            onSelect={setCategoryId}
          />

          <Text style={styles.fieldLabel}>{isWishlist ? '등록날짜' : '구입날짜'}</Text>
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setDatePickerVisible(true)}
              style={styles.dateButton}>
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{marginRight: spacing.sm}} />
              <Text style={styles.dateText}>{formatDateKo(date)}</Text>
            </Pressable>
            <View style={styles.quickDates}>
              <Pressable
                onPress={() => setQuickDate(0)}
                style={styles.quickDateBtn}>
                <Text style={styles.quickDateText}>오늘</Text>
              </Pressable>
              <Pressable
                onPress={() => setQuickDate(1)}
                style={styles.quickDateBtn}>
                <Text style={styles.quickDateText}>어제</Text>
              </Pressable>
            </View>
          </View>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={d => {
              setDate(d);
              setDatePickerVisible(false);
            }}
            onCancel={() => setDatePickerVisible(false)}
          />

          {/* 보증 만료일 (가전/가구 카테고리만 표시) */}
          {showWarrantyField && (
            <>
              <ScheduleDateField
                label="보증 만료일"
                icon="shield-checkmark-outline"
                value={warrantyDate}
                onChange={setWarrantyDateManually}
                quickOptions={[
                  yearsAfter(date, 1, '구입 후 1년'),
                  yearsAfter(date, 2, '2년'),
                  yearsAfter(date, 3, '3년'),
                ]}
              />
              <Text style={styles.hint}>연장 보증(케어 서비스 등)에 가입했다면 늘어난 만료일로 입력하세요.</Text>
            </>
          )}

          {/* 관리 일정: 배터리 점검 / 소모품 교체 */}
          {showBatteryCheck && (
            <ScheduleDateField
              label="배터리 점검일"
              icon="battery-half-outline"
              value={batteryCheckDate}
              onChange={setBatteryCheckDate}
              quickOptions={[
                yearsAfter(date, 1, '구입 후 1년'),
                yearsAfter(date, 2, '2년'),
                yearsAfter(date, 3, '3년'),
              ]}
              onRemove={() => {
                setShowBatteryCheck(false);
                setBatteryCheckDate(null);
              }}
            />
          )}

          {showReplacement && (
            <>
              <View style={styles.labelRow}>
                <Text style={styles.sectionLabel}>소모품 교체</Text>
                <Pressable onPress={removeReplacement} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textTertiary} />
                </Pressable>
              </View>
              <Input
                label="소모품 이름"
                value={replacementItem}
                onChangeText={setReplacementItem}
                placeholder="예: 정수기 필터, 칫솔모, 건전지"
                maxLength={20}
              />
              <Text style={styles.fieldLabel}>교체 주기</Text>
              <View style={styles.monthChips}>
                {[...new Set([...REPLACEMENT_MONTH_OPTIONS, replacementMonths].filter(Boolean))]
                  .sort((a, b) => a - b)
                  .map(m => {
                    const selected = m === replacementMonths;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => selectReplacementMonths(m)}
                        style={[styles.monthChip, selected && styles.monthChipActive]}>
                        <Text style={[styles.monthChipText, selected && styles.monthChipTextActive]}>
                          {formatMonths(m)}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
              <ScheduleDateField
                label="다음 교체일"
                icon="refresh-outline"
                value={nextReplacementDate}
                onChange={d => {
                  setIsNextReplacementManual(!!d);
                  setNextReplacementDate(d);
                }}
              />
            </>
          )}

          {/* 아직 추가하지 않은 관리 항목 */}
          {(!showReplacement || (isElectronics && !showBatteryCheck)) && (
            <View style={styles.addScheduleRow}>
              {isElectronics && !showBatteryCheck && (
                <Pressable onPress={() => setShowBatteryCheck(true)} style={styles.addScheduleBtn}>
                  <Ionicons name="add" size={14} color={colors.textSecondary} />
                  <Text style={styles.addScheduleText}>배터리 점검</Text>
                </Pressable>
              )}
              {!showReplacement && (
                <Pressable onPress={() => setShowReplacement(true)} style={styles.addScheduleBtn}>
                  <Ionicons name="add" size={14} color={colors.textSecondary} />
                  <Text style={styles.addScheduleText}>소모품 교체</Text>
                </Pressable>
              )}
            </View>
          )}

          <Input
            label="가격"
            value={price}
            onChangeText={onChangePrice}
            placeholder="0"
            keyboardType="number-pad"
            maxLength={15}
            returnKeyType="next"
          />

          <Input
            label="구입처"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="쿠팡, 무신사, 오프라인 매장 등"
            maxLength={30}
            returnKeyType="next"
          />
        </View>

        {/* 섹션 2: 선택 정보 */}
        <Pressable
          onPress={() => setShowExtra(!showExtra)}
          style={styles.extraToggle}>
          <Ionicons
            name={showExtra ? 'chevron-up' : 'add'}
            size={20}
            color={colors.primary}
          />
          <Text style={styles.extraToggleText}>
            {showExtra ? '추가 정보 접기' : '추가 정보'}
          </Text>
        </Pressable>

        {showExtra && (
          <View style={styles.section}>
            <Input
              label="링크"
              value={link}
              onChangeText={setLink}
              placeholder="상품 URL"
              maxLength={200}
              keyboardType="url"
              returnKeyType="next"
            />

            <Input
              label="메모"
              value={memo}
              onChangeText={setMemo}
              placeholder="추가 메모"
              maxLength={200}
              multiline
            />
          </View>
        )}

        <View style={{height: 40}} />
      </KeyboardAwareScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  saveText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: radius.lg,
  },
  imagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.md,
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  quickDates: {
    flexDirection: 'row',
  },
  quickDateBtn: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    marginRight: spacing.xs,
  },
  quickDateText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
  extraToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  extraToggleText: {
    ...typography.captionBold,
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  hint: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  monthChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  monthChipActive: {
    backgroundColor: colors.primary,
  },
  monthChipText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  monthChipTextActive: {
    color: colors.textInverse,
  },
  addScheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  addScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addScheduleText: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 2,
  },
  aiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  aiBannerText: {
    ...typography.caption,
    color: colors.primaryDark,
    flex: 1,
  },
  aiBannerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  aiBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  aiBannerBtnText: {
    ...typography.small,
    color: colors.textInverse,
    fontWeight: '600',
  },
  aiBannerBtnOutline: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  aiBannerBtnOutlineText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default ItemFormScreen;
