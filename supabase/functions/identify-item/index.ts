// 사진을 보고 물건 이름·카테고리·보증·교체주기를 한 번에 추정하는 Edge Function
// 요청: { image: base64 문자열, mimeType?: "image/jpeg" }
// 응답: { name, category, warranty_months, replacement_months, has_filter }
//       (알아볼 수 없으면 name 은 빈 문자열) — 앱은 이 응답으로 제목과 AI 제안을 함께 채운다
//
// 필요한 시크릿: GEMINI_API_KEY (suggest-product-info 와 같은 키)
// 선택 시크릿: GEMINI_MODEL (기본 gemini-3.5-flash-lite), GEMINI_FALLBACK_MODEL (기본 gemini-3.8-flash)
// 무료 한도는 모델마다 따로 계산되므로 기본·예비를 서로 다른 모델로 둔다

import {createClient} from 'npm:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// 앞 모델이 과부하·한도 초과면 다음 모델로 넘어간다
const MODELS = [
  Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite',
  Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-3.8-flash',
];
// 잠시 뒤 다시 시도하면 풀릴 수 있는 오류 (한도 초과·서버 오류·과부하)
const RETRYABLE = [429, 500, 503];
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

// 모델마다 최대 2번(재시도 1번) 시도하고, 모두 실패하면 마지막 오류를 돌려준다
async function generate(body: unknown, log: Logger = async () => {}) {
  let lastStatus = 500;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? ''},
          body: JSON.stringify(body),
        },
      );
      await log(model, res.status);
      if (res.ok) return {ok: true as const, data: await res.json()};
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

// 앱에서 800px 로 줄여 보내므로 보통 300KB 이하. 비정상적으로 큰 요청은 거절
const MAX_BASE64_LENGTH = 2_000_000;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PROMPT = `사진 속 중심 물건이 무엇인지 알려줘.
- name: 브랜드나 모델명이 사진에서 확실히 보이면 포함하고, 보이지 않으면 추측하지 말고 일반 이름으로.
  한국어 20자 이내. 예: "로지텍 MX Master 3S", "무선 마우스", "원목 식탁 의자". 알아볼 수 없으면 빈 문자열.
- category: 의류/신발/가방/가전/전자기기/가구/잡화/생활용품/뷰티/식품/도서/기타 중 하나.
- warranty_months: 일반적인 보증기간(개월), 없으면 0.
- replacement_months: 이 물건에 딸린 "소모품"(필터, 칫솔모, 건전지, 카트리지 등)을 갈아야 하는 주기(개월).
  물건 자체를 새로 사는 시기·수명은 넣지 마. 노트북·태블릿·스마트폰·이어폰·TV처럼 갈아 끼우는 소모품이 없으면 0.
- has_filter: 사용자가 갈아 끼우는 필터 등 소모품이 있으면 true.
JSON 으로만 답해: {"name":"","category":"","warranty_months":0,"replacement_months":0,"has_filter":false}`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
  if (!GEMINI_API_KEY) return json({error: 'GEMINI_API_KEY 가 설정되지 않았습니다.'}, 500);

  try {
    const {image, mimeType = 'image/jpeg'} = await req.json();
    if (typeof image !== 'string' || image.length === 0 || image.length > MAX_BASE64_LENGTH) {
      return json({error: '이미지가 없거나 너무 큽니다.'}, 400);
    }
    if (!ALLOWED_MIME.includes(mimeType)) {
      return json({error: '지원하지 않는 이미지 형식입니다.'}, 400);
    }

    const result = await generate({
      contents: [{parts: [{inline_data: {mime_type: mimeType, data: image}}, {text: PROMPT}]}],
      generationConfig: {responseMimeType: 'application/json', temperature: 0.2},
    }, makeLogger(req, 'identify-item'));

    if (!result.ok) {
      return json({error: '이미지 분석에 실패했습니다.'}, result.status === 429 ? 429 : 503);
    }

    const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) ?? {};
    } catch {
      parsed = {};
    }
    const n = (v: unknown) => (typeof v === 'number' && v > 0 ? Math.round(v) : 0);
    return json({
      name: String(parsed.name ?? '').trim().slice(0, 20),
      category: String(parsed.category ?? '').trim(),
      warranty_months: n(parsed.warranty_months),
      replacement_months: n(parsed.replacement_months),
      has_filter: parsed.has_filter === true,
    });
  } catch (e) {
    console.error(e);
    return json({error: '잘못된 요청입니다.'}, 400);
  }
});
