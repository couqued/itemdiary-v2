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

export const suggestProductInfo = async (productName) => {
  const { data, error } = await supabase.functions.invoke('suggest-product-info', {
    body: { name: productName },
  });
  return error ? null : data;
};

// 사진(base64)을 보고 물건 이름을 추정 → { name }
export const identifyItem = async (base64, mimeType) => {
  try {
    const { data, error } = await supabase.functions.invoke('identify-item', {
      body: { image: base64, mimeType: mimeType || 'image/jpeg' },
    });
    return error ? null : data;
  } catch (e) {
    return null;
  }
};
