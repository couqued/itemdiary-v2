// ⚠️ 테스트용 — AI(Gemini) 사용 현황. src/dev/flags.js 의 SHOW_NOTIFICATION_TEST 가 true 일 때만 보인다.
//
// - 모델별 오늘 호출 수(모든 사용자 합계)와 한도(설정값)를 비교해서 보여준다
//   Gemini 무료 한도는 프로젝트 전체 기준이고, 하루 한도는 미국 태평양 시간 자정(한국 오후 4~5시)에 초기화된다
// - 한도 숫자는 Google 이 API 로 알려주지 않아 ai_model_limits 표의 설정값을 쓴다
//   (AI Studio → Rate limit 에서 확인한 값으로 표를 고치면 여기 반영)
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, StyleSheet, Pressable, ActivityIndicator} from 'react-native';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import {supabase} from '../lib/supabase';

const ASSIST_DAILY_LIMIT = 50; // ai-assist 사용자당 하루 한도 (Edge Function 의 AI_DAILY_LIMIT 과 같게)

const pad = n => String(n).padStart(2, '0');
const resetText = dayStart => {
  if (!dayStart) return '';
  const next = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000);
  return `${next.getMonth() + 1}/${next.getDate()} ${pad(next.getHours())}:${pad(next.getMinutes())}`;
};

function UsageBar({used, limit}) {
  const ratio = limit ? Math.min(1, used / limit) : 0;
  const color = ratio >= 0.9 ? colors.danger : ratio >= 0.7 ? colors.warning : colors.primary;
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, {width: `${ratio * 100}%`, backgroundColor: color}]} />
    </View>
  );
}

export function AiUsagePanel() {
  const [rows, setRows] = useState(null);
  const [assistUsed, setAssistUsed] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const {data, error: err} = await supabase.rpc('get_ai_usage_today');
    if (err) {
      setError('SQL(20260927_ai_usage_log.sql)을 먼저 실행해주세요.');
      setRows(null);
    } else {
      setRows(data || []);
    }
    // 내 AI 도우미(ai-assist) 오늘 사용량 — ai_usage 는 서버 날짜 기준
    const {data: usage} = await supabase.from('ai_usage').select('day, count').order('day', {ascending: false}).limit(1);
    const today = new Date().toISOString().slice(0, 10);
    setAssistUsed(usage?.[0]?.day === today ? usage[0].count : 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dayStart = rows?.[0]?.day_start;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.title}>🤖 AI 사용 현황 (오늘)</Text>
        <Pressable onPress={load} style={styles.refresh} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.refreshText}>새로고침</Text>}
        </Pressable>
      </View>
      {!!dayStart && <Text style={styles.desc}>하루 한도 초기화: {resetText(dayStart)} (한국 시간) · 모든 사용자 합계</Text>}
      {!!error && <Text style={styles.error}>{error}</Text>}

      {rows?.map(r => {
        const calls = Number(r.calls);
        return (
          <View key={r.model} style={styles.model}>
            <View style={styles.modelHead}>
              <Text style={styles.modelName}>{r.model}</Text>
              <Text style={styles.modelCount}>
                {calls.toLocaleString()} / {r.rpd ? `${r.rpd.toLocaleString()}회` : '한도 미설정'}
              </Text>
            </View>
            <UsageBar used={calls} limit={r.rpd} />
            <Text style={styles.meta}>
              최근 1분 {r.last_minute} / {r.rpm ?? '-'}회 · 남은 호출 {r.rpd ? Math.max(0, r.rpd - calls).toLocaleString() : '-'}회
            </Text>
            <Text style={styles.meta}>
              성공 {r.succeeded} · 한도 초과 {r.rate_limited} · 기타 실패 {r.other_failed} · 내 호출 {r.my_calls}
            </Text>
          </View>
        );
      })}

      {assistUsed != null && (
        <View style={styles.model}>
          <View style={styles.modelHead}>
            <Text style={styles.modelName}>내 AI 도우미 사용 (영수증·검색 등)</Text>
            <Text style={styles.modelCount}>
              {assistUsed} / {ASSIST_DAILY_LIMIT}회
            </Text>
          </View>
          <UsageBar used={assistUsed} limit={ASSIST_DAILY_LIMIT} />
        </View>
      )}

      <Text style={styles.note}>
        한도는 설정값이에요. AI Studio → Rate limit 에서 실제 값을 확인해 Supabase 의 ai_model_limits 표를 고치면 여기 반영돼요.
        재시도·예비 모델 호출도 각각 1회로 세요.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.warning,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  headRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {...typography.bodyBold, color: colors.text},
  refresh: {paddingHorizontal: spacing.sm, paddingVertical: 4, minWidth: 64, alignItems: 'center'},
  refreshText: {...typography.small, color: colors.primary, fontWeight: '700'},
  desc: {...typography.small, color: colors.textSecondary},
  error: {...typography.small, color: colors.danger},
  model: {backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: spacing.sm, gap: 4},
  modelHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  modelName: {...typography.captionBold, color: colors.text, flexShrink: 1},
  modelCount: {...typography.captionBold, color: colors.text},
  barTrack: {height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden'},
  barFill: {height: 6, borderRadius: 3},
  meta: {...typography.small, color: colors.textSecondary},
  note: {...typography.small, color: colors.textTertiary, lineHeight: 17},
});
