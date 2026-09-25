// 알림 (기기 로컬 예약)
//
// 1) 일정 알림: 보증 만료·배터리 점검·소모품 교체 — 사용자가 입력한 날짜 기준, 오전 9시
// 2) 소식 알림: 찜 목록 경과·함께한 지 N년·월간 요약·기록 유도 — 앱이 먼저 말을 거는 알림
//
// 날짜의 원본은 Supabase items 테이블이고, 여기서는 안드로이드 시스템 알람에 예약만 건다.
// - 앱 시작(로그인 상태)·물건 저장/삭제·교체 완료 때 syncAllReminders() 로 전체를 다시 맞춘다
//   → 재설치·기기 변경 복구, 월간 요약 숫자 갱신, "기록 유도" 알림을 계속 뒤로 미루는 효과
// - 재부팅 후 재등록은 notifee 가 처리한다
// - 안드로이드 알람 개수 제한(앱당 약 500개)을 넘지 않도록 가까운 순으로 MAX_TRIGGERS 개만 예약
import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {supabase} from './supabase';
import {addMonths, formatMonths} from '../utils/schedule';
import {formatPrice} from '../utils/formatPrice';

const SCHEDULE_ENABLED_KEY = 'reminders_enabled';
const NEWS_ENABLED_KEY = 'news_enabled';
const PREFIXES = ['item-', 'news-'];
const MAX_TRIGGERS = 400;
const SCHEDULE_WINDOW_DAYS = 400; // 일정 알림은 1년 남짓 앞까지
const NEWS_WINDOW_DAYS = 60; // 소식 알림은 두 달 앞까지 (앱을 열 때마다 다시 채움)
const DAY_MS = 24 * 60 * 60 * 1000;

// 채널 중요도는 한 번 만들면 바꿀 수 없어서, 팝업(HIGH)으로 바꾸면서 id 에 _v2 를 붙였다
export const CHANNELS = {
  warranty: {id: 'warranty_v2', name: '보증 만료 알림'},
  care: {id: 'care_v2', name: '교체·점검 알림'},
  news: {id: 'news_v2', name: '소식 알림'},
};
const OLD_CHANNEL_IDS = ['warranty', 'care', 'news'];


// ───────────────────────── 알림 버튼 ─────────────────────────
// 앱을 열지 않고 바로 처리되는 버튼 (index.js onBackgroundEvent / 앱이 켜져 있으면 RootNavigator 에서 처리)
export const ACTION_REPLACED = 'replaced'; // 소모품 교체 완료
export const ACTION_SNOOZE = 'snooze'; // 내일 다시 알림
export const ACTION_BATTERY_DONE = 'battery_done'; // 배터리 점검 완료
export const ACTION_WISH_BOUGHT = 'wish_bought'; // 찜 → 구입 완료
export const BACKGROUND_ACTIONS = [ACTION_REPLACED, ACTION_SNOOZE, ACTION_BATTERY_DONE, ACTION_WISH_BOUGHT];
// 앱을 열어서 처리하는 버튼 (외부 링크·화면 이동)
export const ACTION_BUY = 'buy'; // 소모품 구매 (쇼핑 검색)
export const ACTION_SERVICE = 'service'; // 서비스센터 찾기 (지도 검색)
export const ACTION_PRICE = 'price'; // 가격 확인 (저장한 링크)
export const ACTION_RECORD_PHOTO = 'record_photo'; // 사진으로 기록

const BTN = {
  replaced: {id: ACTION_REPLACED, title: '교체 완료'},
  snooze: {id: ACTION_SNOOZE, title: '내일 다시 알림'},
  buy: {id: ACTION_BUY, title: '소모품 구매', launch: true},
  service: {id: ACTION_SERVICE, title: '서비스센터 찾기', launch: true},
  batteryDone: {id: ACTION_BATTERY_DONE, title: '점검 완료'},
  wishBought: {id: ACTION_WISH_BOUGHT, title: '구입 완료'},
  price: {id: ACTION_PRICE, title: '가격 확인', launch: true},
  recordPhoto: {id: ACTION_RECORD_PHOTO, title: '사진으로 기록', launch: true},
};

