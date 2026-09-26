// 아이템북 AI 도우미 — 버튼을 눌렀을 때 호출하는 AI 기능을 한 곳에서 처리한다
// 요청: { task, input }
//   task: receipt | repair | wish_advice | sell_post | search | year_review
// 응답: task 별 JSON (아래 TASKS 참고). 실패 시 { error }
//
// 필요한 시크릿: GEMINI_API_KEY
// 선택 시크릿: GEMINI_MODEL (기본 gemini-3.5-flash-lite), GEMINI_FALLBACK_MODEL (기본 gemini-3.8-flash),
//             AI_DAILY_LIMIT (사용자당 하루 호출 수, 기본 50)
// 무료 한도는 모델마다 따로 계산되므로 기본·예비를 서로 다른 모델로 둔다
// 기본 제공 환경변수: SUPABASE_URL, SUPABASE_ANON_KEY (사용량 기록에 사용자 토큰으로 접근)
import {createClient} from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const MODELS = [
  Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite',
  Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.8-flash',
];
const RETRYABLE = [429, 500, 503];
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? 50);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// AI 호출 기록 (앱의 "AI 사용 현황"용) — 로그인한 사용자 토큰으로 ai_call_log 에 한 줄.
// 기록 실패는 무시한다 (AI 응답에는 영향 없음)
type Logger = (model: string, status: number) => Promise<void>;
const makeLogger = (req: Request, fn: string, task: string | null = null): Logger => {
  const auth = req.headers.get('Authorization') ?? '';
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!auth || !url || !anon) return async () => {};
  const client = createClient(url, anon, {global: {headers: {Authorization: auth}}});
  return async (model, status) => {
    try {
      await client.from('ai_call_log').insert({fn, task, model, status, ok: status === 200});
    } catch (_) {
      // 무시
    }
  };
};

// 모델마다 최대 2번(재시도 1번), 과부하면 대체 모델로
async function generate(prompt: string, temperature = 0.4, log: Logger = async () => {}) {
  let lastStatus = 500;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? ''},
          body: JSON.stringify({
            contents: [{parts: [{text: prompt}]}],
            generationConfig: {responseMimeType: 'application/json', temperature},
          }),
        },
      );
      await log(model, res.status);
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const match = text.match(/[\[{][\s\S]*[\]}]/);
        if (!match) return {ok: false as const, status: 502};
        return {ok: true as const, data: JSON.parse(match[0])};
      }
      lastStatus = res.status;
      console.error('Gemini error', model, res.status, await res.text());
      // 종료되었거나 없는 모델이면 다음 모델로
      if (res.status === 404) break;
      if (!RETRYABLE.includes(res.status)) return {ok: false as const, status: lastStatus};
      if (attempt === 0) await sleep(1200);
    }
  }
  return {ok: false as const, status: lastStatus};
}

// 입력 문자열 정리 (길이 제한)
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const list = (v: unknown, max = 10, len = 60) =>
  Array.isArray(v) ? v.slice(0, max).map(x => str(x, len)).filter(Boolean) : [];

const CATEGORIES = '의류/신발/가방/가전/가구/잡화/기타';

