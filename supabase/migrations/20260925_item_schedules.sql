-- 관리 일정 컬럼 추가 (Supabase 콘솔 → SQL Editor 에서 실행)
-- replacement_months, next_replacement_date 는 v1.5 에서 이미 추가됨 (IF NOT EXISTS 로 안전하게 재실행 가능)

ALTER TABLE items ADD COLUMN IF NOT EXISTS battery_check_date DATE;      -- 배터리 점검/교체 예정일
ALTER TABLE items ADD COLUMN IF NOT EXISTS replacement_months INTEGER;   -- 소모품 교체 주기 (개월)
ALTER TABLE items ADD COLUMN IF NOT EXISTS next_replacement_date DATE;   -- 다음 교체 예정일
ALTER TABLE items ADD COLUMN IF NOT EXISTS replacement_item TEXT;        -- 교체할 소모품 이름 (예: 정수기 필터)
ALTER TABLE items ADD COLUMN IF NOT EXISTS notify_muted BOOLEAN NOT NULL DEFAULT false; -- 물건별 알림 끄기
