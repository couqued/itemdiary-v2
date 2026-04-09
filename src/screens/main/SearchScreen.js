import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  TextInput,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {useItems} from '../../hooks/useItems';
import {useCategories} from '../../hooks/useCategories';
import {CategoryChips} from '../../components/CategoryChips';
import {ItemCard} from '../../components/ItemCard';
import {EmptyState} from '../../components/ui/EmptyState';
import {LoadingOverlay} from '../../components/ui/LoadingOverlay';

const SORT_OPTIONS = [
  {key: 'created_at', label: '최신순', asc: false},
  {key: 'item_date', label: '구입날짜순', asc: false},
  {key: 'price', label: '가격순', asc: false},
  {key: 'name', label: '이름순', asc: true},
];

function SearchScreen({navigation}) {
  const {items, loading, fetchItems, fetchMore} = useItems();
  const {categories, getCategoryById} = useCategories();

  const [searchText, setSearchText] = useState('');
  const [categoryId, setCategoryId] = useState(null);
  const [sortIndex, setSortIndex] = useState(0);
  const [hasSearched, setHasSearched] = useState(true);

  const getOptions = useCallback(
    (overrides = {}) => {
      const sort = SORT_OPTIONS[overrides.sortIdx ?? sortIndex];
      return {
        sortBy: sort.key,
        sortAsc: sort.asc,
        search: overrides.search ?? searchText,
        categoryId: overrides.catId !== undefined ? overrides.catId : categoryId,
      };
    },
    [searchText, categoryId, sortIndex],
  );

  useEffect(() => {
    fetchItems(getOptions());
  }, []);

  const doSearch = (overrides = {}) => {
    setHasSearched(true);
    fetchItems(getOptions(overrides));
  };

  const onSubmitSearch = () => {
    doSearch();
  };

  const onSelectCategory = id => {
    setCategoryId(id);
    doSearch({catId: id});
  };

  const onChangeSort = idx => {
    setSortIndex(idx);
    doSearch({sortIdx: idx});
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
    [categories],
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 검색바 */}
      <View style={styles.searchBar}>
        <Icon name="search-outline" size={20} color={colors.textTertiary} style={{marginRight: spacing.sm}} />
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="아이템 이름 검색"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
          onSubmitEditing={onSubmitSearch}
          autoCapitalize="none"
        />
        {searchText.length > 0 && (
          <Pressable
            onPress={() => {
              setSearchText('');
              doSearch({search: ''});
            }}>
            <Icon name="close-circle" size={20} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* 카테고리 필터 */}
      <CategoryChips
        categories={categories}
        selectedId={categoryId}
        onSelect={onSelectCategory}
        showAll
      />

      {/* 정렬 */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt, i) => (
          <Pressable
            key={opt.key}
            onPress={() => onChangeSort(i)}
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

      {/* 결과 */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => String(item.seq)}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="search-outline"
              title={hasSearched ? '검색 결과가 없습니다' : '아이템을 검색해보세요'}
              subtitle={
                hasSearched
                  ? '다른 키워드나 필터로 검색해보세요'
                  : '이름, 카테고리로 아이템을 찾을 수 있습니다'
              }
            />
          ) : null
        }
        contentContainerStyle={items.length === 0 && styles.emptyList}
        onEndReached={() => fetchMore(getOptions())}
        onEndReachedThreshold={0.5}
        style={styles.list}
      />

      {loading && items.length === 0 && <LoadingOverlay />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
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
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
});

export default SearchScreen;
