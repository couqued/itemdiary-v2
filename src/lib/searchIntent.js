// 자연어 검색 도우미
// - looksLikeSentence: 입력이 "조건을 담은 문장"처럼 보이는지 기기 안에서 판단 (AI 사용 안 함)
//   → 맞으면 「✨ AI로 찾기」 버튼만 보여준다. AI 는 버튼을 눌렀을 때만 부른다.
// - conditionChips: AI 가 만든 검색 조건 → 화면에 보여줄 칩 (칩마다 지울 조건 키)

// 조건을 나타내는 단어 (시간·관리 상태·가격·말투)
const CONDITION_WORDS = [
  /작년|올해|올\s?해|지난\s?(달|해|주)|이번\s?(달|해)|최근|요즘|오래된|예전|\d{4}\s?년|\d{1,2}\s?월|\d+\s?(년|개월|달)\s?(전|넘|이상|이내)/,
  /보증|만료|교체|소모품|배터리|필터|점검/,
  /이상|이하|미만|초과|만\s?원|천\s?원|비싼|저렴|싼\s|가격대/,
  /(산|샀던|샀는|구입한|구매한|받은|찜한)\s?(거|것|물건|제품)|인\s?(거|것)|중에|중에서|남은|안\s?쓰는/,
];

export const looksLikeSentence = (text, {nameResultCount = null} = {}) => {
  const q = String(text || '').trim();
  if (q.length < 3) return false;
  if (CONDITION_WORDS.some(re => re.test(q))) return true;
  // 세 단어 이상인데 이름 검색 결과가 없으면 문장으로 본다 ("맥북 에어 M3"처럼 결과가 있으면 상품명)
  const words = q.split(/\s+/).filter(Boolean);
  return words.length >= 3 && nameResultCount === 0;
};

const fmt = d => (d ? d.replace(/-/g, '.') : '');

// AI 조건 → 칩 [{key, label}] (key 는 지울 때 비울 조건)
export const conditionChips = (c, categoryName = id => id) => {
  if (!c) return [];
  const chips = [];
  if (c.date_from || c.date_to) {
    const fullYear =
      c.date_from && c.date_to && c.date_from.slice(0, 4) === c.date_to.slice(0, 4) &&
      c.date_from.endsWith('-01-01') && c.date_to.endsWith('-12-31');
    chips.push({
      key: 'date',
      label: fullYear ? `${c.date_from.slice(0, 4)}년 구입` : `${fmt(c.date_from) || '처음'} ~ ${fmt(c.date_to) || '지금'} 구입`,
    });
  }
  (c.categoryIds || []).forEach(id => chips.push({key: `cat:${id}`, label: categoryName(id)}));
  if (c.price_min != null || c.price_max != null) {
    const won = n => (n >= 10000 ? `${Math.round(n / 10000)}만원` : `${n}원`);
    chips.push({
      key: 'price',
      label: c.price_min != null && c.price_max != null ? `${won(c.price_min)}~${won(c.price_max)}` : c.price_min != null ? `${won(c.price_min)} 이상` : `${won(c.price_max)} 이하`,
    });
  }
  if (c.warranty === 'active') chips.push({key: 'warranty', label: '보증 남음'});
  if (c.warranty === 'expired') chips.push({key: 'warranty', label: '보증 끝남'});
  if (c.has_replacement) chips.push({key: 'has_replacement', label: '소모품 교체 있음'});
  if (c.keyword) chips.push({key: 'keyword', label: `"${c.keyword}"`});
  return chips;
};

// 칩 하나 지우기
export const removeCondition = (c, key) => {
  const next = {...c};
  if (key === 'date') {
    next.date_from = null;
    next.date_to = null;
  } else if (key.startsWith('cat:')) {
    next.categoryIds = (c.categoryIds || []).filter(id => `cat:${id}` !== key);
  } else if (key === 'price') {
    next.price_min = null;
    next.price_max = null;
  } else {
    next[key] = null;
  }
  return conditionChips(next).length ? next : null;
};
