import {useState, useCallback, useRef} from 'react';
import {Alert} from 'react-native';
import {supabase} from '../lib/supabase';

const PAGE_SIZE = 20;

export function useItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pageRef = useRef(0);
  const hasMoreRef = useRef(true);

  const buildQuery = (query, {sortBy = 'created_at', sortAsc = false, categoryId, search, isWishlist = false, aiFilter} = {}) => {
    query = query.eq('is_wishlist', isWishlist);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (aiFilter) {
      // 자연어 검색: AI 가 만든 조건으로 앱이 직접 조회 (문장 자체로 이름 검색은 하지 않음)
      const today = new Date().toISOString().slice(0, 10);
      if (aiFilter.date_from) query = query.gte('item_date', aiFilter.date_from);
      if (aiFilter.date_to) query = query.lte('item_date', aiFilter.date_to);
      if (aiFilter.categoryIds?.length) query = query.in('category_id', aiFilter.categoryIds);
      if (aiFilter.price_min != null) query = query.gte('price', aiFilter.price_min);
      if (aiFilter.price_max != null) query = query.lte('price', aiFilter.price_max);
      if (aiFilter.warranty === 'active') query = query.gte('warranty_date', today);
      if (aiFilter.warranty === 'expired') query = query.lt('warranty_date', today);
      if (aiFilter.has_replacement) query = query.not('next_replacement_date', 'is', null);
      if (aiFilter.keyword) query = query.ilike('name', `%${aiFilter.keyword}%`);
    } else if (search) {
      query = query.ilike('name', `%${search}%`);
    }
    query = query.order(sortBy, {ascending: sortAsc});
    return query;
  };

  const fetchItems = useCallback(async (options = {}) => {
    setLoading(true);
    try {
      let query = supabase.from('items').select('*');
      query = buildQuery(query, options);
      query = query.range(0, PAGE_SIZE - 1);

      const {data, error} = await query;

      if (error) {
        Alert.alert('', '조회에 실패하였습니다.', [{text: '확인'}]);
        return;
      }

      setItems(data || []);
      pageRef.current = 1;
      hasMoreRef.current = (data || []).length === PAGE_SIZE;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async (options = {}) => {
    if (!hasMoreRef.current || loading) return;

    setLoading(true);
    try {
      const from = pageRef.current * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from('items').select('*');
      query = buildQuery(query, options);
      query = query.range(from, to);

      const {data, error} = await query;

      if (error) return;

      const newData = data || [];
      setItems(prev => [...prev, ...newData]);
      pageRef.current += 1;
      hasMoreRef.current = newData.length === PAGE_SIZE;
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const refresh = useCallback(async (options = {}) => {
    setRefreshing(true);
    await fetchItems(options);
    setRefreshing(false);
  }, [fetchItems]);

  return {
    items,
    loading,
    refreshing,
    hasMore: hasMoreRef.current,
    fetchItems,
    fetchMore,
    refresh,
  };
}
