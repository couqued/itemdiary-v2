import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {Badge} from '../../components/ui/Badge';
import {LoadingOverlay} from '../../components/ui/LoadingOverlay';
import {useCategories} from '../../hooks/useCategories';
import {formatPrice} from '../../utils/formatPrice';
import {formatDateKo} from '../../utils/formatDate';
import {supabase} from '../../lib/supabase';

function DetailScreen({navigation, route}) {
  const item = route.params?.data;
  if (!item) {
    navigation.goBack();
    return null;
  }
  const {getCategoryById} = useCategories();
  const category = getCategoryById(item.category_id);
  const [loading, setLoading] = useState(false);

  const onDelete = () => {
    Alert.alert('알림', '삭제하시겠습니까?', [
      {text: '취소', style: 'cancel'},
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          const {error} = await supabase
            .from('items')
            .delete()
            .eq('seq', item.seq);
          setLoading(false);

          if (error) {
            Alert.alert('', '삭제에 실패하였습니다.', [{text: '확인'}]);
            return;
          }
          navigation.goBack();
        },
      },
    ]);
  };

  const onEdit = () => {
    navigation.navigate('ItemForm', {item});
  };

  const onOpenLink = () => {
    if (item.link) {
      Linking.openURL(item.link).catch(() => {
        Alert.alert('', '링크를 열 수 없습니다.', [{text: '확인'}]);
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>상세정보</Text>
        <Pressable onPress={onEdit} style={styles.headerBtn}>
          <Icon name="pencil-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll}>
        {/* 이미지 */}
        {item.image_url ? (
          <Image
            source={{uri: item.image_url}}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="image-outline" size={48} color={colors.textTertiary} />
          </View>
        )}

        {/* 정보 */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            {!!category && (
              <Badge label={category.name} color={category.color} />
            )}
          </View>

          <InfoRow icon="calendar-outline" label="구입날짜" value={formatDateKo(item.item_date)} />
          <InfoRow icon="pricetag-outline" label="가격" value={`${formatPrice(item.price)}원`} />
          {!!item.store_name && (
            <InfoRow icon="business-outline" label="구입처" value={item.store_name} />
          )}
          {!!item.link && (
            <Pressable onPress={onOpenLink}>
              <InfoRow
                icon="link-outline"
                label="링크"
                value={item.link}
                valueStyle={styles.linkText}
              />
            </Pressable>
          )}
          {!!item.memo && (
            <InfoRow icon="document-text-outline" label="메모" value={item.memo} />
          )}
        </View>
      </ScrollView>

      {/* 하단 액션 바 */}
      <View style={styles.actionBar}>
        <Pressable
          onPress={onDelete}
          style={({pressed}) => [
            styles.actionBtn,
            styles.deleteBtn,
            pressed && {opacity: 0.8},
          ]}>
          <Icon name="trash-outline" size={20} color={colors.danger} style={{marginRight: spacing.xs}} />
          <Text style={styles.deleteBtnText}>삭제하기</Text>
        </Pressable>
      </View>

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}

function InfoRow({icon, label, value, valueStyle}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <Icon name={icon} size={18} color={colors.textSecondary} style={{marginRight: spacing.sm}} />
        <Text style={styles.infoLabelText}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueStyle]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 300,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  itemTitle: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  infoRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoLabelText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.lg + spacing.sm,
  },
  linkText: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  actionBar: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
  },
  deleteBtnText: {
    ...typography.captionBold,
    color: colors.danger,
  },
});

export default DetailScreen;