const shoppingSearchUrl = q => `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(q)}`;
const mapSearchUrl = q => `https://map.naver.com/p/search/${encodeURIComponent(q)}`;

const BASE_COLUMNS = 'seq, name, price, link, image_url, is_wishlist, item_date, created_at, warranty_date';
const ITEM_COLUMNS = `${BASE_COLUMNS}, battery_check_date, replacement_item, replacement_months, next_replacement_date`;
const ITEM_COLUMNS_WITH_MUTE = `${ITEM_COLUMNS}, notify_muted`;

// ───────────────────────── 설정 ─────────────────────────

const readFlag = async key => {
  try {
    return (await AsyncStorage.getItem(key)) !== 'false';
  } catch (e) {
    return true;
  }
};
const writeFlag = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  } catch (e) {}
};

export const isRemindersEnabled = () => readFlag(SCHEDULE_ENABLED_KEY);
export const isNewsEnabled = () => readFlag(NEWS_ENABLED_KEY);

export const setRemindersEnabled = async enabled => {
  await writeFlag(SCHEDULE_ENABLED_KEY, enabled);
  if (enabled) await requestReminderPermission();
  await syncAllReminders();
};

export const setNewsEnabled = async enabled => {
  await writeFlag(NEWS_ENABLED_KEY, enabled);
  if (enabled) await requestReminderPermission();
  await syncAllReminders();
};

// 알림 권한 요청 (Android 13+ 에서 시스템 팝업). 허용 여부를 돌려준다
export const requestReminderPermission = async () => {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
};

// ───────────────────────── 날짜 도우미 ─────────────────────────

// 'YYYY-MM-DD' 또는 ISO 문자열 → 그날 00:00 (로컬)
const dayOf = value => {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const at = (day, hour, minute = 0) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
const addDays = (day, n) => new Date(day.getFullYear(), day.getMonth(), day.getDate() + n);
const ymd = d => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const monthLabel = d => `${d.getMonth() + 1}월`;

// "브리타 정수기" + "정수기 필터" → "브리타 정수기 필터" (물건 이름에 이미 있는 앞단어는 생략)
export const withPart = (name, part) => {
  const words = part.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length - 1 && name.includes(words[i])) i += 1;
  return `${name} ${words.slice(i).join(' ')}`;
};