// task 별 프롬프트 — 사실(보증 상태, 보유 물건, 지출)은 앱이 계산해서 넘기고 AI 는 정리·문장만 맡는다
const TASKS: Record<string, (input: any) => {prompt: string; temperature?: number}> = {
  // 영수증·결제내역 텍스트(개인정보는 앱에서 이미 가림) → 물건 목록
  receipt: input => ({
    temperature: 0.1,
    prompt: `아래는 영수증 또는 온라인 결제내역 화면에서 읽은 글자야. 개인정보는 [이름] [주소] 같은 표시로 가려져 있어.
구입한 물건을 찾아 JSON 으로만 답해. 오늘 날짜: ${str(input.today, 10)}

규칙:
- 같은 물건이 여러 장에 반복되면 한 번만.
- 배송비·할인·쿠폰·포인트·적립·합계·부가세 같은 줄은 is_item=false 로 넣어.
- name 은 광고 문구·옵션 코드를 빼고 20자 이내 한국어 상품명.
- price 는 그 물건의 실제 결제 금액(원, 숫자). 모르면 null.
- date 는 결제일 YYYY-MM-DD. 연도가 없으면 오늘 기준으로 추정. 모르면 null.
- store 는 쇼핑몰·가게 이름. 모르면 null.
- category 는 ${CATEGORIES} 중 하나.
- warranty_months 는 일반적인 보증기간(개월, 없으면 0).
- replacement_months 는 딸린 소모품(필터·칫솔모·건전지 등)을 갈아야 하는 주기(개월). 물건 자체의 수명·교체 시기는 넣지 말고, 갈아 끼우는 소모품이 없으면 0.

형식: {"items":[{"name":"","price":0,"quantity":1,"date":"2026-09-12","store":"","category":"가전","warranty_months":12,"replacement_months":0,"has_filter":false,"is_item":true}]}

글자:
"""
${str(input.text, 12000)}
"""`,
  }),

  // 고장 문의 도우미 — 보증 상태는 앱이 계산한 사실
  repair: input => ({
    prompt: `물건 고장·문의 도우미야. 한국어로 짧고 실용적으로, JSON 으로만 답해.
물건: ${str(input.name)} (카테고리: ${str(input.category, 20)}, 구입일: ${str(input.purchase_date, 10) || '모름'})
보증 상태(사실, 바꾸지 마): ${str(input.warranty_status, 80) || '정보 없음'}
증상: ${str(input.symptom, 500)}
${input.followup ? `이전 안내: ${str(input.previous, 800)}\n추가 질문: ${str(input.followup, 300)}` : ''}

규칙:
- checks: 사용자가 안전하게 먼저 해볼 수 있는 것 2~4개 (분해·전기 작업 권하지 말 것).
- causes: 가능한 원인 1~3개, 확정적으로 말하지 말 것.
- contact_message: 서비스센터에 보낼 문의 문구 (구입 시기, 증상, 보증 상태 포함, 3~4문장, 개인정보 넣지 말 것).
- note: 한 문장 조언 (위험하면 사용 중지 권고).
형식: {"checks":[""],"causes":[""],"contact_message":"","note":""}`,
  }),

  // 찜 결정 도우미 — 보유 물건·지출은 앱이 계산한 사실
  wish_advice: input => ({
    prompt: `찜 목록 물건을 살지 말지 결정을 돕는 조언자야. 부드럽고 짧게, 한국어 JSON 으로만 답해. 사라고 부추기지도, 무조건 말리지도 마.
물건: ${str(input.name)} / 가격: ${num(input.price) ?? '모름'}원 / 찜한 지 ${num(input.days) ?? '?'}일
갖고 싶은 이유(사용자 메모): ${str(input.reason, 200) || '없음'}
이미 가진 비슷한 물건: ${list(input.similar).join(', ') || '없음'}
이번 달 지출: ${num(input.month_spent) ?? '모름'}원

형식: {"pros":["살 이유 1~2개"],"considerations":["생각해볼 점 1~3개"],"suggestion":"한 문장 제안"}`,
  }),

  // 중고 판매 글
  sell_post: input => ({
    temperature: 0.7,
    prompt: `중고거래(당근마켓·번개장터) 판매 글을 한국어로 써줘. JSON 으로만 답해.
물건: ${str(input.name)} / 카테고리: ${str(input.category, 20)}
구입 시기: ${str(input.purchase_date, 10) || '모름'} / 보증: ${str(input.warranty_status, 80) || '정보 없음'}
상태·구성품(사용자 입력): ${str(input.condition, 300) || '없음'}
말투: ${input.tone === 'friendly' ? '친근하고 따뜻하게' : '담백하고 깔끔하게'}

규칙: 가격은 쓰지 마. 과장·허위 표현 금지. 사용자 입력에 없는 상태·구성품을 지어내지 마. 본문 4~7줄. 개인정보 넣지 말 것.
형식: {"title":"40자 이내","body":"본문"}`,
  }),

  // 자연어 검색 → 검색 조건 (실제 검색은 앱이 한다)
  search: input => ({
    temperature: 0,
    prompt: `물건 기록 앱의 검색 문장을 검색 조건으로 바꿔. JSON 으로만 답해. 오늘: ${str(input.today, 10)}
카테고리 목록: ${list(input.categories, 20, 20).join(', ') || CATEGORIES}
문장: "${str(input.query, 200)}"

조건 필드 (해당 없으면 null):
- date_from, date_to: 구입일 범위 YYYY-MM-DD ("작년"은 작년 1/1~12/31)
- categories: 위 목록 중에서만 (전자기기는 가전)
- price_min, price_max: 원
- warranty: "active"(보증 남음) | "expired"(보증 끝남) | null
- has_replacement: 소모품 교체 일정이 있는 것만이면 true
- is_wishlist: 찜 목록이면 true, 내 물건이면 false, 언급 없으면 null
- keyword: 이름에 들어갈 단어 (조건으로 표현 못 한 핵심 명사, 없으면 null)
- labels: 사용자에게 보여줄 조건 이름 배열 (예: ["2025년 구입","가전","보증 남음"])
형식: {"date_from":null,"date_to":null,"categories":null,"price_min":null,"price_max":null,"warranty":null,"has_replacement":null,"is_wishlist":null,"keyword":null,"labels":[]}`,
  }),

  // 연말 결산 한 줄
  year_review: input => ({
    temperature: 0.8,
    prompt: `물건 기록 앱의 ${num(input.year) ?? ''}년 결산 화면 맨 위에 들어갈 한 줄 요약을 써줘. 따뜻하고 재치 있게, 한국어 30자 이내. JSON 으로만 답해.
통계: ${JSON.stringify(input.stats ?? {}).slice(0, 1500)}
형식: {"headline":""}`,
  }),
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
  if (!GEMINI_API_KEY) return json({error: 'GEMINI_API_KEY 가 설정되지 않았습니다.'}, 500);

  try {
    const {task, input} = await req.json();
    const build = TASKS[task];
    if (!build) return json({error: '알 수 없는 작업입니다.'}, 400);

    // 사용자당 하루 사용량 제한 (로그인한 사용자 토큰으로 기록)
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {headers: {Authorization: authHeader}},
    });
    const {data: used, error: quotaError} = await supabase.rpc('use_ai_quota');
    if (quotaError) {
      console.error('quota error', quotaError);
      return json({error: '로그인이 필요합니다.'}, 401);
    }
    if (used > DAILY_LIMIT) return json({error: 'quota', limit: DAILY_LIMIT}, 429);

    const {prompt, temperature} = build(input ?? {});
    const result = await generate(prompt, temperature, makeLogger(req, 'ai-assist', task));
    if (!result.ok) return json({error: 'AI 응답을 받지 못했어요.'}, result.status === 429 ? 429 : 503);
    return json(result.data);
  } catch (e) {
    console.error(e);
    return json({error: '잘못된 요청입니다.'}, 400);
  }
});
