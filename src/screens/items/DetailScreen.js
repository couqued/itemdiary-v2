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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {Badge, LoadingOverlay, CustomAlert} from '../../components/ui';
import {useCategories} from '../../hooks/useCategories';
import {formatPrice} from '../../utils/formatPrice';
import {formatDateKo, formatDateISO} from '../../utils/formatDate';
import {addMonths, getScheduleRows} from '../../utils/schedule';
import {syncItemReminders, setItemMuted} from '../../lib/reminders';
import {supabase} from '../../lib/supabase';

function DetailScreen({navigation, route}) {
  const item = route.params?.data;
  if (!item) {
    navigation.goBack();
    return null;
  }
  const {getCategoryById} = useCategories();

  // 물건별 알림 끄기 (notify_muted 컬럼이 있는 DB에서만 표시)
  const canMute = 'notify_muted' in item;
  const [muted, setMuted] = useState(!!item.notify_muted);
  const onToggleNotify = async value => {
    setMuted(!value);
    const ok = await setItemMuted(item.seq, !value);
    if (!ok) {
      setMuted(value);
      Alert.alert('', '알림 설정을 바꾸지 못했어요.');
    }
  };

  // 교체 완료 처리 후 화면에 바로 반영하기 위한 로컬 값
  const [nextReplacementOverride, setNextReplacementOverride] = useState(null);
  const scheduleRows = getScheduleRows({
    ...item,
    next_replacement_date: nextReplacementOverride || item.next_replacement_date,
  });
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
    syncItemReminders();
    navigation.goBack();
  };

  // 오늘 교체했다고 기록 → 다음 교체일을 오늘 + 주기로 갱신
  const onReplaced = async () => {
    if (!item.replacement_months) return;
    const next = formatDateISO(addMonths(new Date(), item.replacement_months));
    setLoading(true);
    const {error} = await supabase
      .from('items')
      .update({next_replacement_date: next, updated_at: new Date().toISOString()})
      .eq('seq', item.seq);
    setLoading(false);
    if (error) {
      Alert.alert('', '처리에 실패하였습니다.');
      return;
    }
    setNextReplacementOverride(next);
    syncItemReminders();
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
    syncItemReminders();
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
          {scheduleRows.map(row => (
            <View key={row.key}>
              <InfoRow
                icon={row.icon}
                label={row.label}
                value={row.text}
                valueStyle={{color: row.color, fontWeight: '600'}}
              />
              {row.key === 'replacement' && !!item.replacement_months && (
                <Pressable
                  onPress={onReplaced}
                  style={({pressed}) => [styles.replacedBtn, pressed && {opacity: 0.7}]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  <Text style={styles.replacedBtnText}>오늘 교체 완료</Text>
                </Pressable>
              )}
            </View>
          ))}
          {canMute && (
            <View style={styles.notifyRow}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
              <View style={{flex: 1, marginLeft: spacing.sm}}>
                <Text style={styles.notifyLabel}>이 물건 알림 받기</Text>
                <Text style={styles.notifyHint}>끄면 이 물건의 보증·교체·찜·기념일 알림이 오지 않아요</Text>
              </View>
              <Switch value={!muted} onValueChange={onToggleNotify} trackColor={{true: colors.primary}} />
            </View>
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
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.sm,
  },
  notifyLabel: {
    ...typography.body,
    color: colors.text,
  },
  notifyHint: {
    ...typography.small,
    color: colors.textTertiary,
    marginTop: 2,
  },
  replacedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.sm,
  },
  replacedBtnText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
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
