// 영수증·결제내역에서 읽은 글자의 개인정보를 AI 로 보내기 전에 가린다 (기기 안에서만 동작)
//
// 가리는 것: 이름·주소·전화·이메일·카드번호·주문/승인/계좌 번호 등
// 남기는 것: 상품명·금액·날짜·가게 이름·사업자등록번호(가게 식별용, 개인정보 아님)
//
// 한계: 라벨 없이 이름만 적힌 줄은 못 잡을 수 있어서, 화면에서 사용자가 줄을 눌러 더 가릴 수 있게 한다.

export const MASK = {
  name: '[이름]',
  address: '[주소]',
  phone: '[전화]',
  email: '[이메일]',
  card: '[카드]',
  number: '[번호]',
};

// "라벨: 값" 형태에서 값을 가리는 라벨들 (같은 줄 또는 다음 줄의 값)
// 줄 맨 앞의 라벨만 인식한다 → "이름표 스티커" 같은 상품명은 건드리지 않음
const label = words => new RegExp(`^\\s*(${words})(?=\\s|[:：]|$)`);
const LABELS = [
  {type: 'name', re: label('받는\\s?분|받는\\s?사람|수령인|수취인|주문자|구매자|고객명|예금주|성명|이름')},
  {type: 'address', re: label('배송지|배송\\s?주소|받는\\s?주소|주소')},
  {type: 'phone', re: label('연락처|전화번호|휴대폰|핸드폰|휴대전화|전화')},
  {type: 'number', re: label('주문번호|승인번호|거래번호|결제번호|계좌번호|회원번호|카드번호|송장번호|운송장\\s?번호|계좌|카드\\s?승인')},
];

const SIDO = '(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주|충청|전라|경상)';
// 라벨 없이 나온 도로명·지번 주소 줄: "서울 강남구 테헤란로 123", "경기도 성남시 분당구 정자동 1"
const ADDRESS_LINE = new RegExp(`${SIDO}[^\\n]{0,12}?(시|구|군|도)\\s[^\\n]*?(로|길|동|읍|면|리)\\s?\\d`);

const PATTERNS = [
  {type: 'email', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g},
  // 카드번호: 4-4-4-4 (가려진 * 포함), 사업자번호(3-2-5)와 겹치지 않음
  {type: 'card', re: /(?:\d{4}|\*{4})[-\s](?:[\d*]{4})[-\s](?:[\d*]{4})[-\s](?:[\d*]{2,4})/g},
  // 전화: 010-1234-5678, 02-123-4567, 010-****-1234, +82 10 1234 5678
  {type: 'phone', re: /(?:\+?82[-\s]?)?0?1[016789][-.\s]?[\d*]{3,4}[-.\s]?[\d*]{4}|0\d{1,2}-[\d*]{3,4}-[\d*]{4}/g},
  // 쉼표 없는 10자리 이상 숫자 (주문번호·계좌 등). 금액은 보통 쉼표가 있어 제외된다
  {type: 'number', re: /(?<![\d,])\d{10,}(?![\d,])/g},
];

const BIZ_NO = /\b\d{3}-\d{2}-\d{5}\b/g;

// 한 줄을 가린다. labelOnly 가 있으면 앞 줄이 라벨만 있던 경우로 보고 이 줄 전체를 가린다
const maskLine = (line, pendingType) => {
  const hits = [];
  if (pendingType && line.trim()) {
    hits.push(pendingType);
    return {text: MASK[pendingType], hits, nextPending: null};
  }

  // 사업자등록번호는 잠시 보호
  const protectedBiz = [];
  let text = line.replace(BIZ_NO, m => {
    protectedBiz.push(m);
    return `\u0000${protectedBiz.length - 1}\u0000`;
  });

  let nextPending = null;
  for (const {type, re} of LABELS) {
    const m = text.match(re);
    if (!m) continue;
    const after = text.slice(m.index + m[0].length);
    const value = after.replace(/^[\s:：]+/, '');
    if (value.trim()) {
      text = `${text.slice(0, m.index + m[0].length)}${after.slice(0, after.length - value.length)}${MASK[type]}`;
      hits.push(type);
    } else {
      // "받는 분" 처럼 라벨만 있는 줄 → 다음 줄이 값
      nextPending = type;
    }
    break;
  }

  if (ADDRESS_LINE.test(text) && !text.includes(MASK.address)) {
    text = text.replace(new RegExp(`${ADDRESS_LINE.source}.*$`), MASK.address);
    hits.push('address');
  }

  for (const {type, re} of PATTERNS) {
    text = text.replace(re, () => {
      hits.push(type);
      return MASK[type];
    });
  }

  text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => protectedBiz[Number(i)]);
  return {text, hits, nextPending};
};

// 여러 줄 텍스트 → 줄 단위 결과 [{original, masked, hits}]
export const maskLines = raw => {
  const lines = String(raw || '').split(/\r?\n/);
  const out = [];
  let pending = null;
  for (const original of lines) {
    const {text, hits, nextPending} = maskLine(original, pending);
    pending = nextPending;
    out.push({original, masked: text, hits});
  }
  return out;
};

export const maskText = raw => maskLines(raw).map(l => l.masked).join('\n');
