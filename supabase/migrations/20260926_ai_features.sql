-- AI 기능 확장 (Supabase 콘솔 → SQL Editor 에서 실행, 여러 번 실행해도 안전)

-- 찜 결정 도우미: 찜할 때 적는 "갖고 싶은 이유"
ALTER TABLE items ADD COLUMN IF NOT EXISTS wish_reason TEXT;

-- AI 사용량: 사용자당 하루 호출 수 (ai-assist 함수가 기록, Gemini 무료 한도 보호)
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID NOT NULL DEFAULT auth.uid(),
  day DATE NOT NULL DEFAULT current_date,
  count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ai usage read" ON ai_usage;
CREATE POLICY "own ai usage read" ON ai_usage FOR SELECT USING (auth.uid() = user_id);

-- 호출 1회 기록 후 오늘 누적 횟수를 돌려준다 (본인 행만, 원자적으로 증가)
CREATE OR REPLACE FUNCTION public.use_ai_quota()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO ai_usage (user_id, day, count)
  VALUES (auth.uid(), current_date, 1)
  ON CONFLICT (user_id, day) DO UPDATE SET count = ai_usage.count + 1
  RETURNING count INTO c;
  RETURN c;
END;
$$;
REVOKE ALL ON FUNCTION public.use_ai_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_ai_quota() TO authenticated;
