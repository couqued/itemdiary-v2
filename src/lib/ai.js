// AI 도우미(ai-assist Edge Function) 호출
// 버튼을 눌렀을 때만 부른다. 사용자당 하루 사용량이 넘으면 {error: 'quota'} 를 돌려준다.
import {supabase} from './supabase';

export const AI_ERROR_MESSAGE = {
  quota: '오늘 AI 사용량을 모두 썼어요. 내일 다시 시도해주세요.',
  default: 'AI 응답을 받지 못했어요. 잠시 후 다시 시도해주세요.',
};

export const callAi = async (task, input) => {
  try {
    const {data, error} = await supabase.functions.invoke('ai-assist', {body: {task, input}});
    if (!error) return {data};
    // FunctionsHttpError 는 응답 본문을 context 로 들고 있다
    const status = error.context?.status;
    if (status === 429) return {error: 'quota'};
    return {error: 'default'};
  } catch (e) {
    return {error: 'default'};
  }
};

export const aiErrorText = code => AI_ERROR_MESSAGE[code] || AI_ERROR_MESSAGE.default;

// 오늘 날짜 YYYY-MM-DD (AI 에 기준일로 전달)
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
