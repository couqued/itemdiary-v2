// 비슷한 물건 찾기 (AI 사용 안 함 — 기기 안에서 이름·카테고리로 계산)
//
// 같은 카테고리에서 이름의 핵심 단어가 겹치거나, 한 이름이 다른 이름을 포함하면 "비슷한 물건"으로 본다.
// 카테고리가 다르면 이름이 거의 같을 때(포함 관계)만 비슷하다고 본다.
import {supabase} from './supabase';

// 너무 흔해서 비교에 도움이 안 되는 단어
const STOPWORDS = new Set([
  '세트', '정품', '신형', '최신', '국내', '공식', '무료배송', '블랙', '화이트', '그레이', '실버',
  '개', '입', '팩', '박스', 'the', 'new', 'set', 'pro', 'plus', 'max', 'mini',
  // 물건 종류가 아니라 특징을 말하는 흔한 수식어 ("무선 청소기"와 "무선 마우스"는 비슷하지 않다)
  '프로', '플러스', '맥스', '미니', '무선', '유선', '휴대용', '스마트', '전기', '전동', '대용량', '소형', '대형',
]);

export const tokenize = name =>
  String(name || '')
    .toLowerCase()
    .replace(/[\[\](){}·,./\\|_+\-]/g, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length >= 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));

const compact = s => String(s || '').toLowerCase().replace(/\s+/g, '');

// 순수 함수: 후보 목록에서 비슷한 물건 찾기 (테스트 가능)
export const findSimilar = ({name, categoryId, excludeSeq, candidates, limit = 3}) => {
  const tokens = tokenize(name);
  const whole = compact(name);
  if (whole.length < 2) return [];
  return candidates
    .filter(c => c.seq !== excludeSeq && c.name)
    .map(c => {
      const other = compact(c.name);
      const contains = whole.length >= 2 && other.length >= 2 && (other.includes(whole) || whole.includes(other));
      const shared = tokenize(c.name).filter(t => tokens.includes(t)).length;
      const sameCategory = categoryId != null && c.category_id === categoryId;
      const score = (contains ? 3 : 0) + shared * 2 + (sameCategory ? 1 : 0);
      const similar = contains || (sameCategory && shared >= 1);
      return {item: c, score, similar};
    })
    .filter(x => x.similar)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.item);
};

// DB 에서 내 물건을 읽어 비슷한 물건 찾기
// includeWishlist=false 면 이미 가진 물건만 (찜 결정 도우미에서 사용)
export const fetchSimilarItems = async ({name, categoryId, excludeSeq, includeWishlist = true, limit = 3}) => {
  if (!name || name.trim().length < 2) return [];
  const {
    data: {user},
  } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase
    .from('items')
    .select('*')
    .eq('user_id', user.email)
    .order('created_at', {ascending: false})
    .limit(500);
  if (!includeWishlist) query = query.eq('is_wishlist', false);
  const {data, error} = await query;
  if (error || !data) return [];
  return findSimilar({name, categoryId, excludeSeq, candidates: data, limit});
};
