// ⚠️ 테스트용 임시 화면 — 출시 전에 src/dev/flags.js 의 SHOW_NOTIFICATION_TEST 를 false 로 바꾸거나 이 파일을 지운다.
//
// 각 버튼은 실제 알림과 같은 문구 생성 코드(buildItemReminders / buildNews / wishCopy)로 알림을 만들어
// 10초 뒤에 띄운다. 그 사이 앱을 닫으면 백그라운드 동작(알림 누르기, "교체 완료" 버튼)도 확인할 수 있다.
import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, Pressable, ToastAndroid} from 'react-native';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import {supabase} from '../lib/supabase';
import {
  buildItemReminders,
  buildNews,
  fireTestNotification,
  fetchItemsForTest,
} from '../lib/reminders';

const DELAY = 10;
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const inDays = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

// 내일 날짜에서 n년을 뺀 날 (기념일이 내일이 되도록)
const tomorrowYearsAgo = n => {
  const d = inDays(1);
  d.setFullYear(d.getFullYear() - n);
  return d;
};

export function NotificationTestPanel() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (user) setItems((await fetchItemsForTest(user.email)) || []);
    })();
  }, []);

  // 누르면 실제 화면으로 이동할 수 있도록 가능한 한 내 실제 물건을 사용
  const owned = items.find(i => !i.is_wishlist) || {seq: 0, name: '맥북 에어', price: 1390000};
  const withReplace = items.find(i => !i.is_wishlist && i.replacement_months) || null;
  const wish = items.find(i => i.is_wishlist) || {seq: 0, name: '다이슨 V15', price: 1090000, link: ''};

  // buildItemReminders 결과 중 원하는 종류/시점을 골라낸다
  const pick = (item, kind, before) =>
    buildItemReminders({...item, is_wishlist: false, notify_muted: false}).find(r => r.id.endsWith(`-${kind}-${before}`));

  const cases = [
    {group: '일정 알림 (오전 9시)'},
    {label: '보증 30일 전', make: () => pick({...owned, warranty_date: iso(inDays(31))}, 'warranty', 30)},
    {label: '보증 7일 전', make: () => pick({...owned, warranty_date: iso(inDays(8))}, 'warranty', 7)},
    {label: '보증 당일', make: () => pick({...owned, warranty_date: iso(inDays(1))}, 'warranty', 0)},
    {label: '배터리 점검 당일', make: () => pick({...owned, battery_check_date: iso(inDays(1))}, 'battery', 0)},
    {
      label: '소모품 교체 3일 전',
      make: () =>
        pick(
          {...(withReplace || owned), replacement_item: withReplace?.replacement_item || '정수기 필터',
           replacement_months: withReplace?.replacement_months || 2, next_replacement_date: iso(inDays(4))},
          'replace', 3,
        ),
    },
    {
      label: '소모품 교체 당일 (교체 완료 버튼)',
      hint: withReplace ? `실제 물건 "${withReplace.name}"의 다음 교체일이 바뀌어요` : '교체 주기가 있는 물건이 없어서 버튼은 동작만 확인돼요',
      make: () =>
        pick(
          {...(withReplace || owned), replacement_item: withReplace?.replacement_item || '정수기 필터',
           replacement_months: withReplace?.replacement_months || 2, next_replacement_date: iso(inDays(1))},
          'replace', 0,
        ),
    },
    {group: '찜 알림 (오전 11시)'},
    ...[14, 30, 60, 90, 180, 365, 730].map(stage => ({
      label: `찜 ${({14: '2주', 30: '한 달', 60: '두 달', 90: '3개월', 180: '반년', 365: '1년', 730: '2년'})[stage]}${stage === 30 ? ' (가격 확인 버튼: 링크가 있을 때)' : ''}`,
      // 찜한 날을 "내일이 그 단계"가 되도록 잡고 실제 생성 경로(buildNews)로 만든다 → 버튼 포함
      make: () => {
        const created = stage >= 365 ? tomorrowYearsAgo(stage / 365) : inDays(1 - stage);
        return buildNews([{...wish, notify_muted: false, link: wish.link || 'https://search.shopping.naver.com', is_wishlist: true, created_at: created.toISOString()}])
          .find(r => r.id === `news-wish-${wish.seq}-${stage}`);
      },
    })),
    {
      label: '찜 여러 개 묶음',
      make: () =>
        buildNews(
          ['에어팟 프로', '다이슨 V15', '무선 키보드'].map((name, i) => ({
            seq: 900 + i, name, is_wishlist: true, created_at: inDays(-13).toISOString(),
          })),
        ).find(r => r.id.startsWith('news-wish-')),
    },
    {group: '소식 알림'},
    {
      label: '함께한 지 1년',
      make: () =>
        buildNews([{...owned, is_wishlist: false, notify_muted: false, item_date: iso(tomorrowYearsAgo(1))}]).find(r =>
          r.id.startsWith('news-anniv-'),
        ),
    },
    {
      label: '기념일 여러 개 묶음',
      make: () =>
        buildNews(
          ['맥북 에어', '아이패드'].map((name, i) => ({
            seq: 910 + i, name, is_wishlist: false, item_date: iso(tomorrowYearsAgo(i + 1)),
          })),
        ).find(r => r.id.startsWith('news-anniv-')),
    },
    {
      label: '월간 요약',
      make: () =>
        buildNews([1, 2, 3].map(i => ({seq: 920 + i, name: `물건${i}`, is_wishlist: false, created_at: new Date().toISOString(),
          warranty_date: i === 1 ? iso(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 10)) : null}))).find(r =>
          r.id.startsWith('news-summary-'),
        ),
    },
    {label: '기록 유도 (누르면 등록 화면)', make: () => buildNews([]).find(r => r.id === 'news-nudge')},
  ];

  const fire = async c => {
    const r = c.make();
    if (!r) {
      ToastAndroid.show('이 케이스를 만들 수 없어요', ToastAndroid.SHORT);
      return;
    }
    try {
      await fireTestNotification(r, DELAY);
      ToastAndroid.show(`${DELAY}초 뒤에 알림이 와요`, ToastAndroid.SHORT);
    } catch (e) {
      ToastAndroid.show(`알림 생성 실패: ${e?.message || e}`, ToastAndroid.LONG);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>🧪 알림 테스트 (임시)</Text>
      <Text style={styles.desc}>버튼을 누르고 {DELAY}초 안에 앱을 닫으면 백그라운드 동작까지 확인할 수 있어요.</Text>
      {cases.map((c, i) =>
        c.group ? (
          <Text key={i} style={styles.group}>{c.group}</Text>
        ) : (
          <Pressable key={i} onPress={() => fire(c)} style={({pressed}) => [styles.btn, pressed && {opacity: 0.7}]}>
            <Text style={styles.btnText}>{c.label}</Text>
            {!!c.hint && <Text style={styles.hint}>{c.hint}</Text>}
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.warning,
    backgroundColor: colors.surface,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
  },
  desc: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 4,
  },
  group: {
    ...typography.captionBold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  btn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.xs,
  },
  btnText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  hint: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
