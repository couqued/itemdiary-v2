import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {Badge, LoadingOverlay, CustomAlert} from '../../components/ui';
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

  const warrantyDaysLeft = item.warranty_date
    ? Math.ceil((new Date(item.warranty_date) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const warrantyLabel = (() => {
    if (warrantyDaysLeft === null) return null;
    if (warrantyDaysLeft < 0) return {text: '보증 만료', color: '#9CA3AF'};
    if (warrantyDaysLeft <= 30) return {text: `보증 만료 임박 (D-${warrantyDaysLeft})`, color: '#EF4444'};
    return {text: `보증 중 (${warrantyDaysLeft}일 남음)`, color: '#10B981'};
  })();
  const category = getCategoryById(item.category_id);
  const [loading, setLoading] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [purchaseVisible, setPurchaseVisible] = useState(false);

  const onPurchaseConfirm = async () => {
    setPurchaseVisible(false);
    setLoading(true);
    const {error} = await supabase
      .from('items')
      .update({is_wishlist: false, item_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString()})
      .eq('seq', item.seq);
    setLoading(false);

    if (error) {
      Alert.alert('', '처리에 실패하였습니다.');
      return;
    }
    navigation.goBack();
  };

  const onDeleteConfirm = async () => {
    setDeleteVisible(false);
    setLoading(true);
    const {error} = await supabase
      .from('items')
      .delete()
      .eq('seq', item.seq);
    setLoading(false);

    if (error) {
      Alert.alert('', '삭제에 실패하였습니다.');
      return;
    }
    navigation.goBack();
  };

  const onEdit = () => {
    navigation.navigate('ItemForm', {item});
  };

  const onOpenLink = () => {
    if (item.link) {
      Linking.openURL(item.link).catch(() => {
        Alert.alert('', '링크를 열 수 없습니다.');
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>상세정보</Text>
        <Pressable onPress={onEdit} style={styles.headerBtn}>
          <Text style={styles.editBtnText}>수정</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll}>
        {item.image_url ? (
          <Pressable onPress={() => setImageModalVisible(true)}>
            <Image
              source={{uri: item.image_url}}
              style={styles.image}
              resizeMode="cover"
            />
          </Pressable>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={48} color={colors.textTertiary} />
          </View>
        )}

        <Modal
          visible={imageModalVisible}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setImageModalVisible(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setImageModalVisible(false)}
                style={styles.closeBtn}>
                <Ionicons name="close" size={30} color={colors.textInverse} />
              </Pressable>
            </View>
            <View style={styles.modalImageWrapper}>
              <Image
                source={{uri: item.image_url}}
                style={styles.modalImage}
                resizeMode="contain"
              />
            </View>
          </SafeAreaView>
        </Modal>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            {!!category && (
              <Badge label={category.name} color={category.color} />
            )}
          </View>

          <InfoRow icon="calendar-outline" label={item.is_wishlist ? '등록날짜' : '구입날짜'} value={formatDateKo(item.item_date)} />
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
          {!!warrantyLabel && (
            <InfoRow
              icon="shield-checkmark-outline"
              label="보증기간"
              value={warrantyLabel.text}
              valueStyle={{color: warrantyLabel.color, fontWeight: '600'}}
            />
          )}
        </View>
      </ScrollView>

      <View style={styles.actionBar}>
        {item.is_wishlist && (
          <Pressable
            onPress={() => setPurchaseVisible(true)}
            style={({pressed}) => [
              styles.actionBtn,
              styles.purchaseBtn,
              pressed && {opacity: 0.8},
              {marginRight: spacing.sm},
            ]}>
            <Ionicons name="cart-outline" size={20} color={colors.textInverse} style={{marginRight: spacing.sm}} />
            <Text style={styles.purchaseBtnText}>구입 완료</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setDeleteVisible(true)}
          style={({pressed}) => [
            styles.actionBtn,
            styles.deleteBtn,
            pressed && {opacity: 0.8},
          ]}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} style={{marginRight: spacing.sm}} />
          <Text style={styles.deleteBtnText}>삭제하기</Text>
        </Pressable>
      </View>

      <CustomAlert
        visible={purchaseVisible}
        title="구입 확인"
        message="구입 완료 처리하고 아이템 탭으로 이동시킬까요?"
        confirmText="확인"
        cancelText="취소"
        onConfirm={onPurchaseConfirm}
        onCancel={() => setPurchaseVisible(false)}
      />

      <CustomAlert
        visible={deleteVisible}
        title="삭제 확인"
        message="정말로 이 아이템을 삭제하시겠습니까?"
        confirmText="삭제"
        cancelText="취소"
        type="danger"
        onConfirm={onDeleteConfirm}
        onCancel={() => setDeleteVisible(false)}
      />

      {loading && <LoadingOverlay />}
    </SafeAreaView>
  );
}

function InfoRow({icon, label, value, valueStyle}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} style={{marginRight: spacing.sm}} />
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
  editBtnText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 300,
    backgroundColor: colors.surfaceSecondary,
  },
  imagePlaceholder: {
    width: '100%',
    height: 240,
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
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
  },
  purchaseBtn: {
    backgroundColor: colors.primary,
  },
  purchaseBtnText: {
    ...typography.captionBold,
    color: colors.textInverse,
  },
  deleteBtn: {
    backgroundColor: colors.dangerLight,
  },
  deleteBtnText: {
    ...typography.captionBold,
    color: colors.danger,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  closeBtn: {
    padding: spacing.sm,
  },
  modalImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});

export default DetailScreen;
