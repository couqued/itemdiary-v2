import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

const SUPABASE_URL = Config.SUPABASE_URL;
const SUPABASE_ANON_KEY = Config.SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// clean: true 이면 쇼핑몰 제목에서 광고 문구를 뺀 clean_name 도 받는다 (공유하기)
export const suggestProductInfo = async (productName, {clean = false} = {}) => {
  const { data, error } = await supabase.functions.invoke('suggest-product-info', {
    body: { name: productName, clean },
  });
  return error ? null : data;
};

// 사진(base64)을 보고 물건 이름·카테고리·보증을 추정
// → { data } 성공 / { error: 'timeout' | 'network' | 'server' } 실패
const IDENTIFY_TIMEOUT_MS = 30000;
const SUPPORTED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const identifyItem = async (base64, mimeType) => {
  const mime = SUPPORTED_MIME.includes(mimeType) ? mimeType : 'image/jpeg';
  let timer;
  try {
    const request = supabase.functions.invoke('identify-item', {
      body: { image: base64, mimeType: mime },
    });
    const timeout = new Promise(resolve => {
      timer = setTimeout(() => resolve({ timedOut: true }), IDENTIFY_TIMEOUT_MS);
    });
    const res = await Promise.race([request, timeout]);
    if (res.timedOut) return { error: 'timeout' };
    if (res.error) return { error: res.error.context?.status ? 'server' : 'network' };
    return { data: res.data };
  } catch (e) {
    return { error: 'network' };
  } finally {
    clearTimeout(timer);
  }
};
