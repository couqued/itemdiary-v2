import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import {useIsFocused} from '@react-navigation/native';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing} from '../../constants/spacing';
import {useCalendarItems} from '../../hooks/useCalendarItems';
import {useCategories} from '../../hooks/useCategories';
import {ItemCard} from '../../components/ItemCard';
import {LoadingOverlay} from '../../components/ui/LoadingOverlay';

LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

function CalendarScreen({navigation}) {
  const isFocused = useIsFocused();
  const {markedDates, dayItems, monthTotal, loadingDots, loadingDay, fetchMonthDots, fetchDayItems} =
    useCalendarItems();
  const {getCategoryById} = useCategories();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (isFocused) {
      fetchMonthDots(currentYear, currentMonth);
    }
  }, [isFocused]);

  const onMonthChange = month => {
    setCurrentYear(month.year);
    setCurrentMonth(month.month);
    setSelectedDate(null);
    fetchMonthDots(month.year, month.month);
  };

  const onDayPress = day => {
    setSelectedDate(day.dateString);
    fetchDayItems(day.dateString);
  };

  const markedDatesWithSelected = selectedDate
    ? {
        ...markedDates,
        [selectedDate]: {
          ...(markedDates[selectedDate] || {}),
          selected: true,
          selectedColor: colors.primary,
        },
      }
    : markedDates;

  const formatMonthTotal = total => {
    if (!total) return '₩0';
    return '₩' + total.toLocaleString('ko-KR');
  };

  const formatSelectedDate = dateString => {
    if (!dateString) return '';
    const [, m, d] = dateString.split('-');
    return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일 구매 아이템`;
  };

  const goDetail = item => {
    navigation.navigate('Detail', {data: item});
  };

  const renderItem = useCallback(
    ({item}) => {
      const category = getCategoryById(item.category_id);
      return (
        <ItemCard
          item={item}
          category={category}
          isGrid={false}
          onPress={() => goDetail(item)}
        />
      );
    },
    [],
  );

  const renderHeader = () => (
    <View>
      <Calendar
        current={`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`}
        onMonthChange={onMonthChange}
        onDayPress={onDayPress}
        markedDates={markedDatesWithSelected}
        renderHeader={date => {
          const d = new Date(date);
          const year = d.getFullYear();
          const month = d.getMonth() + 1;
          return (
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarHeaderTitle}>{year}년 {month}월</Text>
              <Text style={styles.calendarHeaderTotal}>
                이달 지출: {formatMonthTotal(monthTotal)}
              </Text>
            </View>
          );
        }}
        theme={{
          backgroundColor: colors.surface,
          calendarBackground: colors.surface,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: colors.textInverse,
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.textTertiary,
          dotColor: colors.primary,
          selectedDotColor: colors.textInverse,
          arrowColor: colors.primary,
          monthTextColor: colors.text,
          indicatorColor: colors.primary,
        }}
        style={styles.calendar}
      />

      {selectedDate && (
        <View style={styles.dayHeader}>
          <Text style={styles.dayHeaderText}>{formatSelectedDate(selectedDate)}</Text>
        </View>
      )}
    </View>
  );

  const emptyText = selectedDate
    ? '이날 구매한 아이템이 없습니다'
    : '날짜를 선택하세요';

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={selectedDate ? dayItems : []}
        renderItem={renderItem}
        keyExtractor={item => String(item.seq)}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !loadingDay ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{emptyText}</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />

      {(loadingDots || loadingDay) && <LoadingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  calendar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  calendarHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  calendarHeaderTitle: {
    ...typography.h3,
    color: colors.text,
  },
  calendarHeaderTotal: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dayHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  dayHeaderText: {
    ...typography.captionBold,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
  },
});

export default CalendarScreen;
