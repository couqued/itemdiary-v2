import React from 'react';
import {Pressable, StyleSheet} from 'react-native';
import {colors} from '../../constants/colors';
import {spacing, radius} from '../../constants/spacing';

export function Card({children, onPress, style}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return (
    <Pressable style={[styles.card, style]}>{children}</Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
});
