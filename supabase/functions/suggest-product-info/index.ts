// 상품명을 보고 카테고리·보증기간·교체주기를 제안하는 Edge Function
// 요청: { name: string }
// 응답: { category, warranty_months, replacement_months, has_filter, reason }
//
// 필요한 시크릿: GEMINI_API_KEY
// 선택 시크릿: GEMINI_MODEL (기본 gemini-3.6-flash), GEMINI_FALLBACK_MODEL (기본 gemini-2.5-flash)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
// 앞 모델이 과부하·한도 초과면 다음 모델로 넘어간다
const MODELS = [
  Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.6-flash',
  Deno.env.get('GEMINI_FALLBACK_MODEL') ?? 'gemini-2.5-flash',
]
// 잠시 뒤 다시 시도하면 풀릴 수 있는 오류 (한도 초과·서버 오류·과부하)
const RETRYABLE = [429, 500, 503]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 모델마다 최대 2번(재시도 1번) 시도하고, 모두 실패하면 마지막 오류를 돌려준다
async function generate(body: unknown) {
  let last: { status: number; data: unknown } = { status: 500, data: null }
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY ?? '' },
          body: JSON.stringify(body),
        },
      )
      const data = await res.json().catch(() => null)
      if (res.ok) return { ok: true as const, data, model }
      last = { status: res.status, data }
      console.error('Gemini error', model, res.status, JSON.stringify(data))
      if (!RETRYABLE.includes(res.status)) return { ok: false as const, ...last }
      if (attempt === 0) await sleep(1200)
    }
  }
  return { ok: false as const, ...last }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!GEMINI_API_KEY) return json({ error: 'GEMINI_API_KEY 가 설정되지 않았습니다.' }, 500)

  try {
    const { name } = await req.json()
    if (!name || typeof name !== 'string') {
      return json({ error: '상품명이 없습니다' }, 400)
    }
    // 앱의 제목 칸은 20자, 공유로 들어온 긴 상품명도 있어 100자로 제한
    const productName = name.trim().slice(0, 100)

    const prompt = `다음 상품명을 보고 JSON으로만 답해줘. 다른 텍스트 없이 JSON만 출력해.
상품명: "${productName}"

응답 형식:
{
  "category": "가전",
  "warranty_months": 24,
  "replacement_months": 0,
  "has_filter": false,
  "reason": "가전제품 기본 2년 보증"
}

category는 의류/신발/가방/가전/가구/잡화/전자기기/식품/도서/뷰티/생활용품/기타 중 하나.
warranty_months는 일반적인 보증기간(개월), 없으면 0.
replacement_months는 교체주기(개월), 해당없으면 0.
has_filter는 필터 등 소모품 여부.`

    const result = await generate({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    })

    if (!result.ok) {
      return json({ error: 'Gemini API 오류', detail: result.data }, result.status === 429 ? 429 : 503)
    }

    const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return json({ error: 'LLM 응답 파싱 실패', raw: text }, 500)
    }

    return json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
