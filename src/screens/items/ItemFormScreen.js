import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
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
import {useImagePicker} from '../../hooks/useImagePicker';
import {useCategories} from '../../hooks/useCategories';
import {formatPrice, parsePrice} from '../../utils/formatPrice';
import {formatDateKo, formatDateISO} from '../../utils/formatDate';
import {supabase} from '../../lib/supabase';

function ItemFormScreen({navigation, route}) {
  const existingItem = route.params?.item;
  const prefilledData = route.params?.prefilledData;
  const initialIsWishlist = route.params?.is_wishlist || false;
  const isEdit = !!existingItem;

  const {pickImage, uploadImage, previewUri, setExistingImageUrl} =
    useImagePicker();
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

  // Alerts
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
    confirmText: '확인',
  });

  useEffect(() => {
    if (existingItem) {
      // 기존 아이템 수정 모드
      setTitle(existingItem.name || '');
      setDate(new Date(existingItem.item_date || Date.now()));
      setPrice(formatPrice(existingItem.price));
      setStoreName(existingItem.store_name || '');
      setLink(existingItem.link || '');
      setMemo(existingItem.memo || '');
      setCategoryId(existingItem.category_id || null);
      setExistingImageUrl(existingItem.image_url || '');
      if (existingItem.store_name || existingItem.link || existingItem.memo || existingItem.category_id) {
        setShowExtra(true);
      }
    } else if (prefilledData) {
      // 바코드 스캔 등으로 넘어온 자동 입력 데이터
      setTitle(prefilledData.name || '');
      setPrice(formatPrice(prefilledData.price) || '');
      setStoreName(prefilledData.store_name || '');
      setLink(prefilledData.link || '');
      setCategoryId(prefilledData.category_id || null);
      if (prefilledData.image_url) {
        setExistingImageUrl(prefilledData.image_url);
      }
      if (prefilledData.link || prefilledData.store_name || prefilledData.category_id) {
        setShowExtra(true);
      }
    }
  }, [existingItem, prefilledData]);

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
      };

      if (isEdit) {
        const {error} = await supabase
          .from('items')
          .update({...itemData, updated_at: new Date().toISOString()})
          .eq('seq', existingItem.seq);

        if (error) throw error;
      } else {
        const {error} = await supabase.from('items').insert({
          ...itemData,
          user_id: user.email,
        });

        if (error) throw error;
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
            placeholder="아이템 이름"
            maxLength={20}
            returnKeyType="next"
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
            <Text style={styles.fieldLabel}>카테고리</Text>
            <CategoryChips
              categories={categories}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />

            <Input
              label="링크"
              value={link}
              onChangeText={setLink}
              placeholder="상품 URL"
              maxLength={200}
              keyboardType="url"
              returnKeyType="next"
              style={{marginTop: spacing.sm}}
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
});

export default ItemFormScreen;
