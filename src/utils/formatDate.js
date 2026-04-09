import {format} from 'date-fns';
import {ko} from 'date-fns/locale';

function safeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function formatDateKo(date) {
  const d = safeDate(date);
  if (!d) return '';
  return format(d, 'PPP', {locale: ko});
}

export function formatDateISO(date) {
  const d = safeDate(date);
  if (!d) return '';
  return format(d, 'yyyy-MM-dd');
}

export function formatDateShort(date) {
  const d = safeDate(date);
  if (!d) return '';
  return format(d, 'yyyy.MM.dd');
}
