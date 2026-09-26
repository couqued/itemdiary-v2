// AI 가 돌려주는 카테고리 이름 → 앱 카테고리 이름
export const CATEGORY_NAME_MAP = {
  '전자기기': '가전',
  '생활용품': '잡화',
  '뷰티': '잡화',
  '식품': '잡화',
  '도서': '잡화',
};

// AI 카테고리 이름으로 앱 카테고리 id 찾기 (없으면 null)
export const resolveCategoryId = (categories, aiName) => {
  if (!aiName) return null;
  const name = CATEGORY_NAME_MAP[aiName] || aiName;
  return categories.find(c => c.name === name)?.id ?? null;
};
