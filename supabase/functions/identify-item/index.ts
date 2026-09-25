// 사진을 보고 물건 이름을 추정하는 Edge Function
// 요청: { image: base64 문자열, mimeType?: "image/jpeg" }
// 응답: { name: string }  (알아볼 수 없으면 name 은 빈 문자열)
//
// 필요한 시크릿: GEMINI_API_KEY (suggest-product-info 와 같은 키)
// 선택 시크릿: GEMINI_MODEL (기본 gemini-3.6-flash), GEMINI_FALLBACK_MODEL (기본 gemini-2.5-flash)

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// 앞 모델이 과부하·한도 초과면 다음 모델로 넘어간다
const MODELS = [
  Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash',
  Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-2.5-flash',
];
// 잠시 뒤 다시 시도하면 풀릴 수 있는 오류 (한도 초과·서버 오류·과부하)
const RETRYABLE = [429, 500, 503];
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// 모델마다 최대 2번(재시도 1번) 시도하고, 모두 실패하면 마지막 오류를 돌려준다
async function generate(body: unknown) {
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
      if (res.ok) return {ok: true as const, data: await res.json()};
      lastStatus = res.status;
      console.error('Gemini error', model, res.status, await res.text());
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
- 브랜드나 모델명이 사진에서 확실히 보이면 포함하고, 보이지 않으면 추측하지 말고 일반 이름으로 써.
- 한국어로, 20자 이내로. 예: "로지텍 MX Master 3S", "무선 마우스", "원목 식탁 의자"
- 물건을 알아볼 수 없으면 name 을 빈 문자열로.
JSON 으로만 답해: {"name": "..."}`;

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
    });

    if (!result.ok) {
      return json({error: '이미지 분석에 실패했습니다.'}, result.status === 429 ? 429 : 503);
    }

    const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    let name = '';
    try {
      name = String(JSON.parse(text)?.name ?? '').trim().slice(0, 20);
    } catch {
      name = '';
    }
    return json({name});
  } catch (e) {
    console.error(e);
    return json({error: '잘못된 요청입니다.'}, 400);
  }
});
