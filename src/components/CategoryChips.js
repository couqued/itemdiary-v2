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
  compact = false,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, compact && styles.containerCompact]}>
      {showAll && (
        <Pressable
          onPress={() => onSelect(null)}
          style={[
            styles.chip,
            compact && styles.chipCompact,
            !selectedId && styles.chipActive,
          ]}>
          <Text
            style={[
              styles.chipText,
              compact && styles.chipTextCompact,
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
              compact && styles.chipCompact,
              isSelected && {backgroundColor: cat.color},
            ]}>
            <Text
              style={[
                styles.chipText,
                compact && styles.chipTextCompact,
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
  containerCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    marginRight: spacing.sm,
  },
  chipCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.xs,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chipTextCompact: {
    fontSize: 11,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: '600',
  },
});
