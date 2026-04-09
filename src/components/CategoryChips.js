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
    paddingVertical: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.sm,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
});
