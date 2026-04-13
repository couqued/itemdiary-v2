import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  Animated,
  ToastAndroid,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {supabase} from '../../lib/supabase';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {formatDateISO} from '../../utils/formatDate';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

function ShareModalScreen({sharedData, onClose}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productInfo, setProductInfo] = useState({
    name: '',
    price: 0,
    image_url: '',
    link: '',
    store_name: '',
  });

  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  useEffect(() => {
    if (sharedData) {
      parseSharedData(sharedData);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 50,
      }).start();
    }
  }, [sharedData]);

  const STORE_PATTERNS = [
    {pattern: /naver\.com|nv\.me/, name: '네이버'},
    {pattern: /coupang\.com|cpng\.co/, name: '쿠팡'},
    {pattern: /11st\.co\.kr/, name: '11번가'},
    {pattern: /gmarket\.co\.kr/, name: 'G마켓'},
    {pattern: /auction\.co\.kr/, name: '옥션'},
    {pattern: /ssg\.com/, name: 'SSG'},
    {pattern: /kurly\.com/, name: '마켓컬리'},
    {pattern: /musinsa\.com/, name: '무신사'},
    {pattern: /oliveyoung\.co\.kr/, name: '올리브영'},
    {pattern: /tmon\.co\.kr/, name: '티몬'},
    {pattern: /wemakeprice\.com/, name: '위메프'},
    {pattern: /kyobobook\.co\.kr/, name: '교보문고'},
    {pattern: /yes24\.com/, name: 'YES24'},
    {pattern: /aladin\.co\.kr/, name: '알라딘'},
    {pattern: /29cm\.co\.kr/, name: '29CM'},
    {pattern: /zigzag\.kr/, name: '지그재그'},
    {pattern: /ably\.link|a-bly\.com/, name: '에이블리'},
    {pattern: /daangn\.com/, name: '당근마켓'},
  ];

  const detectStore = (url) => {
    for (const {pattern, name} of STORE_PATTERNS) {
      if (pattern.test(url)) return name;
    }
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  };

  const extractNameFromText = (text, url) => {
    // 공유 텍스트에서 URL을 제거하고 남은 텍스트에서 상품명 추출
    let cleaned = text.replace(/(https?:\/\/[^\s]+)/g, '').trim();
    // 앱별 불필요한 문구 제거
    cleaned = cleaned
      .replace(/이 상품 어때요\?.*?만나보세요!?/g, '')
      .replace(/쿠팡에서 만나보세요!?/g, '')
      .replace(/- 쿠팡!?$/g, '')
      .replace(/: 네이버쇼핑$/g, '')
      .replace(/\[쿠팡\]\s*/g, '')
      // 무신사
      .replace(/무신사 스토어에서 공유합니다\.?\s*/g, '')
      .replace(/\[무신사\]\s*/g, '')
      .replace(/무신사에서 확인해보세요!?\s*/g, '')
      // 교보문고
      .replace(/\[교보문고\]\s*/g, '')
      .replace(/교보문고에서 공유합니다\.?\s*/g, '')
      .replace(/교보문고에서 확인해보세요!?\s*/g, '')
      // 네이버
      .replace(/네이버에서 공유합니다\.?\s*/g, '')
      .replace(/\[네이버 쇼핑\]\s*/g, '')
      .replace(/네이버 쇼핑에서 확인해보세요!?\s*/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return cleaned || '';
  };

  const extractPriceFromText = (text) => {
    // 공유 텍스트에서 가격 추출 (예: "12,900원", "₩12,900")
    const m =
      text.match(/([0-9]{1,3}(?:,[0-9]{3})+)\s*원/) ||
      text.match(/₩\s*([0-9]{1,3}(?:,[0-9]{3})+)/) ||
      text.match(/([0-9]{4,})\s*원/);
    if (m) {
      return parseInt(m[1].replace(/[^0-9]/g, ''), 10) || 0;
    }
    return 0;
  };

  const fetchPage = async (url, extraHeaders = {}) => {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...extraHeaders,
      },
      redirect: 'follow',
    });
    return {html: await response.text(), finalUrl: response.url};
  };

  const extractRedirectUrl = (html) => {
    // JS redirect: location.href = "..." / location.replace("...")
    const jsMatch =
      html.match(/location\.(?:href|replace)\s*[=(]\s*["']([^"']+)["']/i) ||
      html.match(/window\.location\s*=\s*["']([^"']+)["']/i);
    if (jsMatch) return jsMatch[1];
    // meta refresh
    const metaMatch = html.match(
      /<meta[^>]+http-equiv=["']refresh["'][^>]+content=["'][^"']*url=([^"'\s>]+)/i,
    );
    if (metaMatch) return metaMatch[1];
    return null;
  };

  const parseOgFromHtml = (html, url = '') => {
    const getOg = (prop) => {
      const m =
        html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'));
      return m ? m[1].trim() : '';
    };

    const getMeta = (name) => {
      const m =
        html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
      return m ? m[1].trim() : '';
    };

    const title =
      getOg('og:title') ||
      (() => {
        const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return m ? m[1].trim() : '';
      })();

    let image = getOg('og:image') || getMeta('twitter:image') || getMeta('thumbnail');
    if (image && image.startsWith('//')) {
      image = 'https:' + image;
    }
    // 쿠팡: og:image가 없을 때 상품 이미지 추출
    if (!image && /coupang/.test(url)) {
      const imgMatch =
        html.match(/<img[^>]+id=["']repImage["'][^>]+src=["']([^"']+)["']/i) ||
        html.match(/<img[^>]+class=["'][^"']*prod-image[^"']*["'][^>]+src=["']([^"']+)["']/i) ||
        html.match(/<img[^>]+src=["'](https:\/\/thumbnail[^"']+coupangcdn\.com[^"']+)["']/i);
      if (imgMatch) {
        image = imgMatch[1];
        if (image.startsWith('//')) image = 'https:' + image;
      }
    }

    // 가격 추출: 여러 패턴 시도
    let price = 0;

    // 1) product:price:amount / product:sale_price:amount
    const priceOg =
      getOg('product:price:amount') ||
      getOg('product:sale_price:amount') ||
      getOg('og:price:amount');
    if (priceOg) {
      price = parseInt(priceOg.replace(/[^0-9]/g, ''), 10) || 0;
    }

    // 2) JSON-LD Product schema
    if (!price) {
      const ldMatches = html.match(
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
      );
      if (ldMatches) {
        for (const block of ldMatches) {
          try {
            const content = block.replace(/<\/?script[^>]*>/gi, '');
            const json = JSON.parse(content);
            const findProduct = (obj) => {
              if (!obj) return null;
              if (obj['@type'] === 'Product') return obj;
              if (Array.isArray(obj['@graph'])) {
                return obj['@graph'].find((n) => n['@type'] === 'Product');
              }
              if (Array.isArray(obj)) {
                for (const item of obj) {
                  if (item['@type'] === 'Product') return item;
                }
              }
              return null;
            };
            const product = findProduct(json);
            if (product?.offers) {
              const offer = Array.isArray(product.offers)
                ? product.offers[0]
                : product.offers;
              const p = offer?.price || offer?.lowPrice;
              if (p) {
                price = parseInt(String(p).replace(/[^0-9]/g, ''), 10) || 0;
              }
            }
            // JSON-LD에서 이미지도 보완
            if (!image && product?.image) {
              const img = Array.isArray(product.image) ? product.image[0] : product.image;
              if (typeof img === 'string') image = img;
            }
            if (price) break;
          } catch {}
        }
      }
    }

    // 3) 가격 meta (네이버 등)
    if (!price) {
      const priceMeta = getMeta('product:price') || getMeta('product:sale_price');
      if (priceMeta) {
        price = parseInt(priceMeta.replace(/[^0-9]/g, ''), 10) || 0;
      }
    }

    // 4) 쿠팡 전용: HTML에서 가격 추출
    if (!price && /coupang/.test(url)) {
      const coupangPrice =
        html.match(/class=["'][^"']*total-price[^"']*["'][^>]*>[\s]*([0-9,]+)/i) ||
        html.match(/class=["']price-value["'][^>]*>([0-9,]+)/i) ||
        html.match(/"salePrice"\s*:\s*"?([0-9,]+)"?/i) ||
        html.match(/"price"\s*:\s*"?([0-9,]+)"?/i);
      if (coupangPrice) {
        price = parseInt(coupangPrice[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
    }

    // 5) 네이버 전용: HTML/스크립트에서 가격 추출
    if (!price && /naver\.com|nv\.me/.test(url)) {
      const naverPrice =
        html.match(/"discountedSalePrice"\s*:\s*"?([0-9,]+)"?/i) ||
        html.match(/"salePrice"\s*:\s*"?([0-9,]+)"?/i) ||
        html.match(/"price"\s*:\s*"?([0-9,]+)"?/i) ||
        html.match(/["']lowPrice["']\s*:\s*"?([0-9,]+)"?/i) ||
        html.match(/class=["'][^"']*_price[^"']*["'][^>]*>[\s]*([0-9,]+)/i);
      if (naverPrice) {
        price = parseInt(naverPrice[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
    }

    // 6) 무신사 전용
    if (!price && /musinsa/.test(url)) {
      const musinsaPrice =
        html.match(/"price"\s*:\s*"?([0-9,]+)"?/) ||
        html.match(/"salePrice"\s*:\s*"?([0-9,]+)"?/) ||
        html.match(/class=["'][^"']*price[^"']*["'][^>]*>\s*([0-9,]+)/i);
      if (musinsaPrice) {
        price = parseInt(musinsaPrice[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
    }

    // 7) 교보문고 전용
    if (!price && /kyobobook/.test(url)) {
      const kyoboPrice =
        html.match(/"price"\s*:\s*"?([0-9,]+)"?/) ||
        html.match(/class=["'][^"']*sale_price[^"']*["'][^>]*>\s*([0-9,]+)/i) ||
        html.match(/class=["'][^"']*prod_price[^"']*["'][^>]*>\s*([0-9,]+)/i);
      if (kyoboPrice) {
        price = parseInt(kyoboPrice[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
    }

    // 8) 범용: HTML 내 가격 패턴 (최후 수단)
    if (!price) {
      const generalPrice =
        html.match(/itemprop=["']price["'][^>]+content=["']([0-9,]+)["']/i) ||
        html.match(/data-price=["']([0-9,]+)["']/i);
      if (generalPrice) {
        price = parseInt(generalPrice[1].replace(/[^0-9]/g, ''), 10) || 0;
      }
    }

    return {title, image, price};
  };

  const fetchOgMetadata = async (url) => {
    try {
      // 1차 fetch
      let {html, finalUrl} = await fetchPage(url);

      // redirect 페이지 감지 (title이 redirect 관련이면 JS redirect 추적)
      const titleCheck = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const isRedirectPage =
        (titleCheck && /redirect|리다이렉트/i.test(titleCheck[1])) ||
        html.length < 3000;

      if (isRedirectPage) {
        const redirectUrl = extractRedirectUrl(html);
        if (redirectUrl) {
          const absUrl = redirectUrl.startsWith('http')
            ? redirectUrl
            : new URL(redirectUrl, finalUrl).href;
          try {
            const result = await fetchPage(absUrl);
            html = result.html;
            finalUrl = result.finalUrl;
          } catch {}
        }
      }

      return parseOgFromHtml(html, finalUrl);
    } catch (e) {
      console.warn('OG metadata fetch failed:', e);
      return {title: '', image: '', price: 0};
    }
  };

  const parseSharedData = async (data) => {
    try {
      const text = data.data || '';
      console.log('[Share] Raw shared text:', text);

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      const url = matches ? matches[0] : null;

      if (!url) {
        setProductInfo(prev => ({...prev, name: text || '공유된 아이템'}));
        setLoading(false);
        return;
      }

      console.log('[Share] Extracted URL:', url);

      // 공유 텍스트에서 상품명, 가격 추출 (URL 제외한 부분)
      const textName = extractNameFromText(text, url);
      const textPrice = extractPriceFromText(text);
      const storeName = detectStore(url);

      console.log('[Share] Text name:', textName, '| Text price:', textPrice, '| Store:', storeName);

      const og = await fetchOgMetadata(url);

      console.log('[Share] OG result:', {title: og.title?.substring(0, 50), image: og.image ? 'YES' : 'NO', price: og.price});

      // 이름 우선순위: OG title (유효한 경우) > 공유 텍스트 > 기본값
      const isOgTitleValid =
        og.title &&
        !/redirect|리다이렉트|loading|just a moment|checking/i.test(og.title) &&
        og.title.length > 1;

      setProductInfo({
        name: isOgTitleValid ? og.title : textName || '공유된 상품',
        price: og.price || textPrice,
        image_url: og.image || '',
        link: url,
        store_name: storeName,
      });

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) {
        ToastAndroid.show('로그인이 필요합니다.', ToastAndroid.SHORT);
        onClose();
        return;
      }

      const {error} = await supabase.from('items').insert({
        name: productInfo.name,
        price: productInfo.price,
        image_url: productInfo.image_url || null,
        item_date: formatDateISO(new Date()),
        store_name: productInfo.store_name || null,
        link: productInfo.link || null,
        is_wishlist: true,
        user_id: user.email,
      });

      if (error) throw error;

      ToastAndroid.show('찜 목록에 등록되었습니다.', ToastAndroid.SHORT);
      onClose();
    } catch (e) {
      const msg =
        e?.message?.includes('duplicate')
          ? '이미 등록된 상품입니다.'
          : e?.message?.includes('network') || e?.message?.includes('fetch')
            ? '네트워크 연결을 확인해주세요.'
            : `저장에 실패했습니다. (${e?.message || '알 수 없는 오류'})`;
      ToastAndroid.show(msg, ToastAndroid.LONG);
      setSaving(false);
    }
  };

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.dismissArea} onPress={handleClose} />
      <Animated.View
        style={[styles.bottomSheet, {transform: [{translateY: slideAnim}]}]}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>위시리스트(찜)에 추가할까요?</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>상품 정보를 읽어오는 중...</Text>
            </View>
          ) : (
            <View style={styles.productBox}>
              {productInfo.image_url ? (
                <Image
                  source={{uri: productInfo.image_url}}
                  style={styles.productImage}
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons
                    name="link-outline"
                    size={40}
                    color={colors.border}
                  />
                </View>
              )}
              <View style={styles.infoBox}>
                <Text style={styles.productName} numberOfLines={2}>
                  {productInfo.name}
                </Text>
                {productInfo.store_name ? (
                  <Text style={styles.storeName}>
                    {productInfo.store_name}
                  </Text>
                ) : null}
                {productInfo.price > 0 ? (
                  <Text style={styles.priceText}>
                    {productInfo.price.toLocaleString()}원
                  </Text>
                ) : null}
                <Text style={styles.link} numberOfLines={1}>
                  {productInfo.link}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSave}
            disabled={loading || saving}
            style={({pressed}) => [
              styles.saveBtn,
              (loading || saving) && styles.disabledBtn,
              pressed && styles.saveBtnPressed,
            ]}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>찜 목록에 저장하기</Text>
            )}
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  dismissArea: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl + 20,
    minHeight: 350,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.text,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  content: {
    marginBottom: spacing.xl,
  },
  loadingBox: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  productBox: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flex: 1,
    marginLeft: spacing.md,
  },
  productName: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: 4,
  },
  storeName: {
    ...typography.captionBold,
    color: colors.primary,
    marginBottom: 2,
  },
  priceText: {
    ...typography.bodyBold,
    color: colors.text,
    marginBottom: 2,
  },
  link: {
    ...typography.small,
    color: colors.textTertiary,
  },
  footer: {
    width: '100%',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  disabledBtn: {
    backgroundColor: colors.textTertiary,
  },
  saveBtnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
});

export default ShareModalScreen;
