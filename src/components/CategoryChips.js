import React from 'react';
import {ScrollView, Pressable, Text, StyleSheet} from 'react-native';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';

export function CategoryChips({
  categories,
  selectedId,
  onSelect,
  showAll = false,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {showAll && (
        <Pressable
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            !selectedId && styles.chipActive,
          ]}>
          <Text
            style={[
              styles.chipText,
              !selectedId && styles.chipTextActive,
            ]}>
            전체
          </Text>
        </Pressable>
      )}
      {categories.map(cat => {
        const isSelected = selectedId === cat.id;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            style={[
              styles.chip,
              isSelected && {backgroundColor: cat.color},
            ]}>
            <Text
              style={[
                styles.chipText,
                isSelected && styles.chipTextActive,
              ]}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, // 상하 여백 약간 축소
  },
  chip: {
    paddingHorizontal: spacing.md + 4, // 가로 패딩 20% 축소 (24 -> 20)
    paddingVertical: 6,               // 세로 패딩 축소 (8 -> 6)
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: 15, // 글자 크기 미세 조정 (16 -> 15)
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
});
