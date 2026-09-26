// 영수증·결제내역 캡처로 여러 물건 한 번에 등록
//
// ① 사진 고르기(최대 10장) → ② 폰 안에서 글자 읽기(ML Kit) + 개인정보 가리기 → 사용자가 보낼 내용 확인
// → ③ 가린 글자만 AI(ai-assist: receipt)로 보내 물건 목록 받기 → 체크한 것만 저장
// 사진은 서버에 올리거나 AI 로 보내지 않는다.
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {launchImageLibrary} from 'react-native-image-picker';
import TextRecognition, {TextRecognitionScript} from '@react-native-ml-kit/text-recognition';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {CustomAlert} from '../../components/ui';
import {SimilarItemsNotice} from '../../components/SimilarItemsNotice';
import {useCategories} from '../../hooks/useCategories';
import {supabase} from '../../lib/supabase';
import {callAi, aiErrorText, todayISO} from '../../lib/ai';
import {maskLines} from '../../lib/privacy/maskText';
import {fetchSimilarItems} from '../../lib/similarItems';
import {onItemSaved} from '../../lib/reminders';
import {resolveCategoryId} from '../../constants/categories';
import {addMonths, nextReplacementFrom, formatMonths} from '../../utils/schedule';
import {formatPrice, parsePrice} from '../../utils/formatPrice';
import {formatDateISO} from '../../utils/formatDate';

const MAX_PHOTOS = 10;
const USER_MASK = '[가림]';

