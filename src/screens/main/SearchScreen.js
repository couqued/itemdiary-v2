import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {Calendar, LocaleConfig} from 'react-native-calendars';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {useIsFocused} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
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

function SearchScreen({navigation}) {
  const isFocused = useIsFocused();
  const {markedDates, dayItems, monthTotal, loadingDots, loadingDay, fetchMonthDots, fetchDayItems} =
    useCalendarItems();
  const {getCategoryById} = useCategories();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);

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

  const showPicker = () => setPickerVisible(true);
  const hidePicker = () => setPickerVisible(false);

  const onPickerConfirm = date => {
    hidePicker();
    setTimeout(() => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      setCurrentYear(year);
      setCurrentMonth(month);
      setSelectedDate(null);
      fetchMonthDots(year, month);
    }, 100);
  };

  const isTodayMonth =
    currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;

  const goToToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setCurrentYear(y);
    setCurrentMonth(m);
    setSelectedDate(null);
    fetchMonthDots(y, m);
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
    [getCategoryById],
  );

  const emptyText = selectedDate
    ? '이날 구매한 아이템이 없습니다'
    : '날짜를 선택하세요';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stickyHeader}>
        <Calendar
          key={`${currentYear}-${currentMonth}`}
          current={`${currentYear}-${String(currentMonth).padStart(2, '0')}-01`}
          onMonthChange={onMonthChange}
          onDayPress={onDayPress}
          markedDates={markedDatesWithSelected}
          renderHeader={() => (
            <View style={styles.calendarHeader}>
              <Pressable onPress={showPicker} style={styles.titleContainer}>
                <Text style={styles.calendarHeaderTitle}>{currentYear}년 {currentMonth}월</Text>
              </Pressable>
              <Text style={styles.calendarHeaderTotal}>
                이달 지출: {formatMonthTotal(monthTotal)}
              </Text>
            </View>
          )}
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

      <FlatList
        data={selectedDate ? dayItems : []}
        renderItem={renderItem}
        keyExtractor={item => String(item.seq)}
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

      {!isTodayMonth && (
        <Pressable
          onPress={goToToday}
          style={({pressed}) => [
            styles.todayBtn,
            pressed && styles.todayBtnPressed,
          ]}>
          <Ionicons name="today-outline" size={18} color={colors.primary} />
          <Text style={styles.todayBtnText}>오늘</Text>
        </Pressable>
      )}

      <DateTimePickerModal
        isVisible={pickerVisible}
        mode="date"
        onConfirm={onPickerConfirm}
        onCancel={hidePicker}
        date={new Date(currentYear, currentMonth - 1, 1)}
        locale="ko"
        confirmTextIOS="선택"
        cancelTextIOS="취소"
        headerTextIOS="년월 선택"
        confirmTextAndroid="확인"
        cancelTextAndroid="취소"
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
  stickyHeader: {
    backgroundColor: colors.background,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
  titleContainer: {
    paddingHorizontal: spacing.sm,
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
  todayBtn: {
    position: 'absolute',
    bottom: spacing.lg,
    left: '50%',
    marginLeft: -40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    width: 80,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  todayBtnPressed: {
    backgroundColor: colors.surfaceSecondary,
    transform: [{scale: 0.95}],
  },
  todayBtnText: {
    ...typography.captionBold,
    color: colors.primary,
    marginLeft: 4,
  },
});

export default SearchScreen;