const namesPreview = items => {
  const names = items.map(i => i.name).filter(Boolean);
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}개` : names.join(', ');
};

// ───────────────────────── 1) 일정 알림 ─────────────────────────

export const buildItemReminders = (item, now = new Date()) => {
  if (!item || item.is_wishlist || item.notify_muted) return [];
  const name = item.name || '물건';
  const list = [];

  const warranty = dayOf(item.warranty_date);
  if (warranty) {
    const service = {serviceUrl: mapSearchUrl(`${name} 서비스센터`)};
    list.push(
      {kind: 'warranty', day: addDays(warranty, -30), channel: 'warranty',
       title: `${name} 보증이 한 달 남았어요`,
       body: '보증 기간 안에 점검받을 곳이 있는지 확인해보세요.',
       buttons: [BTN.service], extra: service},
      {kind: 'warranty', day: addDays(warranty, -7), channel: 'warranty',
       title: `${name} 보증이 7일 남았어요`,
       body: '고장이나 불편한 곳이 있다면 지금 무상 수리를 신청하세요.',
       buttons: [BTN.service], extra: service},
      {kind: 'warranty', day: warranty, channel: 'warranty',
       title: `오늘 ${name} 보증이 끝나요`,
       body: '오늘까지 보증 기간이에요.',
       buttons: [BTN.service], extra: service},
    );
  }

  const battery = dayOf(item.battery_check_date);
  if (battery) {
    list.push({kind: 'battery', day: battery, channel: 'care',
      title: `오늘은 ${name} 배터리 점검일이에요`,
      body: '설정에서 배터리 성능 상태를 확인해보세요. 점검했다면 "점검 완료"를 눌러주세요.',
      buttons: [BTN.batteryDone]});
  }

  const replace = dayOf(item.next_replacement_date);
  if (replace) {
    const target = withPart(name, item.replacement_item || '소모품');
    const cycle = item.replacement_months ? ` (${formatMonths(item.replacement_months)}마다)` : '';
    const buy = {buyUrl: shoppingSearchUrl(target)};
    list.push(
      {kind: 'replace', day: addDays(replace, -3), channel: 'care',
       title: `${target} 교체까지 3일 남았어요`,
       body: `미리 준비해두세요${cycle}.`,
       buttons: [BTN.buy], extra: buy},
      {kind: 'replace', day: replace, channel: 'care',
       title: `오늘은 ${target} 교체일이에요`,
       body: item.replacement_months ? '교체했다면 아래 "교체 완료"를 눌러주세요.' : '교체할 때가 됐어요.',
       buttons: [...(item.replacement_months ? [BTN.replaced] : []), BTN.snooze, BTN.buy], extra: buy},
    );
  }

  const limit = now.getTime() + SCHEDULE_WINDOW_DAYS * DAY_MS;
  return list
    .map(r => {
      const when = at(r.day, 9);
      const before = Math.round((dayOf(dateOfKind(item, r.kind)) - r.day) / DAY_MS);
      return {
        ...r,
        id: `item-${item.seq}-${r.kind}-${before}`,
        when,
        data: {type: 'item', seq: String(item.seq), ...(r.extra || {})},
        largeIcon: item.image_url,
      };
    })
    .filter(r => r.when.getTime() > now.getTime() && r.when.getTime() <= limit);
};

const dateOfKind = (item, kind) =>
  ({warranty: item.warranty_date, battery: item.battery_check_date, replace: item.next_replacement_date}[kind]);

// ───────────────────────── 2) 소식 알림 ─────────────────────────

// 찜한 지 N일 단계와 문구 — 물건 가격·링크 유무에 따라 문구를 조금씩 바꾼다
// 14일 → 30일 → 60일 → 90일 → 반년 → 1년, 그 뒤로는 1년마다 (단계 값 365 이상은 N년)
const WISH_STAGES = [14, 30, 60, 90, 180];
const YEAR = 365;
export const wishCopy = (item, stage) => {
  const name = item.name || '찜한 물건';
  const pricey = (item.price || 0) >= 300000;
  const hasLink = !!item.link;
  switch (stage) {
    case 14:
      return {
        title: `찜한 지 2주, ${name} 아직 마음에 있나요?`,
        body: '구입했다면 기록으로 옮기고, 마음이 바뀌었다면 찜 목록을 정리해보세요.',
      };
    case 30:
      return {
        title: `${name}, 찜한 지 한 달이 지났어요`,
        body: hasLink
          ? '여전히 갖고 싶다면 저장해둔 링크에서 지금 가격을 확인해보세요.'
          : '여전히 갖고 싶은지 한 번 생각해보세요. 할인 소식이 있을지도 몰라요.',
      };
    case 60:
      return {
        title: `${name}, 두 달째 고민 중이에요`,
        body: pricey
          ? '큰 지출인 만큼 천천히 비교해도 좋아요. 필요한 이유를 메모해두면 결정이 쉬워져요.'
          : '정말 필요한 물건인지 한 번 더 생각해볼 때예요.',
      };
    case 90:
      return {
        title: `찜한 지 3개월, ${name} 어떻게 할까요?`,
        body: '구입했다면 기록으로, 마음이 떠났다면 가볍게 정리해보세요.',
      };
    case 180:
      return {
        title: `${name}, 찜한 지 반년이 됐어요`,
        body: '이제 결정할 때예요. 산다면 기록으로 옮기고, 아니라면 정리해보세요.',
      };
    default: {
      const years = Math.round(stage / YEAR);
      return years <= 1
        ? {
            title: `${name}, 찜한 지 1년이 됐어요`,
            body: '1년째 찜 목록에 있어요. 아직 필요하다면 기록으로, 아니라면 이번에 정리해보세요.',
          }
        : {
            title: `${name}, 찜한 지 ${years}년이 지났어요`,
            body: `${years}년째 찜 목록에 있어요. 계속 둘지 한 번 결정해보세요.`,
          };
    }
  }
};

const stageLabel = stage =>
  stage >= YEAR ? `${Math.round(stage / YEAR)}년` : {14: '2주', 30: '한 달', 60: '두 달', 90: '3개월', 180: '반년'}[stage];

const buildWishNews = (items, now, limit) => {
  const byDay = new Map();
  for (const item of items) {
    if (!item.is_wishlist || item.notify_muted) continue;
    const start = dayOf(item.created_at || item.item_date);
    if (!start) continue;
    // 고정 단계 + 1년마다 (예약 범위를 넘으면 중단)
    const stages = [...WISH_STAGES.map(d => ({stage: d, day: addDays(start, d)}))];
    for (let y = 1; addMonths(start, 12 * y).getTime() <= limit; y += 1) {
      stages.push({stage: y * YEAR, day: addMonths(start, 12 * y)});
    }
    for (const {stage, day} of stages) {
      const when = at(day, 11);
      if (when <= now || when.getTime() > limit) continue;
      const key = ymd(when);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push({item, stage, when});
    }
  }
  return [...byDay.entries()].map(([key, hits]) => {
    if (hits.length === 1) {
      const {item, stage, when} = hits[0];
      return {id: `news-wish-${item.seq}-${stage}`, when, channel: 'news', ...wishCopy(item, stage),
              data: {type: 'item', seq: String(item.seq), ...(item.link ? {link: item.link} : {})},
              buttons: [BTN.wishBought, ...(item.link ? [BTN.price] : [])],
              largeIcon: item.image_url};
    }
    return {
      id: `news-wish-${key}`,
      when: hits[0].when,
      channel: 'news',
      title: `찜한 물건 ${hits.length}개가 결정을 기다리고 있어요`,
      body: `${namesPreview(hits.map(h => h.item))} · 구입했다면 기록으로 옮기고, 아니라면 정리해보세요.`,
      lines: hits.map(h => `${h.item.name} · 찜한 지 ${stageLabel(h.stage)}`),
      summary: '구입했다면 기록으로 옮겨보세요',
      data: {type: 'wishlist'},
    };
  });
};

// 구입일 기념일 (함께한 지 N년) — 같은 날은 묶어서 한 번
const buildAnniversaryNews = (items, now, limit) => {
  const today = dayOf(now.toISOString());
  const byDay = new Map();
  for (const item of items) {
    if (item.is_wishlist || item.notify_muted) continue;
    const bought = dayOf(item.item_date);
    if (!bought) continue;
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
      const years = year - bought.getFullYear();
      if (years < 1) continue;
      const anniv = addMonths(bought, years * 12);
      const when = at(anniv, 19, 30);
      if (when <= now || when.getTime() > limit) continue;
      const key = ymd(when);
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push({item, years, when});
    }
  }
  return [...byDay.entries()].map(([key, hits]) => {
    if (hits.length === 1) {
      const {item, years, when} = hits[0];
      const price = item.price > 0 ? `${formatPrice(item.price)}원에 ` : '';
      return {
        id: `news-anniv-${item.seq}-${years}`, when, channel: 'news',
        title: `${item.name}${hasBatchim(item.name) ? '과' : '와'} 함께한 지 ${years}년이 됐어요 🎉`,
        body: `${years}년 전 오늘 ${price}장만한 물건이에요. 지금도 잘 쓰고 있나요?`,
        data: {type: 'item', seq: String(item.seq)}, largeIcon: item.image_url,
      };
    }
    return {
      id: `news-anniv-${key}`, when: hits[0].when, channel: 'news',
      title: `오늘은 물건 ${hits.length}개와 함께한 기념일이에요 🎉`,
      body: namesPreview(hits.map(h => h.item)),
      lines: hits.map(h => `${h.item.name} · 함께한 지 ${h.years}년`),
      data: {type: 'list'},
    };
  });
};

// 마지막 글자 받침 여부 (와/과 선택)
const hasBatchim = word => {
  const ch = (word || '').trim().slice(-1);
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return /[013678lmnr]$/i.test(ch); // 한글이 아니면 대략적인 규칙
  return code % 28 !== 0;
};

// 월간 요약: 매월 1일 오전 10시, 지난달 새로 기록한 물건 수 + 이번 달 챙길 일 수
const buildMonthlySummary = (items, now, limit) => {
  const out = [];
  for (let k = 1; k <= 2; k += 1) {
    const first = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const when = at(first, 10);
    if (when <= now || when.getTime() > limit) continue;
    const prevStart = new Date(first.getFullYear(), first.getMonth() - 1, 1);
    const nextStart = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    const inRange = (d, a, b) => d && d >= a && d < b;
    const recorded = items.filter(i => inRange(dayOf(i.created_at), prevStart, first)).length;
    const upcomingList = items
      .filter(i => !i.is_wishlist && !i.notify_muted)
      .flatMap(i => [
        {d: dayOf(i.warranty_date), label: `${i.name} 보증 만료`},
        {d: dayOf(i.battery_check_date), label: `${i.name} 배터리 점검`},
        {d: dayOf(i.next_replacement_date), label: `${withPart(i.name || '', i.replacement_item || '소모품')} 교체`},
      ])
      .filter(x => inRange(x.d, first, nextStart))
      .sort((a, b) => a.d - b.d);
    const upcoming = upcomingList.length;
    if (recorded === 0 && upcoming === 0) continue; // 빈 요약은 보내지 않는다
    const title =
      recorded > 0
        ? `${monthLabel(prevStart)}에 새로 기록한 물건 ${recorded}개`
        : `${monthLabel(first)}에 챙길 일이 ${upcoming}개 있어요`;
    const body =
      recorded > 0 && upcoming > 0
        ? `${monthLabel(first)}에 챙길 일도 ${upcoming}개 있어요. 확인해보세요.`
        : recorded > 0
        ? '지난달 기록을 한눈에 확인해보세요.'
        : '보증 만료나 소모품 교체 일정을 미리 확인해보세요.';
    const lines = upcomingList.slice(0, 5).map(x => `${x.d.getMonth() + 1}/${x.d.getDate()} ${x.label}`);
    out.push({id: `news-summary-${ymd(first)}`, when, channel: 'news', title, body, data: {type: 'list'},
              ...(lines.length ? {lines, summary: `${monthLabel(first)}에 챙길 일`} : {})});
  }
  return out;
};

// 기록 유도: "앱을 연 날로부터 14일 이상 지난 다음 15일" 낮 12시 30분 (다른 알림과 시각이 겹치지 않게).
// 앱을 열 때마다 다시 계산되므로, 자주 쓰는 사람에게는 오지 않는다.
const buildNudge = now => {
  const earliest = addDays(dayOf(now.toISOString()), 14);
  let d = new Date(earliest.getFullYear(), earliest.getMonth(), 15);
  if (d < earliest) d = new Date(earliest.getFullYear(), earliest.getMonth() + 1, 15);
  return [{
    id: 'news-nudge', when: at(d, 12, 30), channel: 'news',
    title: '최근에 새로 장만한 물건이 있나요?',
    body: '잊기 전에 사진 한 장으로 기록해두세요. 보증기간도 챙겨드릴게요.',
    data: {type: 'nudge'},
    buttons: [BTN.recordPhoto],
  }];
};

export const buildNews = (items, now = new Date()) => {
  const limit = now.getTime() + NEWS_WINDOW_DAYS * DAY_MS;
  return [
    ...buildWishNews(items, now, limit),
    ...buildAnniversaryNews(items, now, limit),
    ...buildMonthlySummary(items, now, limit),
    ...buildNudge(now),
  ];
};

// ───────────────────────── 예약 ─────────────────────────

const ensureChannels = async () => {
  await Promise.all(OLD_CHANNEL_IDS.map(id => notifee.deleteChannel(id).catch(() => {})));
  await Promise.all(
    Object.values(CHANNELS).map(c =>
      // HIGH: 화면 위에 팝업(헤드업)으로 표시
      notifee.createChannel({id: c.id, name: c.name, importance: AndroidImportance.HIGH}),
    ),
  );
};

// notifee 는 값이 undefined 인 항목도 타입 검사를 해서 알림 생성 자체를 거부하므로, 빈 값은 키째로 뺀다
const compact = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));

const toNotification = r => ({
  id: r.id,
  title: r.title,
  body: r.body,
  data: r.data,
  android: compact({
    channelId: CHANNELS[r.channel].id,
    smallIcon: 'ic_notification',
    color: '#3B6EF5',
    // 오른쪽 이미지: 물건 사진이 있을 때만
    largeIcon: r.largeIcon || undefined,
    // launchActivity: 앱이 꺼져 있거나 백그라운드여도 누르면 앱을 연다
    pressAction: {id: 'default', launchActivity: 'default'},
    // 버튼: launch 가 있는 버튼만 앱을 열고, 나머지는 앱을 열지 않고 백그라운드에서 처리
    actions: r.buttons?.length
      ? r.buttons.map(b => ({title: b.title, pressAction: {id: b.id, ...(b.launch ? {launchActivity: 'default'} : {})}}))
      : undefined,
    // 여러 물건을 묶은 알림은 펼치면 한 줄씩 보이는 목록 스타일
    style: r.lines?.length ? compact({type: AndroidStyle.INBOX, lines: r.lines, summary: r.summary}) : undefined,
  }),
});

const scheduleOne = async r => {
  await notifee.createTriggerNotification(toNotification(r), {
    type: TriggerType.TIMESTAMP,
    timestamp: r.when.getTime(),
    // 정확한 시각 알람 권한 없이, 절전 모드에서도 울리는 일반 알람 (몇 분 오차 허용)
    alarmManager: {type: AlarmType.SET_AND_ALLOW_WHILE_IDLE},
  });
};

export const cancelAllReminders = async () => {
  try {
    const ids = (await notifee.getTriggerNotificationIds()).filter(id =>
      PREFIXES.some(p => id.startsWith(p)),
    );
    if (ids.length) await notifee.cancelTriggerNotifications(ids);
  } catch (e) {
    console.log('cancelAllReminders', e);
  }
};

const fetchItems = async userEmail => {
  // 관리 일정 컬럼이 아직 없는 DB(마이그레이션 전)에서는 기본 컬럼만 읽는다
  for (const columns of [ITEM_COLUMNS_WITH_MUTE, ITEM_COLUMNS, BASE_COLUMNS]) {
    const {data, error} = await supabase.from('items').select(columns).eq('user_id', userEmail);
    if (!error && data) return data;
  }
  return null;
};

let syncing = null;
// 로그인한 사용자의 알림 전체를 DB 기준으로 다시 예약
export const syncAllReminders = async () => {
  // 동시에 여러 번 불려도 한 번만 실행
  if (syncing) return syncing;
  syncing = (async () => {
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) return;
      const items = await fetchItems(user.email);
      if (!items) return;

      const now = new Date();
      const [scheduleOn, newsOn] = await Promise.all([isRemindersEnabled(), isNewsEnabled()]);
      const all = [
        ...(scheduleOn ? items.flatMap(i => buildItemReminders(i, now)) : []),
        ...(newsOn ? buildNews(items, now) : []),
      ]
        .sort((a, b) => a.when - b.when)
        .slice(0, MAX_TRIGGERS);

      await cancelAllReminders();
      await ensureChannels();
      for (const r of all) await scheduleOne(r);
    } catch (e) {
      console.log('syncAllReminders', e);
    } finally {
      syncing = null;
    }
  })();
  return syncing;
};

// 물건 저장·수정·삭제·교체 완료 후 호출 (알림 숫자와 일정을 최신으로)
export const syncItemReminders = () => syncAllReminders();

// 물건을 저장했을 때: 알림이 켜져 있으면 (처음 한 번) 권한을 요청하고 다시 예약
export const onItemSaved = async () => {
  if ((await isRemindersEnabled()) || (await isNewsEnabled())) {
    await requestReminderPermission();
  }
  await syncAllReminders();
};

const isoDate = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 앱을 열지 않고 처리하는 버튼 (교체 완료·내일 다시 알림·점검 완료·구입 완료)
export const handleBackgroundAction = async (actionId, notification) => {
  const seq = notification?.data?.seq;
  try {
    if (actionId === ACTION_REPLACED) await markReplaced(seq);
    else if (actionId === ACTION_SNOOZE) await snoozeUntilTomorrow(notification);
    else if (actionId === ACTION_BATTERY_DONE) await markBatteryChecked(seq);
    else if (actionId === ACTION_WISH_BOUGHT) await markWishBought(seq);
  } finally {
    if (notification?.id) await notifee.cancelNotification(notification.id);
  }
};

// 앱을 연 뒤 처리하는 버튼 → 열 링크 또는 이동할 화면
export const launchTargetOf = (actionId, data = {}) => {
  if (actionId === ACTION_BUY && data.buyUrl) return {url: data.buyUrl};
  if (actionId === ACTION_SERVICE && data.serviceUrl) return {url: data.serviceUrl};
  if (actionId === ACTION_PRICE && data.link) return {url: data.link};
  if (actionId === ACTION_RECORD_PHOTO) return {screen: 'ItemForm', params: {autoPhoto: true}};
  return null;
};

// 내일 같은 시각에 같은 알림을 한 번 더 (다음 전체 동기화에도 지워지지 않도록 snooze- 접두사)
const snoozeUntilTomorrow = async notification => {
  if (!notification) return;
  const tomorrow = new Date(Date.now() + DAY_MS);
  await ensureChannels();
  await notifee.createTriggerNotification(
    {...notification, id: `snooze-${notification.id}`},
    {type: TriggerType.TIMESTAMP, timestamp: tomorrow.getTime(), alarmManager: {type: AlarmType.SET_AND_ALLOW_WHILE_IDLE}},
  );
};

const cancelSnoozes = async seq => {
  const ids = (await notifee.getTriggerNotificationIds()).filter(id => id.startsWith(`snooze-item-${seq}-`));
  if (ids.length) await notifee.cancelTriggerNotifications(ids);
};

// 배터리 점검 완료: 다음 점검일을 1년 뒤로
export const markBatteryChecked = async seq => {
  const next = isoDate(addMonths(new Date(), 12));
  const {error} = await supabase
    .from('items')
    .update({battery_check_date: next, updated_at: new Date().toISOString()})
    .eq('seq', Number(seq));
  if (error) return null;
  await syncAllReminders();
  return next;
};

// 찜 → 구입 완료: 내 물건으로 옮기고 구입일은 오늘
export const markWishBought = async seq => {
  const {error} = await supabase
    .from('items')
    .update({is_wishlist: false, item_date: isoDate(new Date()), updated_at: new Date().toISOString()})
    .eq('seq', Number(seq));
  if (error) return false;
  await syncAllReminders();
  return true;
};

// 물건별 알림 끄기/켜기
export const setItemMuted = async (seq, muted) => {
  const {error} = await supabase
    .from('items')
    .update({notify_muted: muted, updated_at: new Date().toISOString()})
    .eq('seq', Number(seq));
  if (error) return false;
  if (muted) await cancelSnoozes(seq);
  await syncAllReminders();
  return true;
};

// 알림의 "교체 완료" 버튼 또는 상세 화면 버튼: 오늘 교체했다고 기록하고 다음 교체일 갱신
export const markReplaced = async seq => {
  const {data: item} = await supabase
    .from('items')
    .select('seq, replacement_months')
    .eq('seq', Number(seq))
    .single();
  if (!item?.replacement_months) return null;
  const d = addMonths(new Date(), item.replacement_months);
  const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const {error} = await supabase
    .from('items')
    .update({next_replacement_date: next, updated_at: new Date().toISOString()})
    .eq('seq', item.seq);
  if (error) return null;
  await cancelSnoozes(item.seq);
  await syncAllReminders();
  return next;
};

// ───────────────────────── 테스트용 (출시 전 제거 가능) ─────────────────────────

// 실제 알림과 같은 내용을 delaySec 초 뒤에 한 번 띄운다.
// 일반 알람은 짧은 시간에 여러 개를 연달아 울리지 못하게 안드로이드가 막으므로,
// 테스트는 알람 대신 WorkManager 기반 예약(alarmManager 없음)을 쓴다.
export const fireTestNotification = async (r, delaySec = 10) => {
  await requestReminderPermission();
  await ensureChannels();
  await notifee.createTriggerNotification(toNotification({...r, id: `test-${Date.now()}`}), {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + delaySec * 1000,
  });
};

export {fetchItems as fetchItemsForTest};
