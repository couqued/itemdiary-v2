// 연말 결산 — 숫자·그래프는 앱이 계산하고, AI 는 맨 위 한 줄 요약만 쓴다 (ai-assist: year_review)
// 한 줄 요약은 연도별로 기기에 저장해 두고 다시 부르지 않는다.
import React, {useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {supabase} from '../../lib/supabase';
import {callAi} from '../../lib/ai';
import {useCategories} from '../../hooks/useCategories';
import {formatPrice} from '../../utils/formatPrice';

// 1월에는 지난해 결산을 기본으로
export const defaultReviewYear = (now = new Date()) => (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

const yearOf = d => (d ? Number(String(d).slice(0, 4)) : null);
const monthOf = d => (d ? Number(String(d).slice(5, 7)) : null);

export const buildYearStats = (items, year, categoryName) => {
  const owned = items.filter(i => !i.is_wishlist);
  const bought = owned.filter(i => yearOf(i.item_date) === year);
  const monthly = Array.from({length: 12}, (_, m) => bought.filter(i => monthOf(i.item_date) === m + 1).length);
  const byCategory = {};
  bought.forEach(i => {
    const name = categoryName(i.category_id) || '기타';
    byCategory[name] = (byCategory[name] || 0) + 1;
  });
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || null;
  const oldest = owned
    .filter(i => i.item_date && yearOf(i.item_date) < year)
    .sort((a, b) => String(a.item_date).localeCompare(String(b.item_date)))[0];
  const biggest = [...bought].sort((a, b) => (b.price || 0) - (a.price || 0))[0];
  return {
    year,
    count: bought.length,
    total: bought.reduce((s, i) => s + (i.price || 0), 0),
    monthly,
    busiestMonth: monthly.indexOf(Math.max(...monthly)) + 1,
    topCategory: topCategory ? {name: topCategory[0], count: topCategory[1]} : null,
    oldest: oldest ? {name: oldest.name, years: year - yearOf(oldest.item_date)} : null,
    biggest: biggest?.price ? {name: biggest.name, price: biggest.price} : null,
    warrantyTracked: owned.filter(i => yearOf(i.warranty_date) === year).length,
    replacementTracked: owned.filter(i => i.replacement_months).length,
    wishAdded: items.filter(i => i.is_wishlist && yearOf(i.created_at) === year).length,
  };
};

function YearReviewScreen({navigation, route}) {
  const {getCategoryById} = useCategories();
  const [year, setYear] = useState(route.params?.year || defaultReviewYear());
  const [items, setItems] = useState(null);
  const [headline, setHeadline] = useState(null);
  const [headlineLoading, setHeadlineLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) return;
      const {data} = await supabase
        .from('items')
        .select('seq, name, price, item_date, created_at, category_id, is_wishlist, warranty_date, replacement_months')
        .eq('user_id', user.email);
      setItems(data || []);
    })();
  }, []);

  const stats = useMemo(
    () => (items ? buildYearStats(items, year, id => getCategoryById(id)?.name) : null),
    [items, year, getCategoryById],
  );

  // AI 한 줄 요약 (연도별 캐시)
  useEffect(() => {
    if (!stats || stats.count === 0) {
      setHeadline(null);
      return;
    }
    let cancelled = false;
    const key = `year_review_headline_${year}`;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(key);
        const parsed = cached ? JSON.parse(cached) : null;
        // 물건 수가 바뀌지 않았으면 저장된 요약을 쓴다
        if (parsed?.count === stats.count) {
          if (!cancelled) setHeadline(parsed.headline);
          return;
        }
      } catch (e) {}
      setHeadlineLoading(true);
      const {data} = await callAi('year_review', {
        year,
        stats: {
          새로_장만: stats.count,
          총지출: stats.total,
          많이_산_카테고리: stats.topCategory?.name,
          가장_많이_산_달: `${stats.busiestMonth}월`,
          가장_비싼_물건: stats.biggest?.name,
          오래_함께한_물건: stats.oldest ? `${stats.oldest.name} ${stats.oldest.years}년` : null,
        },
      });
      if (cancelled) return;
      setHeadlineLoading(false);
      if (data?.headline) {
        setHeadline(data.headline);
        try {
          await AsyncStorage.setItem(key, JSON.stringify({headline: data.headline, count: stats.count}));
        } catch (e) {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stats, year]);

  const share = () => {
    if (!stats) return;
    const lines = [
      `📦 ${year} 아이템북 결산`,
      headline ? `"${headline}"` : null,
      `새로 장만 ${stats.count}개 · 총 ${formatPrice(stats.total)}원`,
      stats.topCategory ? `가장 많이 산 카테고리: ${stats.topCategory.name} (${stats.topCategory.count})` : null,
      stats.oldest ? `가장 오래 함께한 물건: ${stats.oldest.name} (${stats.oldest.years}년)` : null,
    ].filter(Boolean);
    Share.share({message: lines.join('\n')});
  };

  const maxMonth = stats ? Math.max(1, ...stats.monthly) : 1;
  const thisYear = new Date().getFullYear();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.yearNav}>
          <Pressable onPress={() => setYear(y => y - 1)} hitSlop={10}>
            <Ionicons name="chevron-back-circle-outline" size={22} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{year} 결산</Text>
          <Pressable onPress={() => setYear(y => Math.min(thisYear, y + 1))} hitSlop={10} disabled={year >= thisYear}>
            <Ionicons name="chevron-forward-circle-outline" size={22} color={year >= thisYear ? colors.border : colors.textSecondary} />
          </Pressable>
        </View>
        <Pressable onPress={share} style={styles.headerBtn}>
          <Text style={styles.shareText}>공유</Text>
        </Pressable>
      </View>

      {!stats ? (
        <ActivityIndicator style={{marginTop: 60}} color={colors.primary} />
      ) : stats.count === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{year}년에 기록한 물건이 없어요.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.hero}>
            <Text style={styles.heroSmall}>{year} 아이템북 결산</Text>
            {headlineLoading ? (
              <ActivityIndicator color="#fff" style={{alignSelf: 'flex-start', marginTop: 6}} />
            ) : (
              <Text style={styles.heroTitle}>✨ {headline ? `"${headline}"` : `${stats.count}개의 물건과 함께한 한 해`}</Text>
            )}
          </View>

          <View style={styles.stats}>
            <Stat label="새로 장만" value={`${stats.count}개`} />
            <Stat label="총 지출" value={`${formatPrice(stats.total)}원`} />
            <Stat label="많이 산 카테고리" value={stats.topCategory ? `${stats.topCategory.name} ${stats.topCategory.count}` : '-'} />
            <Stat label="가장 오래 함께한" value={stats.oldest ? `${stats.oldest.name} ${stats.oldest.years}년` : '-'} />
          </View>

          <Text style={styles.label}>월별 장만</Text>
          <View style={styles.bars}>
            {stats.monthly.map((n, i) => (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, {height: `${(n / maxMonth) * 100}%`}, n === maxMonth && n > 0 && styles.barHi]} />
                <Text style={styles.barLabel}>{i + 1}</Text>
              </View>
            ))}
          </View>

          {stats.biggest && (
            <View style={styles.info}>
              <Text style={styles.infoText}>💎 가장 큰 결심: {stats.biggest.name} ({formatPrice(stats.biggest.price)}원)</Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.infoText}>
              🛡 보증 만료를 챙긴 물건 {stats.warrantyTracked}개 · 🔧 소모품 관리 중 {stats.replacementTracked}개
              {stats.wishAdded ? ` · 💭 새로 찜 ${stats.wishAdded}개` : ''}
            </Text>
          </View>
          <Text style={styles.aiNote}>맨 위 한 줄은 AI가 쓴 요약이에요.</Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({label, value}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  header: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, height: 56, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight},
  headerBtn: {padding: spacing.sm, minWidth: 48},
  yearNav: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  headerTitle: {...typography.h3, color: colors.text},
  shareText: {...typography.bodyBold, color: colors.primary, textAlign: 'right'},
  body: {padding: spacing.md, gap: spacing.sm},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyText: {...typography.body, color: colors.textSecondary},
  hero: {backgroundColor: '#3B6EF5', borderRadius: radius.lg, padding: spacing.lg},
  heroSmall: {...typography.small, color: 'rgba(255,255,255,0.85)'},
  heroTitle: {fontSize: 19, fontWeight: '900', color: '#fff', marginTop: 6, lineHeight: 26},
  stats: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  stat: {width: '48.5%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight},
  statLabel: {...typography.small, color: colors.textSecondary},
  statValue: {...typography.h3, color: colors.text, marginTop: 2},
  label: {...typography.captionBold, color: colors.text, marginTop: spacing.sm},
  bars: {flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 1, borderColor: colors.borderLight},
  barCol: {flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center'},
  bar: {width: '80%', backgroundColor: '#93B4FB', borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 2},
  barHi: {backgroundColor: colors.primary},
  barLabel: {fontSize: 10, color: colors.textTertiary, marginTop: 2},
  info: {backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.borderLight},
  infoText: {...typography.caption, color: colors.text, lineHeight: 20},
  aiNote: {...typography.small, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.sm},
});

export default YearReviewScreen;
