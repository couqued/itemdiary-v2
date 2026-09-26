import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
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
  Animated,
  Platform,
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
import {callAi, aiErrorText, todayISO} from '../../lib/ai';
import {looksLikeSentence, conditionChips, removeCondition} from '../../lib/searchIntent';
import {resolveCategoryId} from '../../constants/categories';
import {ClipboardLinkPrompt} from '../../components/ClipboardLinkPrompt';

const SORT_OPTIONS = [
  {key: 'created_at', label: '최신순', asc: false},
  {key: 'item_date', label: '구입날짜순', wishLabel: '등록날짜순', asc: false},
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
  const [isWishlistTab, setIsWishlistTab] = useState(false);
  // 자연어 검색: AI 가 만든 조건 (null 이면 평소 이름 검색)
  const [aiFilter, setAiFilter] = useState(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiSearchError, setAiSearchError] = useState(null);

  // Speed Dial State
  const [isExpanded, setIsExpanded] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleSpeedDial = () => {
    const toValue = isExpanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
    setIsExpanded(!isExpanded);
  };

  const filtersRef = useRef({sortIndex, categoryId, isWishlistTab, searchText, aiFilter});
  filtersRef.current = {sortIndex, categoryId, isWishlistTab, searchText, aiFilter};

  const getOptions = useCallback(
    (overrides = {}) => {
      const current = filtersRef.current;
      const sort = SORT_OPTIONS[overrides.sortIdx !== undefined ? overrides.sortIdx : current.sortIndex];
      return {
        sortBy: sort.key,
        sortAsc: sort.asc,
        search: overrides.search !== undefined ? overrides.search : current.searchText,
        categoryId: overrides.catId !== undefined ? overrides.catId : current.categoryId,
        isWishlist: overrides.isWishlist !== undefined ? overrides.isWishlist : current.isWishlistTab,
        aiFilter: overrides.aiFilter !== undefined ? overrides.aiFilter : current.aiFilter,
      };
    },
    [],
  );

  const debouncedSearch = useMemo(
    () => debounce(text => {
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
    // 새로 입력하면 AI 조건은 풀고 평소 이름 검색으로
    if (aiFilter) setAiFilter(null);
    setAiSearchError(null);
    debouncedSearch(text);
  };

  // 「✨ AI로 찾기」: 이때만 AI 호출 → 조건으로 바꿔 앱이 검색
  const runAiSearch = async () => {
    const query = searchText.trim();
    if (!query || aiSearching) return;
    debouncedSearch.cancel();
    setAiSearching(true);
    setAiSearchError(null);
    const {data, error} = await callAi('search', {
      query,
      today: todayISO(),
      categories: categories.map(c => c.name),
    });
    setAiSearching(false);
    if (error) {
      setAiSearchError(aiErrorText(error));
      return;
    }
    const filter = {
      date_from: data?.date_from || null,
      date_to: data?.date_to || null,
      categoryIds: (data?.categories || []).map(n => resolveCategoryId(categories, n)).filter(id => id != null),
      price_min: data?.price_min ?? null,
      price_max: data?.price_max ?? null,
      warranty: data?.warranty || null,
      has_replacement: data?.has_replacement || null,
      keyword: data?.keyword || null,
    };
    const nextFilter = conditionChips(filter).length ? filter : null;
    if (!nextFilter) {
      setAiSearchError('조건을 찾지 못했어요. 다르게 적어보세요.');
      return;
    }
    const wish = typeof data?.is_wishlist === 'boolean' ? data.is_wishlist : isWishlistTab;
    setAiFilter(nextFilter);
    if (wish !== isWishlistTab) setIsWishlistTab(wish); // 탭 전환 시 아래 effect 가 다시 조회
    else fetchItems(getOptions({aiFilter: nextFilter}));
  };

  const removeAiChip = key => {
    const next = removeCondition(aiFilter, key);
    setAiFilter(next);
    fetchItems(getOptions({aiFilter: next, search: next ? '' : searchText}));
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
      fetchItems(getOptions());
    }
  }, [isFocused, isWishlistTab]);

  useEffect(() => {
    let isExitApp = false;
    let timeout;

    const backAction = () => {
      if (navigation.isFocused()) {
        if (isExpanded) {
          toggleSpeedDial();
          return true;
        }
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
  }, [navigation, isExpanded]);

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
    setAiFilter(null);
    setAiSearchError(null);
    debouncedSearch.cancel();
    fetchItems(getOptions({search: '', aiFilter: null}));
  };

  const showAiSuggest =
    !aiFilter && !aiSearching && !loading && searchText.trim().length > 0 &&
    looksLikeSentence(searchText, {nameResultCount: items.length});
  const aiChips = conditionChips(aiFilter, id => categories.find(c => c.id === id)?.name || '카테고리');

  const handleEndReached = () => {
    fetchMore(getOptions());
  };

  const goDetail = item => {
    navigation.navigate('Detail', {data: item});
  };

  const goWriteManual = () => {
    toggleSpeedDial();
    navigation.navigate('ItemForm', {is_wishlist: isWishlistTab});
  };

  const goReceiptImport = () => {
    toggleSpeedDial();
    navigation.navigate('ReceiptImport');
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

  // Animation Styles
  const manualStyle = {
    transform: [
      {scale: animation},
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -70],
        }),
      },
    ],
    opacity: animation,
  };

  const receiptStyle = {
    transform: [
      {scale: animation},
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -130],
        }),
      },
    ],
    opacity: animation,
  };

  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={styles.stickyHeader}>
        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setIsWishlistTab(false)}
            style={[styles.tabBtn, !isWishlistTab && styles.tabBtnActive]}>
            <Text style={[styles.tabText, !isWishlistTab && styles.tabTextActive]}>아이템</Text>
          </Pressable>
          <Pressable
            onPress={() => setIsWishlistTab(true)}
            style={[styles.tabBtn, isWishlistTab && styles.tabBtnActive]}>
            <Text style={[styles.tabText, isWishlistTab && styles.tabTextActive]}>찜</Text>
          </Pressable>
        </View>

        {/* 복사한 쇼핑몰 링크 → 찜 추가 안내 */}
        <ClipboardLinkPrompt
          onAdded={() => {
            // 찜 탭으로 옮겨서 방금 추가한 물건이 보이게
            if (isWishlistTab) fetchItems(getOptions());
            else setIsWishlistTab(true);
          }}
        />

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
            <Pressable onPress={runAiSearch} hitSlop={8} style={{marginRight: spacing.sm}}>
              <Text style={styles.aiIcon}>✨</Text>
            </Pressable>
          )}
          {searchText.length > 0 && (
            <Pressable onPress={onClearSearch}>
              <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* 자연어 검색: 문장처럼 보이면 버튼만 (AI 호출 전) */}
        {showAiSuggest && (
          <Pressable onPress={runAiSearch} style={styles.aiSuggest}>
            <View style={{flex: 1}}>
              <Text style={styles.aiSuggestTitle}>문장으로 찾고 계신가요?</Text>
              <Text style={styles.aiSuggestSub}>AI가 조건으로 바꿔서 찾아드려요</Text>
            </View>
            <View style={styles.aiSuggestBtn}>
              <Text style={styles.aiSuggestBtnText}>✨ AI로 찾기</Text>
            </View>
          </Pressable>
        )}
        {aiSearching && (
          <View style={styles.aiSuggest}>
            <Text style={styles.aiSuggestSub}>✨ AI가 검색 조건을 만드는 중...</Text>
          </View>
        )}
        {!!aiSearchError && <Text style={styles.aiError}>{aiSearchError}</Text>}
        {!!aiFilter && (
          <View style={styles.aiChips}>
            <Text style={styles.aiChipsLabel}>✨ AI가 이렇게 이해했어요</Text>
            <View style={styles.aiChipsRow}>
              {aiChips.map(chip => (
                <Pressable key={chip.key} onPress={() => removeAiChip(chip.key)} style={styles.aiChip}>
                  <Text style={styles.aiChipText}>{chip.label} ✕</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

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
                  {isWishlistTab && opt.wishLabel ? opt.wishLabel : opt.label}
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

      {/* Speed Dial Overlay */}
      {isExpanded && (
        <Pressable style={styles.overlay} onPress={toggleSpeedDial} />
      )}

      {/* Sub Buttons */}
      {!isWishlistTab && (
        <Animated.View style={[styles.subFabContainer, receiptStyle]} pointerEvents={isExpanded ? 'auto' : 'none'}>
          <Text style={[styles.subFabLabel, styles.subFabLabelNew]}>영수증·결제내역</Text>
          <Pressable
            onPress={goReceiptImport}
            style={[styles.subFab, {backgroundColor: colors.surface}]}>
            <Ionicons name="receipt-outline" size={24} color={colors.primary} />
          </Pressable>
        </Animated.View>
      )}
      <Animated.View style={[styles.subFabContainer, manualStyle]}>
        <Text style={styles.subFabLabel}>직접 등록</Text>
        <Pressable
          onPress={goWriteManual}
          style={[styles.subFab, {backgroundColor: colors.surface}]}>
          <Ionicons name="create-outline" size={24} color={colors.primary} />
        </Pressable>
      </Animated.View>

      {/* Main FAB */}
      <Pressable
        onPress={toggleSpeedDial}
        style={({pressed}) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}>
        <Animated.View style={{transform: [{rotate: rotation}]}}>
          <Ionicons name="add" size={28} color={colors.textInverse} />
        </Animated.View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 15,
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
    zIndex: 20,
  },
  fabPressed: {
    backgroundColor: colors.primaryDark,
    transform: [{scale: 0.95}],
  },
  subFabContainer: {
    position: 'absolute',
    right: spacing.lg + 4,
    bottom: spacing.lg + 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 19,
  },
  subFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  subFabLabel: {
    ...typography.captionBold,
    color: colors.textInverse,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  aiIcon: {fontSize: 17},
  aiSuggest: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  aiSuggestTitle: {...typography.captionBold, color: colors.primaryDark},
  aiSuggestSub: {...typography.small, color: colors.primaryDark},
  aiSuggestBtn: {backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6},
  aiSuggestBtnText: {...typography.small, fontWeight: '700', color: colors.textInverse},
  aiError: {...typography.small, color: colors.danger, marginHorizontal: spacing.md, marginTop: spacing.xs},
  aiChips: {marginHorizontal: spacing.md, marginTop: spacing.xs, gap: 4},
  aiChipsLabel: {...typography.small, color: colors.primaryDark},
  aiChipsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  aiChip: {backgroundColor: '#E0EAFF', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4},
  aiChipText: {...typography.small, color: '#1E40AF', fontWeight: '600'},
  subFabLabelNew: {
    backgroundColor: '#FFF4DB',
    color: '#8A5A00',
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    backgroundColor: colors.background,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodyBold,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.primary,
  },
});

export default ListScreen;

