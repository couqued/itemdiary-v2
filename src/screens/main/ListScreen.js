import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  BackHandler,
  ToastAndroid,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {useItems} from '../../hooks/useItems';
import {useCategories} from '../../hooks/useCategories';
import {ItemCard} from '../../components/ItemCard';
import {EmptyState} from '../../components/ui/EmptyState';
import {LoadingOverlay} from '../../components/ui/LoadingOverlay';

const SORT_OPTIONS = [
  {key: 'created_at', label: '최신순', asc: false},
  {key: 'item_date', label: '구입날짜순', asc: false},
  {key: 'price', label: '가격순', asc: false},
  {key: 'name', label: '이름순', asc: true},
];

function ListScreen({navigation}) {
  const isFocused = useIsFocused();
  const {items, loading, refreshing, hasMore, fetchItems, fetchMore, refresh} =
    useItems();
  const {categories, getCategoryById} = useCategories();

  const [isGrid, setIsGrid] = useState(true);
  const [sortIndex, setSortIndex] = useState(0);

  // 레이아웃 모드 복원
  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    AsyncStorage.getItem('listLayout').then(val => {
      if (val === 'list') setIsGrid(false);
    });
  }, []);

  // 포커스 시 데이터 로드
  useEffect(() => {
    if (isFocused) {
      const sort = SORT_OPTIONS[sortIndex];
      fetchItems({sortBy: sort.key, sortAsc: sort.asc});
    }
  }, [isFocused]);

  // 안드로이드 뒤로가기
  useEffect(() => {
    let isExitApp = false;
    let timeout;

    const backAction = () => {
      if (navigation.isFocused()) {
        if (!isExitApp) {
          ToastAndroid.show(
            '뒤로 버튼을 한번 더 누르시면 종료됩니다.',
            ToastAndroid.SHORT,
          );
          isExitApp = true;
          timeout = setTimeout(() => {
            isExitApp = false;
          }, 3000);
        } else {
          clearTimeout(timeout);
          BackHandler.exitApp();
        }
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => sub.remove();
  }, [navigation]);

  const toggleLayout = async () => {
    const next = !isGrid;
    setIsGrid(next);
    await AsyncStorage.setItem('listLayout', next ? 'grid' : 'list');
  };

  const changeSort = index => {
    setSortIndex(index);
    const sort = SORT_OPTIONS[index];
    fetchItems({sortBy: sort.key, sortAsc: sort.asc});
  };

  const handleEndReached = () => {
    const sort = SORT_OPTIONS[sortIndex];
    fetchMore({sortBy: sort.key, sortAsc: sort.asc});
  };

  const goDetail = item => {
    navigation.navigate('Detail', {data: item});
  };

  const goWrite = () => {
    navigation.navigate('ItemForm');
  };

  const renderItem = useCallback(
    ({item, index}) => {
      const category = getCategoryById(item.category_id);
      if (isGrid) {
        // 2열 그리드에서 홀수 개일 때 마지막 아이템 처리
        return (
          <View style={{flex: 1, maxWidth: '50%'}}>
            <ItemCard
              item={item}
              category={category}
              isGrid={true}
              onPress={() => goDetail(item)}
            />
          </View>
        );
      }
      return (
        <ItemCard
          item={item}
          category={category}
          isGrid={false}
          onPress={() => goDetail(item)}
        />
      );
    },
    [isGrid, categories],
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt, i) => (
          <Pressable
            key={opt.key}
            onPress={() => changeSort(i)}
            style={[
              styles.sortChip,
              sortIndex === i && styles.sortChipActive,
            ]}>
            <Text
              style={[
                styles.sortText,
                sortIndex === i && styles.sortTextActive,
              ]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={toggleLayout} style={styles.layoutToggle}>
        <Icon
          name={isGrid ? 'list-outline' : 'grid-outline'}
          size={22}
          color={colors.textSecondary}
        />
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => String(item.seq)}
        numColumns={isGrid ? 2 : 1}
        key={isGrid ? 'grid' : 'list'}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        contentContainerStyle={items.length === 0 && styles.emptyList}
        onRefresh={() => {
          const sort = SORT_OPTIONS[sortIndex];
          refresh({sortBy: sort.key, sortAsc: sort.asc});
        }}
        refreshing={refreshing}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        style={styles.list}
      />

      {/* FAB */}
      <Pressable
        onPress={goWrite}
        style={({pressed}) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}>
        <Icon name="add" size={28} color={colors.textInverse} />
      </Pressable>

      {loading && items.length === 0 && <LoadingOverlay />}
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
  emptyList: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortRow: {
    flex: 1,
    flexDirection: 'row',
  },
  sortChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.xs,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
  },
  sortText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  sortTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
  layoutToggle: {
    padding: spacing.sm,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{scale: 0.95}],
  },
});

export default ListScreen;
