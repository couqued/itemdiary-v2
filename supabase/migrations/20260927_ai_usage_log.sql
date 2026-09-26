-- AI 호출 기록과 모델별 한도 (Supabase 콘솔 → SQL Editor 에서 실행, 여러 번 실행해도 안전)
-- 앱의 "테스트 메뉴 → AI 사용 현황"에서 사용

-- 1) AI 호출 기록: Edge Function 이 Gemini 를 부를 때마다 한 줄 (재시도·예비 모델 포함)
CREATE TABLE IF NOT EXISTS ai_call_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fn TEXT NOT NULL,        -- suggest-product-info | identify-item | ai-assist
  task TEXT,               -- ai-assist 의 작업 (receipt, repair ...)
  model TEXT NOT NULL,
  status INT NOT NULL,     -- Gemini 응답 코드 (200 성공, 429 한도 초과, 503 과부하, 404 없는 모델)
  ok BOOLEAN NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_call_log_created_at_idx ON ai_call_log (created_at);
ALTER TABLE ai_call_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ai call insert" ON ai_call_log;
CREATE POLICY "own ai call insert" ON ai_call_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "own ai call read" ON ai_call_log;
CREATE POLICY "own ai call read" ON ai_call_log FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2) 모델별 무료 한도 (설정값). Google 은 계정마다 한도가 달라 API 로 알려주지 않는다.
--    AI Studio → Rate limit (https://aistudio.google.com/rate-limit) 에서 실제 값을 확인해 고쳐주세요.
CREATE TABLE IF NOT EXISTS ai_model_limits (
  model TEXT PRIMARY KEY,
  rpm INT,   -- 분당 호출 수
  rpd INT,   -- 하루 호출 수 (미국 태평양 시간 자정 초기화)
  note TEXT
);
ALTER TABLE ai_model_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai limits read" ON ai_model_limits;
CREATE POLICY "ai limits read" ON ai_model_limits FOR SELECT TO authenticated USING (true);
INSERT INTO ai_model_limits (model, rpm, rpd, note) VALUES
  ('gemini-3.5-flash-lite', 15, 1000, '추정값 - AI Studio 에서 확인 후 수정'),
  ('gemini-3.8-flash', 10, 1500, '추정값 - AI Studio 에서 확인 후 수정')
ON CONFLICT (model) DO NOTHING;

-- 3) 오늘 모델별 사용 현황 (한도는 프로젝트 전체 기준이라 모든 사용자 합계)
--    "오늘" = 미국 태평양 시간 기준 (Gemini 하루 한도 초기화 기준과 같게)
CREATE OR REPLACE FUNCTION public.get_ai_usage_today()
RETURNS TABLE (
  model TEXT,
  calls BIGINT,          -- 오늘 호출 (성공 + 실패)
  succeeded BIGINT,
  rate_limited BIGINT,   -- 429 한도 초과
  other_failed BIGINT,
  last_minute BIGINT,    -- 최근 1분 호출
  my_calls BIGINT,       -- 오늘 내 호출
  rpm INT,
  rpd INT,
  day_start TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT (date_trunc('day', now() AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Los_Angeles') AS day_start
  ),
  models AS (
    SELECT model FROM ai_model_limits
    UNION
    SELECT DISTINCT l.model FROM ai_call_log l, bounds b WHERE l.created_at >= b.day_start
  )
  SELECT
    m.model,
    count(l.id) AS calls,
    count(l.id) FILTER (WHERE l.ok) AS succeeded,
    count(l.id) FILTER (WHERE l.status = 429) AS rate_limited,
    count(l.id) FILTER (WHERE NOT l.ok AND l.status <> 429) AS other_failed,
    count(l.id) FILTER (WHERE l.created_at >= now() - interval '1 minute') AS last_minute,
    count(l.id) FILTER (WHERE l.user_id = auth.uid()) AS my_calls,
    lim.rpm,
    lim.rpd,
    (SELECT day_start FROM bounds)
  FROM models m
  LEFT JOIN ai_call_log l ON l.model = m.model AND l.created_at >= (SELECT day_start FROM bounds)
  LEFT JOIN ai_model_limits lim ON lim.model = m.model
  GROUP BY m.model, lim.rpm, lim.rpd
  ORDER BY calls DESC, m.model;
$$;
REVOKE ALL ON FUNCTION public.get_ai_usage_today() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_today() TO authenticated;
