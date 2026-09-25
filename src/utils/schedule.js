// 보증·교체·점검 등 관리 일정 계산 유틸

const DAY_MS = 1000 * 60 * 60 * 24;

const startOfDay = d => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// 1/31 + 1개월이 3/3이 되지 않도록 말일로 맞춘다
export const addMonths = (base, months) => {
  const d = new Date(base);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
};

// 기준일에서 주기만큼 더해 가며 오늘 이후 첫 교체일을 구한다
export const nextReplacementFrom = (start, months) => {
  if (!start || !months) return null;
  const today = startOfDay(new Date());
  let i = 1;
  let next = addMonths(start, months);
  while (startOfDay(next) < today) {
    i += 1;
    next = addMonths(start, months * i);
  }
  return next;
};

// 오늘 기준 남은 일수 (지났으면 음수)
export const daysUntil = date => {
  if (!date) return null;
  return Math.round((startOfDay(date) - startOfDay(new Date())) / DAY_MS);
};

export const formatMonths = months =>
  months % 12 === 0 ? `${months / 12}년` : `${months}개월`;

const GRAY = '#9CA3AF';
const RED = '#EF4444';
const ORANGE = '#F59E0B';
const GREEN = '#10B981';

// 상세 화면에 표시할 관리 일정 목록
export const getScheduleRows = item => {
  const rows = [];

  const warrantyDays = daysUntil(item.warranty_date);
  if (warrantyDays !== null) {
    rows.push({
      key: 'warranty',
      icon: 'shield-checkmark-outline',
      label: '보증기간',
      ...(warrantyDays < 0
        ? {text: '보증 만료', color: GRAY}
        : warrantyDays <= 30
        ? {text: `보증 만료 임박 (D-${warrantyDays})`, color: RED}
        : {text: `보증 중 (${warrantyDays}일 남음)`, color: GREEN}),
    });
  }

  const batteryDays = daysUntil(item.battery_check_date);
  if (batteryDays !== null) {
    rows.push({
      key: 'battery',
      icon: 'battery-half-outline',
      label: '배터리 점검',
      ...(batteryDays < 0
        ? {text: '점검 시기 지남', color: ORANGE}
        : batteryDays <= 30
        ? {text: `점검 예정 (D-${batteryDays})`, color: ORANGE}
        : {text: `${batteryDays}일 후 점검`, color: GREEN}),
    });
  }

  const replaceDays = daysUntil(item.next_replacement_date);
  if (replaceDays !== null) {
    const cycle = item.replacement_months ? `${formatMonths(item.replacement_months)}마다 · ` : '';
    rows.push({
      key: 'replacement',
      icon: 'refresh-outline',
      label: item.replacement_item ? `${item.replacement_item} 교체` : '교체 주기',
      ...(replaceDays < 0
        ? {text: `${cycle}교체 시기 지남 (${-replaceDays}일)`, color: RED}
        : replaceDays <= 7
        ? {text: `${cycle}교체 임박 (D-${replaceDays})`, color: ORANGE}
        : {text: `${cycle}다음 교체 D-${replaceDays}`, color: GREEN}),
    });
  }

  return rows;
};

// 목록 카드에 표시할 배지 하나 (가장 급한 것)
export const getScheduleBadge = item => {
  const replaceDays = daysUntil(item.next_replacement_date);
  if (replaceDays !== null && replaceDays < 0) return item.replacement_item ? `${item.replacement_item} 교체 필요` : '교체 필요';
  const warrantyDays = daysUntil(item.warranty_date);
  if (warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 30) return `보증 임박 D-${warrantyDays}`;
  if (replaceDays !== null && replaceDays <= 7) return `교체 D-${replaceDays}`;
  return null;
};
