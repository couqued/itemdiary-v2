import React, {useState, useEffect, useCallback} from 'react';
import debounce from 'lodash.debounce';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  Text,
  TextInput,
  BackHandler,
  ToastAndroid,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {useItems} from '../../hooks/useItems';
import {useCategories} from '../../hooks/useCategories';
import {ItemCard} from '../../components/ItemCard';
import {CategoryChips} from '../../components/CategoryChips';
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
  const [searchText, setSearchText] = useState('');
  const [categoryId, setCategoryId] = useState(null);

  const getOptions = useCallback(
    (overrides = {}) => {
      const sort = SORT_OPTIONS[overrides.sortIdx !== undefined ? overrides.sortIdx : sortIndex];
      return {
        sortBy: sort.key,
        sortAsc: sort.asc,
        search: overrides.search !== undefined ? overrides.search : searchText,
        categoryId: overrides.catId !== undefined ? overrides.catId : categoryId,
      };
    },
    [sortIndex, categoryId], // searchText를 제거하여 함수 신원 유지
  );

  const debouncedSearch = useCallback(
    debounce(text => {
      fetchItems(getOptions({search: text}));
    }, 300),
    [fetchItems, getOptions],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearchChange = text => {
    setSearchText(text);
    debouncedSearch(text);
  };

  const onSubmitSearch = () => {
    debouncedSearch.cancel();
    fetchItems(getOptions({search: searchText}));
  };

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    AsyncStorage.getItem('listLayout').then(val => {
      if (val === 'list') setIsGrid(false);
    });
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchItems(getOptions({search: searchText}));
    }
  }, [isFocused]);

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
    fetchItems(getOptions({sortIdx: index}));
  };

  const onSelectCategory = id => {
    setCategoryId(id);
    fetchItems(getOptions({catId: id}));
  };

  const onClearSearch = () => {
    setSearchText('');
    debouncedSearch.cancel();
    fetchItems(getOptions({search: ''}));
  };

  const handleEndReached = () => {
    fetchMore(getOptions());
  };

  const goDetail = item => {
    navigation.navigate('Detail', {data: item});
  };

  const goWrite = () => {
    navigation.navigate('ItemForm');
  };

  const renderItem = useCallback(
    ({item}) => {
      const category = getCategoryById(item.category_id);
      if (isGrid) {
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
    [isGrid, categories, getCategoryById],
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.stickyHeader}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textTertiary} style={{marginRight: spacing.sm}} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="아이템 이름 검색"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={onSubmitSearch}
            autoCapitalize="none"
          />
          {searchText.length > 0 && (
            <Pressable onPress={onClearSearch}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <CategoryChips
          categories={categories}
          selectedId={categoryId}
          onSelect={onSelectCategory}
          showAll
        />

        <View style={styles.sortRow}>
          <View style={styles.sortChips}>
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
            <Ionicons
              name={isGrid ? 'list-outline' : 'grid-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => String(item.seq)}
        numColumns={isGrid ? 2 : 1}
        key={isGrid ? 'grid' : 'list'}
        ListEmptyComponent={!loading ? <EmptyState /> : null}
        contentContainerStyle={items.length === 0 && styles.emptyList}
        onRefresh={() => refresh(getOptions())}
        refreshing={refreshing}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        style={styles.list}
      />

      <Pressable
        onPress={goWrite}
        style={({pressed}) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}>
        <Ionicons name="add" size={28} color={colors.textInverse} />
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
  stickyHeader: {
    backgroundColor: colors.background,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  sortChips: {
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