const toDay = s => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function ReceiptImportScreen({navigation}) {
  const {categories} = useCategories();
  const [step, setStep] = useState('pick'); // pick | review | result
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(null); // 진행 중 문구
  const [lines, setLines] = useState([]); // [{original, masked, hits, userMasked}]
  const [found, setFound] = useState([]); // AI 가 찾은 물건 + checked
  const [similar, setSimilar] = useState([]);
  const [alert, setAlert] = useState(null);

  const showError = message => setAlert({title: '알림', message});

  // ① 사진 고르기
  const addPhotos = () => {
    launchImageLibrary(
      {mediaType: 'photo', selectionLimit: MAX_PHOTOS - photos.length, maxWidth: 2000, maxHeight: 2000, quality: 0.9},
      res => {
        if (res.didCancel || res.errorCode || !res.assets) return;
        setPhotos(prev => [...prev, ...res.assets].slice(0, MAX_PHOTOS));
      },
    );
  };

  // ② 폰 안에서 글자 읽기 + 가리기
  const analyze = async () => {
    setBusy('사진에서 글자를 읽는 중...');
    try {
      const texts = [];
      for (let i = 0; i < photos.length; i++) {
        setBusy(`사진에서 글자를 읽는 중... (${i + 1}/${photos.length})`);
        const result = await TextRecognition.recognize(photos[i].uri, TextRecognitionScript.KOREAN);
        texts.push(`--- 사진 ${i + 1} ---\n${result.text}`);
      }
      const masked = maskLines(texts.join('\n')).filter(l => l.original.trim());
      if (!masked.some(l => /\d/.test(l.masked))) {
        showError('사진에서 결제 내용을 찾지 못했어요. 글자가 잘 보이는 사진으로 다시 시도해주세요.');
        return;
      }
      setLines(masked.map(l => ({...l, userMasked: false})));
      setStep('review');
    } catch (e) {
      showError('사진에서 글자를 읽지 못했어요.');
    } finally {
      setBusy(null);
    }
  };

  const toggleLine = index =>
    setLines(prev => prev.map((l, i) => (i === index ? {...l, userMasked: !l.userMasked} : l)));

  // ③ 가린 글자만 AI 로
  const sendToAi = async () => {
    setBusy('AI가 물건을 찾는 중...');
    const text = lines.map(l => (l.userMasked ? USER_MASK : l.masked)).join('\n');
    const {data, error} = await callAi('receipt', {text, today: todayISO()});
    setBusy(null);
    if (error) {
      showError(aiErrorText(error));
      return;
    }
    const items = (data?.items || []).filter(i => i?.name);
    if (!items.length) {
      showError('구입한 물건을 찾지 못했어요.');
      return;
    }
    setFound(items.map((i, idx) => ({...i, key: idx, checked: i.is_item !== false, priceText: i.price ? formatPrice(i.price) : ''})));
    setStep('result');
  };

  // 결과 화면: 체크한 물건들과 비슷한 내 물건 (기기 안에서 계산)
  useEffect(() => {
    if (step !== 'result') return;
    let cancelled = false;
    (async () => {
      const all = [];
      for (const i of found.filter(f => f.checked)) {
        const list = await fetchSimilarItems({name: i.name, categoryId: resolveCategoryId(categories, i.category), limit: 2});
        list.forEach(s => !all.some(a => a.seq === s.seq) && all.push(s));
      }
      if (!cancelled) setSimilar(all.slice(0, 5));
    })();
    return () => {
      cancelled = true;
    };
  }, [step, found, categories]);

  const updateFound = (key, patch) => setFound(prev => prev.map(f => (f.key === key ? {...f, ...patch} : f)));

  const save = async () => {
    const selected = found.filter(f => f.checked && f.name.trim());
    if (!selected.length) return;
    setBusy('저장하는 중...');
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      const today = new Date();
      const rows = selected.map(f => {
        const bought = toDay(f.date) || today;
        const row = {
          name: f.name.trim().slice(0, 20),
          price: parsePrice(f.priceText),
          item_date: formatDateISO(bought),
          store_name: f.store?.trim() || null,
          category_id: resolveCategoryId(categories, f.category),
          is_wishlist: false,
          user_id: user.email,
          warranty_date: f.warranty_months > 0 ? formatDateISO(addMonths(bought, f.warranty_months)) : null,
        };
        if (f.replacement_months > 0) {
          row.replacement_months = f.replacement_months;
          row.next_replacement_date = formatDateISO(nextReplacementFrom(bought, f.replacement_months));
          if (f.has_filter) row.replacement_item = '필터';
        }
        return row;
      });
      const {error} = await supabase.from('items').insert(rows);
      if (error) throw error;
      await onItemSaved();
      ToastAndroid.show(`${rows.length}개를 등록했어요`, ToastAndroid.SHORT);
      navigation.goBack();
    } catch (e) {
      showError('저장에 실패했어요.');
    } finally {
      setBusy(null);
    }
  };

  const checkedCount = found.filter(f => f.checked).length;
  const autoMasked = lines.filter(l => l.hits.length).length;

  const header = {
    pick: {title: '영수증으로 등록', left: 'close', onLeft: () => navigation.goBack()},
    review: {title: 'AI로 보낼 내용', left: 'chevron-back', onLeft: () => setStep('pick')},
    result: {title: `찾은 물건 ${found.length}개`, left: 'chevron-back', onLeft: () => setStep('review')},
  }[step];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={header.onLeft} style={styles.headerBtn}>
          <Ionicons name={header.left} size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{header.title}</Text>
        {step === 'result' ? (
          <Pressable onPress={save} disabled={!checkedCount} style={styles.headerBtn}>
            <Text style={[styles.saveText, !checkedCount && {color: colors.textTertiary}]}>저장({checkedCount})</Text>
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
      </View>

      {step === 'pick' && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.label}>사진 ({photos.length}장)</Text>
          <View style={styles.thumbs}>
            {photos.length < MAX_PHOTOS && (
              <Pressable onPress={addPhotos} style={[styles.thumb, styles.addThumb]}>
                <Ionicons name="add" size={28} color={colors.textTertiary} />
              </Pressable>
            )}
            {photos.map((p, i) => (
              <View key={p.uri}>
                <Image source={{uri: p.uri}} style={styles.thumb} />
                <Pressable onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))} style={styles.removeBtn} hitSlop={6}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </View>
          <Text style={styles.hint}>최대 {MAX_PHOTOS}장 · 네이버페이·쿠팡 결제내역 캡처와 종이 영수증 모두 가능</Text>
          <View style={styles.privacy}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.success} />
            <Text style={styles.privacyText}>
              사진은 폰 안에서만 글자를 읽어요. 카드번호·주소·이름 같은 개인정보는 가린 뒤, <Text style={{fontWeight: '700'}}>글자만</Text> AI로 보내요. 사진은 저장하거나 보내지 않아요.
            </Text>
          </View>
        </ScrollView>
      )}

      {step === 'review' && (
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.hint}>
            ■ 로 표시된 부분은 AI에 보내지 않아요 (자동으로 {autoMasked}줄 가림). 더 가리고 싶은 줄은 눌러주세요.
          </Text>
          <View style={styles.textBox}>
            {lines.map((l, i) => (
              <Pressable key={i} onPress={() => toggleLine(i)}>
                <Text style={[styles.line, l.userMasked && styles.lineMasked]}>
                  {l.userMasked ? '■■■ (직접 가림)' : l.masked.split(/(\[[^\]]+\])/).map((part, j) =>
                    /^\[[^\]]+\]$/.test(part) ? (
                      <Text key={j} style={styles.maskChip}>■{part.slice(1, -1)}</Text>
                    ) : (
                      part
                    ),
                  )}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      {step === 'result' && (
        <ScrollView contentContainerStyle={[styles.body, {backgroundColor: colors.background}]}>
          {found.map(f => (
            <Pressable key={f.key} onPress={() => updateFound(f.key, {checked: !f.checked})} style={[styles.row, !f.checked && {opacity: 0.55}]}>
              <Ionicons name={f.checked ? 'checkbox' : 'square-outline'} size={22} color={f.checked ? colors.primary : colors.textTertiary} />
              <View style={{flex: 1, gap: 4}}>
                <TextInput
                  value={f.name}
                  onChangeText={t => updateFound(f.key, {name: t})}
                  style={styles.nameInput}
                  maxLength={20}
                />
                <View style={styles.metaRow}>
                  <TextInput
                    value={f.priceText}
                    onChangeText={t => updateFound(f.key, {priceText: formatPrice(t)})}
                    placeholder="가격"
                    keyboardType="number-pad"
                    style={styles.priceInput}
                  />
                  <Text style={styles.meta}>원 · {f.date || '날짜 없음(오늘로 저장)'}{f.store ? ` · ${f.store}` : ''}</Text>
                </View>
                <View style={styles.tags}>
                  {!!f.category && <Text style={styles.tag}>{f.category}</Text>}
                  {f.warranty_months > 0 && <Text style={styles.tag}>보증 {formatMonths(f.warranty_months)}</Text>}
                  {f.replacement_months > 0 && <Text style={styles.tag}>교체 {formatMonths(f.replacement_months)}</Text>}
                  {f.quantity > 1 && <Text style={styles.tag}>수량 {f.quantity}</Text>}
                  {f.is_item === false && <Text style={[styles.tag, styles.tagWarn]}>물건이 아닌 것 같아요</Text>}
                </View>
              </View>
            </Pressable>
          ))}
          <SimilarItemsNotice items={similar} navigation={navigation} />
          <Text style={styles.hint}>AI가 찾은 내용이에요. 이름과 가격은 눌러서 고칠 수 있어요.</Text>
        </ScrollView>
      )}

      {step !== 'result' && (
        <View style={styles.footer}>
          <Pressable
            onPress={step === 'pick' ? analyze : sendToAi}
            disabled={step === 'pick' && !photos.length}
            style={[styles.bigBtn, step === 'pick' && !photos.length && {opacity: 0.4}]}>
            <Text style={styles.bigBtnText}>{step === 'pick' ? '분석하기' : 'AI로 분석'}</Text>
          </Pressable>
        </View>
      )}

      {!!busy && (
        <View style={styles.busy}>
          <View style={styles.busyBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.busyText}>{busy}</Text>
          </View>
        </View>
      )}

      <CustomAlert
        visible={!!alert}
        title={alert?.title}
        message={alert?.message}
        onConfirm={() => setAlert(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {padding: spacing.sm, minWidth: 60},
  headerTitle: {...typography.h3, color: colors.text},
  saveText: {...typography.bodyBold, color: colors.primary, textAlign: 'right'},
  body: {padding: spacing.md, gap: spacing.sm},
  label: {...typography.captionBold, color: colors.text},
  thumbs: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  thumb: {width: 72, height: 96, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary},
  addThumb: {borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface},
  removeBtn: {position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center'},
  hint: {...typography.small, color: colors.textSecondary, lineHeight: 18},
  privacy: {flexDirection: 'row', gap: spacing.sm, backgroundColor: '#E8F7EE', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm},
  privacyText: {...typography.caption, color: '#1F6B45', flex: 1, lineHeight: 20},
  textBox: {borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.sm, backgroundColor: '#F8FAFC'},
  line: {fontFamily: 'monospace', fontSize: 12, lineHeight: 20, color: colors.text},
  lineMasked: {color: colors.textTertiary},
  maskChip: {backgroundColor: '#111827', color: '#fff', fontSize: 11},
  row: {flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderLight},
  nameInput: {...typography.bodyBold, color: colors.text, padding: 0},
  metaRow: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'},
  priceInput: {...typography.caption, color: colors.text, padding: 0, minWidth: 60, borderBottomWidth: 1, borderBottomColor: colors.border},
  meta: {...typography.small, color: colors.textSecondary},
  tags: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  tag: {...typography.small, color: colors.textSecondary, backgroundColor: colors.surfaceSecondary, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 1, overflow: 'hidden'},
  tagWarn: {color: '#8A5A00', backgroundColor: '#FFF4DB'},
  footer: {padding: spacing.md},
  bigBtn: {backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center'},
  bigBtnText: {...typography.bodyBold, color: colors.textInverse},
  busy: {...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center'},
  busyBox: {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, minWidth: 220},
  busyText: {...typography.caption, color: colors.text},
});

export default ReceiptImportScreen;
