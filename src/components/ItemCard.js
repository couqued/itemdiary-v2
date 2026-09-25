import React from 'react';
import {View, Text, Image, StyleSheet, Pressable} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import {Badge} from './ui/Badge';
import {formatPrice} from '../utils/formatPrice';
import {formatDateShort} from '../utils/formatDate';
import {getScheduleBadge} from '../utils/schedule';

export function ItemCard({item, category, onPress, isGrid = true}) {
  const scheduleBadge = getScheduleBadge(item);

  const renderPlaceholder = (style) => (
    <View style={[style, styles.placeholder]}>
      <Icon name="image-outline" size={isGrid ? 32 : 24} color={colors.textTertiary} />
    </View>
  );

  if (isGrid) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          styles.gridCard,
          pressed && styles.pressed,
        ]}>
        {item.image_url ? (
          <Image
            source={{uri: item.image_url}}
            style={styles.gridImage}
          />
        ) : (
          renderPlaceholder(styles.gridImage)
        )}
        <View style={styles.gridContent}>
          <Text style={styles.gridTitle} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.gridDate}>
            {formatDateShort(item.item_date)}
          </Text>
          <Text style={styles.gridPrice}>
            {formatPrice(item.price)}원
          </Text>
          {!!category && (
            <Badge
              label={category.name}
              color={category.color}
              style={styles.gridBadge}
            />
          )}
          {!!scheduleBadge && (
            <Text style={styles.warrantyBadge}>{scheduleBadge}</Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.listCard,
        pressed && styles.pressed,
      ]}>
      {item.image_url ? (
        <Image
          source={{uri: item.image_url}}
          style={styles.listImage}
        />
      ) : (
        renderPlaceholder(styles.listImage)
      )}
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.listMeta}>
          <Text style={styles.listDate}>
            {formatDateShort(item.item_date)}
          </Text>
          {!!category && (
            <Badge label={category.name} color={category.color} />
          )}
        </View>
        <Text style={styles.listPrice}>
          {formatPrice(item.price)}원
        </Text>
        {!!scheduleBadge && (
          <Text style={styles.warrantyBadge}>{scheduleBadge}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    margin: spacing.xs,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  placeholder: {
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    padding: spacing.sm,
  },
  gridTitle: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: 2,
  },
  gridDate: {
    ...typography.small,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  gridPrice: {
    ...typography.captionBold,
    color: colors.text,
  },
  gridBadge: {
    marginTop: spacing.xs,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    resizeMode: 'cover',
  },
  listContent: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  listTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: 2,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  listDate: {
    ...typography.small,
    color: colors.textTertiary,
    marginRight: spacing.sm,
  },
  listPrice: {
    ...typography.price,
    color: colors.text,
  },
  pressed: {
    opacity: 0.9,
    transform: [{scale: 0.98}],
  },
  warrantyBadge: {
    ...typography.small,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 2,
  },
});
