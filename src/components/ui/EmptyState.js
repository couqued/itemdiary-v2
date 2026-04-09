import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing} from '../../constants/spacing';

export function EmptyState({
  icon = 'cube-outline',
  title = '아이템이 없습니다',
  subtitle = '우측 하단 + 버튼으로 첫 아이템을 등록해보세요',
}) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={64} color={colors.textTertiary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  title: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
