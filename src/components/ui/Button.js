import React from 'react';
import {Pressable, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({pressed}) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        pressed && styles[`${variant}Pressed`],
        isDisabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.textInverse : colors.primary}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`${variant}Text`],
            styles[`size_${size}Text`],
            textStyle,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  size_sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 32,
  },
  size_md: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
  },
  size_lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondary: {
    backgroundColor: colors.surfaceSecondary,
  },
  secondaryPressed: {
    backgroundColor: colors.border,
  },
  secondaryText: {
    color: colors.text,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlinePressed: {
    backgroundColor: colors.surfaceSecondary,
  },
  outlineText: {
    color: colors.text,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  dangerPressed: {
    backgroundColor: '#DC2626',
  },
  dangerText: {
    color: colors.textInverse,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.bodyBold,
  },
  size_smText: {
    ...typography.captionBold,
  },
  size_mdText: {
    ...typography.bodyBold,
  },
  size_lgText: {
    ...typography.bodyBold,
  },
});
