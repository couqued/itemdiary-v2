// 찜 상세 화면: 구입하러 가기 + 찜 결정 도우미
// - 구입하러 가기: 저장한 링크가 있으면 그 페이지, 없으면 이름으로 네이버 쇼핑 검색 (AI 사용 안 함)
// - 결정 도와줘: 보유한 비슷한 물건·이번 달 지출은 앱이 계산해서 넘기고, AI 는 정리·제안 문장만 (ai-assist: wish_advice)
import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, ToastAndroid} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import {supabase} from '../lib/supabase';
import {callAi, aiErrorText} from '../lib/ai';
import {fetchSimilarItems} from '../lib/similarItems';
import {remindWishLater} from '../lib/reminders';

const hostOf = url => {
  try {
    const host = new URL(url).hostname.replace(/^www\.|^m\./, '');
    const known = {'coupang.com': '쿠팡', 'smartstore.naver.com': '네이버 스마트스토어', 'shopping.naver.com': '네이버쇼핑', '11st.co.kr': '11번가', 'gmarket.co.kr': 'G마켓', 'musinsa.com': '무신사', 'auction.co.kr': '옥션'};
    const match = Object.keys(known).find(k => host.endsWith(k));
    return match ? known[match] : host;
  } catch (e) {
    return '저장한 링크';
  }
};

export const shoppingSearchUrl = q => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;

const monthSpent = async () => {
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) return null;
  const now = new Date();
  const first = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const {data} = await supabase
    .from('items')
    .select('price')
    .eq('user_id', user.email)
    .eq('is_wishlist', false)
    .gte('item_date', first);
  return (data || []).reduce((sum, i) => sum + (i.price || 0), 0);
};

export function WishDecisionCard({item, onPurchase, onDelete}) {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState(null);
  const [error, setError] = useState(null);

  const days = item.created_at ? Math.max(0, Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000)) : null;

  const openShop = () => {
    const url = item.link || shoppingSearchUrl(item.name);
    Linking.openURL(url).catch(() => ToastAndroid.show('링크를 열 수 없어요', ToastAndroid.SHORT));
  };

  const askAdvice = async () => {
    setLoading(true);
    setError(null);
    const [similar, spent] = await Promise.all([
      fetchSimilarItems({name: item.name, categoryId: item.category_id, excludeSeq: item.seq, includeWishlist: false}),
      monthSpent(),
    ]);
    const {data, error: err} = await callAi('wish_advice', {
      name: item.name,
      price: item.price || null,
      days,
      reason: item.wish_reason || '',
      similar: similar.map(s => s.name),
      month_spent: spent,
    });
    setLoading(false);
    if (err) setError(aiErrorText(err));
    else setAdvice({...data, similar});
  };

  const later = async () => {
    const when = await remindWishLater(item, 30);
    ToastAndroid.show(`${when.getMonth() + 1}월 ${when.getDate()}일에 다시 알려드릴게요`, ToastAndroid.SHORT);
  };

  return (
    <View style={styles.wrap}>
      <Pressable onPress={openShop} style={({pressed}) => [styles.shopBtn, pressed && {opacity: 0.7}]}>
        <Ionicons name={item.link ? 'cart-outline' : 'search-outline'} size={18} color={colors.primary} />
        <Text style={styles.shopText} numberOfLines={1}>
          {item.link ? `구입하러 가기 · ${hostOf(item.link)}` : `쇼핑에서 찾아보기 · "${item.name}"`}
        </Text>
      </Pressable>

      {!advice && (
        <Pressable onPress={askAdvice} disabled={loading} style={({pressed}) => [styles.askBtn, pressed && {opacity: 0.8}]}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.askText}>✨ 결정 도와줘</Text>}
        </Pressable>
      )}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {advice && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ 결정 도우미{days != null ? ` · 찜한 지 ${days}일` : ''}</Text>
          {!!advice.pros?.length && (
            <Text style={styles.line}>
              👍 <Text style={styles.bold}>살 이유</Text> · {advice.pros.join(' · ')}
            </Text>
          )}
          {!!advice.considerations?.length && (
            <Text style={styles.line}>
              🤔 <Text style={styles.bold}>생각해볼 것</Text> · {advice.considerations.join(' · ')}
            </Text>
          )}
          {!!advice.suggestion && (
            <Text style={styles.line}>
              💡 <Text style={styles.bold}>제안</Text> · {advice.suggestion}
            </Text>
          )}
          <Text style={styles.aiNote}>AI 제안이에요. 결정은 직접 해주세요.</Text>
          <View style={styles.actions}>
            <Pressable onPress={onPurchase} style={[styles.act, styles.actPrimary]}>
              <Text style={styles.actPrimaryText}>구입 완료</Text>
            </Pressable>
            <Pressable onPress={later} style={[styles.act, styles.actOutline]}>
              <Text style={styles.actOutlineText}>한 달 뒤 다시</Text>
            </Pressable>
            <Pressable onPress={onDelete} style={[styles.act, styles.actGray]}>
              <Text style={styles.actGrayText}>찜 정리</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.sm, marginTop: spacing.md},
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  shopText: {...typography.captionBold, color: colors.primary, flexShrink: 1},
  askBtn: {backgroundColor: colors.primaryLight, borderRadius: radius.lg, paddingVertical: spacing.sm + 2, alignItems: 'center'},
  askText: {...typography.captionBold, color: colors.primaryDark},
  error: {...typography.small, color: colors.danger, textAlign: 'center'},
  card: {backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, gap: 6},
  cardTitle: {...typography.captionBold, color: colors.text, marginBottom: 2},
  line: {...typography.caption, color: colors.text, lineHeight: 20},
  bold: {fontWeight: '700'},
  aiNote: {...typography.small, color: colors.textTertiary},
  actions: {flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs},
  act: {flex: 1, borderRadius: radius.full, paddingVertical: spacing.sm, alignItems: 'center'},
  actPrimary: {backgroundColor: colors.primary},
  actPrimaryText: {...typography.small, fontWeight: '700', color: colors.textInverse},
  actOutline: {borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface},
  actOutlineText: {...typography.small, fontWeight: '700', color: colors.primary},
  actGray: {backgroundColor: colors.surface},
  actGrayText: {...typography.small, fontWeight: '700', color: colors.textSecondary},
});
