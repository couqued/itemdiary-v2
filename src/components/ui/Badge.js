import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';

export function Badge({label, color, textColor = '#FFFFFF', style}) {
  return (
    <View style={[styles.badge, {backgroundColor: color}, style]}>
      <Text style={[styles.text, {color: textColor}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.small,
    fontWeight: '600',
  },
});
