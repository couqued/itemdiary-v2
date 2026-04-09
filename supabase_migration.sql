-- 카테고리 테이블 (신규)
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 카테고리 시드 데이터
INSERT INTO categories (name, color, icon, sort_order) VALUES
  ('의류', '#8B5CF6', 'shirt-outline', 0),
  ('신발', '#EC4899', 'walk-outline', 1),
  ('가방', '#F59E0B', 'briefcase-outline', 2),
  ('가전', '#3B82F6', 'tv-outline', 3),
  ('가구', '#10B981', 'bed-outline', 4),
  ('잡화', '#6B7280', 'grid-outline', 5),
  ('기타', '#9CA3AF', 'ellipsis-horizontal-outline', 6)
ON CONFLICT DO NOTHING;

-- items 테이블에 컬럼 추가 (non-breaking)
ALTER TABLE items ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
ALTER TABLE items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RLS: categories는 authenticated 전체 READ
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_read_all" ON categories
  FOR SELECT
  TO authenticated
  USING (true);

-- items 기존 RLS 정책 유지 (변경 없음)
