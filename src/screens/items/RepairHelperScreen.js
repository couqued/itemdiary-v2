// 고장·문의 도우미 — 챗봇이 아니라 "증상을 한 번 묻고 정리된 답 카드"
// 보증 기간 안인지는 앱이 보증 만료일로 계산해서 사실로 넘긴다 (ai-assist: repair)
// 답을 받은 뒤 추가 질문은 한 번만 할 수 있다.
import React, {useState} from 'react';
import {View, Text, TextInput, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking, ToastAndroid, Image} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {useCategories} from '../../hooks/useCategories';
import {callAi, aiErrorText} from '../../lib/ai';
import {warrantyStatus} from '../../utils/schedule';

const SYMPTOMS = ['전원이 안 켜짐', '소음', '배터리 빨리 닳음', '화면 이상', '충전 안 됨', '버튼·키보드', '연결 안 됨', '물에 젖음', '기타'];
const mapSearchUrl = q => `https://map.naver.com/p/search/${encodeURIComponent(q)}`;

function RepairHelperScreen({navigation, route}) {
  const item = route.params?.item || {};
  const {getCategoryById} = useCategories();
  const warranty = warrantyStatus(item);

  const [chips, setChips] = useState([]);
  const [text, setText] = useState('');
  const [answer, setAnswer] = useState(null);
  const [followup, setFollowup] = useState('');
  const [followupUsed, setFollowupUsed] = useState(false);
  const [showFollowup, setShowFollowup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleChip = c => setChips(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));
  const symptom = [chips.join(', '), text.trim()].filter(Boolean).join(' / ');

  const ask = async (extra = null) => {
    setLoading(true);
    setError(null);
    const {data, error: err} = await callAi('repair', {
      name: item.name,
      category: getCategoryById(item.category_id)?.name || '',
      purchase_date: item.item_date || '',
      warranty_status: warranty.text || '보증 정보 없음',
      symptom,
      ...(extra
        ? {followup: extra, previous: [answer?.note, ...(answer?.checks || []), ...(answer?.causes || [])].filter(Boolean).join(' / ')}
        : {}),
    });
    setLoading(false);
    if (err) {
      setError(aiErrorText(err));
      return;
    }
    setAnswer(data);
    if (extra) {
      setFollowupUsed(true);
      setShowFollowup(false);
    }
  };

  const copy = () => {
    Clipboard.setString(answer?.contact_message || '');
    ToastAndroid.show('문의 문구를 복사했어요', ToastAndroid.SHORT);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => (answer ? setAnswer(null) : navigation.goBack())} style={styles.headerBtn}>
          <Ionicons name={answer ? 'chevron-back' : 'close'} size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{answer ? 'AI 안내' : '고장·문의 도우미'}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.itemRow}>
          {item.image_url ? <Image source={{uri: item.image_url}} style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]} />}
          <View style={{flex: 1}}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={[styles.warranty, {color: warranty.active ? colors.success : colors.textTertiary}]}>{warranty.label}</Text>
          </View>
        </View>

        {!answer && (
          <>
            <Text style={styles.label}>어떤 문제가 있나요?</Text>
            <View style={styles.chips}>
              {SYMPTOMS.map(c => (
                <Pressable key={c} onPress={() => toggleChip(c)} style={[styles.chip, chips.includes(c) && styles.chipOn]}>
                  <Text style={[styles.chipText, chips.includes(c) && styles.chipTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="증상을 자세히 적어주세요. 예: 어제부터 키보드 몇 개가 눌리지 않아요."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={500}
              style={styles.input}
            />
          </>
        )}

        {answer && (
          <>
            <View style={[styles.card, warranty.active ? styles.cardGood : null]}>
              <Text style={styles.cardTitle}>🛡 {warranty.active ? `보증 기간 안이에요 (D-${warranty.days})` : warranty.active === false ? '보증 기간이 끝났어요' : '보증 정보가 없어요'}</Text>
              <Text style={styles.cardText}>
                {warranty.active
                  ? '제조사 무상 수리 대상일 수 있어요. 만료 전에 접수하세요.'
                  : warranty.active === false
                  ? '유상 수리일 수 있어요. 카드사·판매처 연장 보증이 있는지도 확인해보세요.'
                  : '구입일과 보증 기간을 기록해두면 다음부터 함께 안내해드려요.'}
              </Text>
            </View>
            {!!answer.checks?.length && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔧 먼저 해볼 것</Text>
                {answer.checks.map((c, i) => (
                  <Text key={i} style={styles.cardText}>{i + 1}. {c}</Text>
                ))}
              </View>
            )}
            {!!answer.causes?.length && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔎 예상 원인</Text>
                <Text style={styles.cardText}>{answer.causes.join(' · ')}</Text>
              </View>
            )}
            {!!answer.contact_message && (
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>✉ 서비스센터 문의 문구</Text>
                  <Pressable onPress={copy} style={styles.copyBtn}>
                    <Text style={styles.copyText}>복사</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardText} selectable>{answer.contact_message}</Text>
              </View>
            )}
            {!!answer.note && <Text style={styles.note}>💡 {answer.note}</Text>}
            <Text style={styles.aiNote}>AI 안내라 틀릴 수 있어요. 위험하면 사용을 멈추고 서비스센터에 문의하세요.</Text>

            {showFollowup && (
              <TextInput
                value={followup}
                onChangeText={setFollowup}
                placeholder="추가로 궁금한 점을 적어주세요 (한 번만 물어볼 수 있어요)"
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={300}
                style={styles.input}
              />
            )}
          </>
        )}
        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        {!answer ? (
          <Pressable onPress={() => ask()} disabled={!symptom || loading} style={[styles.bigBtn, (!symptom || loading) && {opacity: 0.4}]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigBtnText}>도움 받기</Text>}
          </Pressable>
        ) : showFollowup ? (
          <Pressable onPress={() => ask(followup.trim())} disabled={!followup.trim() || loading} style={[styles.bigBtn, (!followup.trim() || loading) && {opacity: 0.4}]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.bigBtnText}>물어보기</Text>}
          </Pressable>
        ) : (
          <View style={styles.row2}>
            <Pressable
              onPress={() => Linking.openURL(mapSearchUrl(`${item.name} 서비스센터`)).catch(() => {})}
              style={[styles.bigBtn, {flex: 1}]}>
              <Text style={styles.bigBtnText}>서비스센터 찾기</Text>
            </Pressable>
            {!followupUsed && (
              <Pressable onPress={() => setShowFollowup(true)} style={[styles.bigBtn, styles.outlineBtn, {flex: 1}]}>
                <Text style={[styles.bigBtnText, {color: colors.primary}]}>추가로 물어보기</Text>
              </Pressable>
            )}
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
  itemRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs},
  thumb: {width: 44, height: 44, borderRadius: radius.md},
  thumbEmpty: {backgroundColor: colors.surfaceSecondary},
  itemName: {...typography.bodyBold, color: colors.text},
  warranty: {...typography.small, fontWeight: '700'},
  label: {...typography.captionBold, color: colors.text, marginTop: spacing.sm},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.surfaceSecondary},
  chipOn: {backgroundColor: colors.primary},
  chipText: {...typography.caption, color: colors.textSecondary},
  chipTextOn: {color: colors.textInverse, fontWeight: '700'},
  input: {...typography.body, color: colors.text, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs},
  card: {backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, gap: 4},
  cardGood: {backgroundColor: '#F0FBF5', borderWidth: 1, borderColor: '#A7E3C4'},
  cardHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  cardTitle: {...typography.captionBold, color: colors.text},
  cardText: {...typography.caption, color: colors.text, lineHeight: 20},
  copyBtn: {borderWidth: 1, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 2},
  copyText: {...typography.small, fontWeight: '700', color: colors.primary},
  note: {...typography.caption, color: colors.text},
  aiNote: {...typography.small, color: colors.textTertiary},
  error: {...typography.small, color: colors.danger, textAlign: 'center'},
  footer: {padding: spacing.md},
  row2: {flexDirection: 'row', gap: spacing.sm},
  bigBtn: {backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center'},
  outlineBtn: {backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary},
  bigBtnText: {...typography.bodyBold, color: colors.textInverse},
});

export default RepairHelperScreen;
