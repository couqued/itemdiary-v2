// 중고 판매 글 작성 (ai-assist: sell_post)
// 구입 시기·보증 상태는 앱이 넘기고, 가격은 제안하지 않는다 (시세 데이터가 없음)
import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share, ToastAndroid} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {useCategories} from '../../hooks/useCategories';
import {callAi, aiErrorText} from '../../lib/ai';
import {warrantyStatus} from '../../utils/schedule';

const TONES = [
  {key: 'plain', label: '담백하게'},
  {key: 'friendly', label: '친근하게'},
];

function SellPostScreen({navigation, route}) {
  const item = route.params?.item || {};
  const {getCategoryById} = useCategories();
  const [tone, setTone] = useState('plain');
  const [condition, setCondition] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    const {data, error: err} = await callAi('sell_post', {
      name: item.name,
      category: getCategoryById(item.category_id)?.name || '',
      purchase_date: item.item_date || '',
      warranty_status: warrantyStatus(item).text || '보증 정보 없음',
      condition: condition.trim(),
      tone,
    });
    setLoading(false);
    if (err) {
      setError(aiErrorText(err));
      return;
    }
    setTitle(data?.title || '');
    setBody(data?.body || '');
  };

  const fullText = `${title}\n\n${body}`.trim();
  const copy = () => {
    Clipboard.setString(fullText);
    ToastAndroid.show('판매 글을 복사했어요', ToastAndroid.SHORT);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>판매 글</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.toneRow}>
          <Text style={styles.label}>말투</Text>
          {TONES.map(t => (
            <Pressable key={t.key} onPress={() => setTone(t.key)} style={[styles.chip, tone === t.key && styles.chipOn]}>
              <Text style={[styles.chipText, tone === t.key && styles.chipTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>상태·구성품 (선택)</Text>
        <TextInput
          value={condition}
          onChangeText={setCondition}
          placeholder="예: 생활기스 조금, 풀박스, 충전기 포함"
          placeholderTextColor={colors.textTertiary}
          maxLength={300}
          style={styles.input}
        />

        {!!(title || body) && (
          <View style={styles.result}>
            <TextInput value={title} onChangeText={setTitle} style={styles.resultTitle} multiline />
            <TextInput value={body} onChangeText={setBody} style={styles.resultBody} multiline />
            <Text style={styles.aiNote}>AI가 쓴 초안이에요. 눌러서 고칠 수 있어요. 가격은 직접 정해주세요.</Text>
          </View>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        {!(title || body) ? (
          <Pressable onPress={generate} disabled={loading} style={[styles.bigBtn, loading && {opacity: 0.5}]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigBtnText}>✨ 판매 글 만들기</Text>}
          </Pressable>
        ) : (
          <View style={styles.row3}>
            <Pressable onPress={generate} disabled={loading} style={[styles.btn, styles.grayBtn]}>
              {loading ? <ActivityIndicator color={colors.textSecondary} /> : <Text style={styles.grayText}>다시 쓰기</Text>}
            </Pressable>
            <Pressable onPress={() => Share.share({message: fullText})} style={[styles.btn, styles.outlineBtn]}>
              <Text style={styles.outlineText}>공유</Text>
            </Pressable>
            <Pressable onPress={copy} style={[styles.btn, styles.primaryBtn]}>
              <Text style={styles.primaryText}>복사</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.surface},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, height: 56, borderBottomWidth: 1, borderBottomColor: colors.borderLight},
  headerBtn: {padding: spacing.sm, minWidth: 44},
  headerTitle: {...typography.h3, color: colors.text},
  body: {padding: spacing.md, gap: spacing.sm},
  itemName: {...typography.bodyBold, color: colors.text},
  toneRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  label: {...typography.captionBold, color: colors.text, marginTop: spacing.xs},
  chip: {paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceSecondary},
  chipOn: {backgroundColor: colors.primary},
  chipText: {...typography.caption, color: colors.textSecondary},
  chipTextOn: {color: colors.textInverse, fontWeight: '700'},
  input: {...typography.body, color: colors.text, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm},
  result: {backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm, marginTop: spacing.sm},
  resultTitle: {...typography.bodyBold, color: colors.text, padding: 0},
  resultBody: {...typography.body, color: colors.text, padding: 0, lineHeight: 22},
  aiNote: {...typography.small, color: colors.textTertiary},
  error: {...typography.small, color: colors.danger, textAlign: 'center'},
  footer: {padding: spacing.md},
  bigBtn: {backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center'},
  bigBtnText: {...typography.bodyBold, color: colors.textInverse},
  row3: {flexDirection: 'row', gap: spacing.sm},
  btn: {flex: 1, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center'},
  grayBtn: {backgroundColor: colors.surfaceSecondary},
  grayText: {...typography.bodyBold, color: colors.textSecondary},
  outlineBtn: {borderWidth: 1, borderColor: colors.primary},
  outlineText: {...typography.bodyBold, color: colors.primary},
  primaryBtn: {backgroundColor: colors.primary},
  primaryText: {...typography.bodyBold, color: colors.textInverse},
});

export default SellPostScreen;
