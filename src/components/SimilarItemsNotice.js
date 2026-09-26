// 비슷한 물건 안내 (경고 아님) — 한 줄 안내 + 「보기」를 누르면 아래에서 올라오는 목록 창
// 물건을 누르면 상세 화면으로 이동하고, 뒤로 오면 원래 화면(적던 내용 포함)으로 돌아온다.
import React, {useEffect, useRef, useState} from 'react';
import {View, Text, Image, StyleSheet, Pressable, Modal, Animated} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import {formatPrice} from '../utils/formatPrice';
import {daysUntil} from '../utils/schedule';

const yearMonth = d => {
  if (!d) return '';
  const [y, m] = String(d).split('-');
  return `${y}.${m}`;
};

const warrantyText = item => {
  const days = daysUntil(item.warranty_date);
  if (days === null) return null;
  return days < 0 ? {text: '보증 만료', color: colors.textTertiary} : {text: `보증 중 D-${days}`, color: colors.success};
};

const previewText = items =>
  items
    .slice(0, 2)
    .map(i => `${i.name}${i.item_date ? ` (${yearMonth(i.item_date)})` : ''}`)
    .join(' · ');

// 화면 아래쪽 안내 줄 (누르면 목록 창)
export function SimilarItemsNotice({items, navigation, style}) {
  const [open, setOpen] = useState(false);
  if (!items?.length) return null;
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.bar, style]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
        <View style={{flex: 1, marginLeft: spacing.xs}}>
          <Text style={styles.barTitle}>비슷한 물건이 있어요</Text>
          <Text style={styles.barText} numberOfLines={1}>{previewText(items)}</Text>
        </View>
        <Text style={styles.barLink}>보기</Text>
      </Pressable>
      <SimilarItemsSheet items={items} visible={open} onClose={() => setOpen(false)} navigation={navigation} />
    </>
  );
}

// 화면 위에서 잠깐 내려오는 알림 — 비슷한 물건이 새로 발견되면 5초 동안 보여준다 (누르면 목록 창)
export function SimilarItemsToast({items, navigation, top = 64}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const lastKey = useRef('');
  const key = (items || []).map(i => i.seq).join(',');

  useEffect(() => {
    if (!key || key === lastKey.current) return;
    lastKey.current = key;
    setShown(true);
    Animated.spring(anim, {toValue: 1, useNativeDriver: true, friction: 8}).start();
    const timer = setTimeout(() => hide(), 5000);
    return () => clearTimeout(timer);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const hide = () =>
    Animated.timing(anim, {toValue: 0, duration: 200, useNativeDriver: true}).start(() => setShown(false));

  if (!items?.length) return null;
  return (
    <>
      {shown && (
        <Animated.View
          style={[
            styles.toast,
            {top, opacity: anim, transform: [{translateY: anim.interpolate({inputRange: [0, 1], outputRange: [-20, 0]})}]},
          ]}>
          <Pressable
            onPress={() => {
              hide();
              setOpen(true);
            }}
            style={styles.toastInner}>
            <Ionicons name="information-circle" size={20} color={colors.textInverse} />
            <View style={{flex: 1, marginLeft: spacing.sm}}>
              <Text style={styles.toastTitle}>비슷한 물건이 {items.length}개 있어요</Text>
              <Text style={styles.toastText} numberOfLines={1}>{previewText(items)}</Text>
            </View>
            <Text style={styles.toastLink}>보기</Text>
          </Pressable>
        </Animated.View>
      )}
      <SimilarItemsSheet items={items} visible={open} onClose={() => setOpen(false)} navigation={navigation} />
    </>
  );
}

// 아래에서 올라오는 비슷한 물건 목록 창
export function SimilarItemsSheet({items, visible, onClose, navigation}) {
  const setOpen = v => !v && onClose();
  const open = visible;
  const openItem = item => {
    onClose();
    navigation.navigate('Detail', {data: item});
  };

  return (
    <>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dim} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>비슷한 물건 {items.length}개</Text>
          <Text style={styles.sheetSub}>같은 카테고리에 이름이 비슷한 물건이에요</Text>
          {items.map(item => {
            const w = warrantyText(item);
            return (
              <Pressable key={item.seq} onPress={() => openItem(item)} style={({pressed}) => [styles.row, pressed && {opacity: 0.7}]}>
                {item.image_url ? (
                  <Image source={{uri: item.image_url}} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}>
                    <Ionicons name="image-outline" size={18} color={colors.textTertiary} />
                  </View>
                )}
                <View style={{flex: 1}}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {item.name}
                    {item.is_wishlist ? '  · 찜' : ''}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {[item.item_date && `${yearMonth(item.item_date)} ${item.is_wishlist ? '찜' : '구입'}`, item.price ? `${formatPrice(item.price)}원` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {w && <Text style={[styles.rowMeta, {color: w.color, fontWeight: '600'}]}>{w.text}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </Pressable>
            );
          })}
          <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
            <Text style={styles.closeText}>닫고 계속하기</Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toast: {position: 'absolute', left: spacing.md, right: spacing.md, zIndex: 50, elevation: 8},
  toastInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.92)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  toastTitle: {...typography.captionBold, color: colors.textInverse},
  toastText: {...typography.small, color: 'rgba(255,255,255,0.8)'},
  toastLink: {...typography.captionBold, color: '#93C5FD', marginLeft: spacing.sm},
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  barTitle: {...typography.small, color: colors.textSecondary},
  barText: {...typography.caption, color: colors.text, fontWeight: '600'},
  barLink: {...typography.captionBold, color: colors.primary, marginLeft: spacing.sm},
  dim: {flex: 1, backgroundColor: 'rgba(17,24,39,0.4)'},
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  handle: {width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center'},
  sheetTitle: {...typography.h3, color: colors.text},
  sheetSub: {...typography.small, color: colors.textSecondary, marginTop: -4},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  thumb: {width: 48, height: 48, borderRadius: radius.md},
  thumbEmpty: {backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center'},
  rowName: {...typography.bodyBold, color: colors.text},
  rowMeta: {...typography.small, color: colors.textSecondary, marginTop: 1},
  closeBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
  },
  closeText: {...typography.captionBold, color: colors.textSecondary},
});
