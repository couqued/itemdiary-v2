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

  const buildQuery = (query, {sortBy = 'created_at', sortAsc = false, categoryId, search} = {}) => {
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (search) {
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
    fetchItems,
    fetchMore,
    refresh,
  };
}
