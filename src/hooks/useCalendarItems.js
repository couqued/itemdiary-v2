import {useState, useCallback} from 'react';
import {Alert} from 'react-native';
import {supabase} from '../lib/supabase';

export function useCalendarItems() {
  const [markedDates, setMarkedDates] = useState({});
  const [dayItems, setDayItems] = useState([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loadingDots, setLoadingDots] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);

  const fetchMonthDots = useCallback(async (year, month) => {
    try {
      const mm = String(month).padStart(2, '0');
      const firstDay = `${year}-${mm}-01`;
      const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

      const {data, error} = await supabase
        .from('items')
        .select('item_date, price')
        .eq('is_wishlist', false)
        .gte('item_date', firstDay)
        .lte('item_date', lastDay);

      if (error) {
        Alert.alert('', '캘린더 데이터 조회에 실패하였습니다.', [{text: '확인'}]);
        return;
      }

      const dots = {};
      let total = 0;

      (data || []).forEach(item => {
        if (item.item_date) {
          dots[item.item_date] = {marked: true, dotColor: '#3B82F6'};
        }
        total += item.price || 0;
      });

      setMarkedDates(dots);
      setMonthTotal(total);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchDayItems = useCallback(async dateString => {
    setLoadingDay(true);
    try {
      const {data, error} = await supabase
        .from('items')
        .select('*')
        .eq('is_wishlist', false)
        .eq('item_date', dateString)
        .order('created_at', {ascending: false});

      if (error) {
        Alert.alert('', '데이터 조회에 실패하였습니다.', [{text: '확인'}]);
        return;
      }

      setDayItems(data || []);
    } finally {
      setLoadingDay(false);
    }
  }, []);

  return {
    markedDates,
    dayItems,
    monthTotal,
    loadingDots,
    loadingDay,
    fetchMonthDots,
    fetchDayItems,
  };
}
