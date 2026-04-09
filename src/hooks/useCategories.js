import {useState, useEffect} from 'react';
import {supabase} from '../lib/supabase';

const DEFAULT_CATEGORIES = [
  {id: 1, name: '의류', color: '#8B5CF6', icon: 'shirt-outline', sort_order: 0},
  {id: 2, name: '신발', color: '#EC4899', icon: 'walk-outline', sort_order: 1},
  {id: 3, name: '가방', color: '#F59E0B', icon: 'briefcase-outline', sort_order: 2},
  {id: 4, name: '가전', color: '#3B82F6', icon: 'tv-outline', sort_order: 3},
  {id: 5, name: '가구', color: '#10B981', icon: 'bed-outline', sort_order: 4},
  {id: 6, name: '잡화', color: '#6B7280', icon: 'grid-outline', sort_order: 5},
  {id: 7, name: '기타', color: '#9CA3AF', icon: 'ellipsis-horizontal-outline', sort_order: 6},
];

let cachedCategories = null;

export function useCategories() {
  const [categories, setCategories] = useState(cachedCategories || DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(!cachedCategories);

  useEffect(() => {
    if (cachedCategories) return;

    const fetchCategories = async () => {
      try {
        const {data, error} = await supabase
          .from('categories')
          .select('*')
          .order('sort_order', {ascending: true});

        if (!error && data && data.length > 0) {
          cachedCategories = data;
          setCategories(data);
        } else {
          cachedCategories = DEFAULT_CATEGORIES;
        }
      } catch {
        cachedCategories = DEFAULT_CATEGORIES;
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const getCategoryById = id => {
    return categories.find(c => c.id === id) || null;
  };

  return {categories, loading, getCategoryById};
}
