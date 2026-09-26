// 복사한 쇼핑몰 링크 자동 인식 — 네이버처럼 자체 공유 창만 있는 곳에서 「URL복사」 후 앱을 열면
// "복사한 링크를 찜에 추가할까요?" 를 보여주고, 「추가」를 누르면 공유하기와 같은 찜 추가 창을 연다.
//
// - 앱을 열거나 앱으로 돌아올 때 한 번만 클립보드를 확인한다
//   (안드로이드 12+ 는 클립보드를 읽으면 "붙여넣음" 표시가 잠깐 뜨므로 자주 읽지 않는다)
// - 쇼핑몰 링크일 때만, 같은 링크는 한 번만 묻는다
import React, {useEffect, useRef, useState} from 'react';
import {View, Text, StyleSheet, Pressable, Modal, AppState} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';
import {spacing, radius} from '../constants/spacing';
import ShareModalScreen from '../screens/items/ShareModalScreen';

const HANDLED_KEY = 'clipboard_handled_link';

// 쇼핑몰·단축 링크 (공유하기에서 인식하는 곳과 같게)
const SHOP_LINK = /(naver\.me|naver\.com|nv\.me|coupang\.com|coupa\.ng|cpng\.co|11st\.co\.kr|gmarket\.co\.kr|auction\.co\.kr|ssg\.com|kurly\.com|musinsa\.com|oliveyoung\.co\.kr|tmon\.co\.kr|wemakeprice\.com|kyobobook\.co\.kr|yes24\.com|aladin\.co\.kr|29cm\.co\.kr|zigzag\.kr|a-bly\.com|ably\.link|lotteon\.com|hmall\.com|gsshop\.com|ohou\.se|aliexpress\.com|temu\.com|amazon\.)/i;

const storeLabel = url => {
  const map = [
    [/naver/, '네이버'], [/coupa/, '쿠팡'], [/cpng/, '쿠팡'], [/11st/, '11번가'], [/gmarket/, 'G마켓'],
    [/auction/, '옥션'], [/ssg/, 'SSG'], [/kurly/, '컬리'], [/musinsa/, '무신사'], [/oliveyoung/, '올리브영'],
    [/29cm/, '29CM'], [/ohou/, '오늘의집'], [/lotteon/, '롯데ON'],
  ];
  const hit = map.find(([re]) => re.test(url));
  return hit ? hit[1] : '쇼핑몰';
};

export function ClipboardLinkPrompt({onAdded}) {
  const [clip, setClip] = useState(null); // {text, url}
  const [sharing, setSharing] = useState(false);
  const checking = useRef(false);

  const check = async () => {
    if (checking.current) return;
    checking.current = true;
    try {
      if (!(await Clipboard.hasString())) return;
      const text = (await Clipboard.getString())?.trim();
      const url = text?.match(/https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'*+,;=%]+/)?.[0]?.replace(/[.,)!?]+$/, '');
      if (!url || !SHOP_LINK.test(url)) return;
      let handled = null;
      try {
        handled = await AsyncStorage.getItem(HANDLED_KEY);
      } catch (e) {}
      if (handled === url) return;
      setClip({text, url});
    } catch (e) {
    } finally {
      checking.current = false;
    }
  };

  useEffect(() => {
    // 앱이 화면에 완전히 뜬 뒤 읽어야 안드로이드가 클립보드를 준다
    const first = setTimeout(check, 800);
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') setTimeout(check, 600);
    });
    return () => {
      clearTimeout(first);
      sub.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markHandled = async () => {
    try {
      if (clip?.url) await AsyncStorage.setItem(HANDLED_KEY, clip.url);
    } catch (e) {}
  };

  const dismiss = async () => {
    await markHandled();
    setClip(null);
  };

  const add = async () => {
    await markHandled();
    setSharing(true);
  };

  if (!clip) return null;

  return (
    <>
      {!sharing && (
        <View style={styles.banner}>
          <Ionicons name="clipboard-outline" size={20} color={colors.primaryDark} />
          <View style={{flex: 1, marginLeft: spacing.sm}}>
            <Text style={styles.title}>복사한 링크를 찜에 추가할까요?</Text>
            <Text style={styles.sub} numberOfLines={1}>
              {storeLabel(clip.url)} · {clip.url}
            </Text>
          </View>
          <Pressable onPress={add} style={styles.addBtn}>
            <Text style={styles.addText}>추가</Text>
          </Pressable>
          <Pressable onPress={dismiss} hitSlop={10} style={{marginLeft: spacing.xs}}>
            <Ionicons name="close" size={18} color={colors.textTertiary} />
          </Pressable>
        </View>
      )}

      {/* 공유하기와 같은 찜 추가 창을 앱 안에서 연다 */}
      <Modal visible={sharing} transparent animationType="none" onRequestClose={() => setSharing(false)}>
        <ShareModalScreen
          sharedData={{data: clip.text, mimeType: 'text/plain'}}
          onClose={() => {
            setSharing(false);
            setClip(null);
            onAdded?.();
          }}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
  },
  title: {...typography.captionBold, color: colors.primaryDark},
  sub: {...typography.small, color: colors.primaryDark, opacity: 0.8},
  addBtn: {backgroundColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 6},
  addText: {...typography.small, fontWeight: '700', color: colors.textInverse},
});
