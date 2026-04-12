import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';
import {useIsFocused} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing} from '../../constants/spacing';
import {SafeAreaView} from 'react-native-safe-area-context';
import Config from 'react-native-config';
import {CustomAlert} from '../../components/ui/CustomAlert';
import {useCategories} from '../../hooks/useCategories';

// 네이버 API 정보
const NAVER_CLIENT_ID = Config.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = Config.NAVER_CLIENT_SECRET;

function BarcodeScanScreen({navigation}) {
  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  const {categories} = useCategories();
  const [hasPermission, setHasPermission] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDetected, setIsDetected] = useState(false); // 인식 성공 피드백용

  // Alert State
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: null,
  });

  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 화면이 다시 포커스되면 상태 리셋
  useEffect(() => {
    if (isFocused) {
      setIsActive(true);
      setLoading(false);
      setIsDetected(false);
    } else {
      setIsActive(false);
    }
  }, [isFocused]);

  const showAlert = (config) => {
    setAlertConfig({...config, visible: true});
  };

  // 네이버 카테고리 -> 우리 앱 카테고리 매칭 함수
  const matchCategory = (item, appCategories) => {
    if (!appCategories || appCategories.length === 0) return null;

    const nCat1 = item.category1 || '';
    const nCat2 = item.category2 || '';
    const nCat3 = item.category3 || '';

    let targetName = '기타'; // 기본값

    // 1. 네이버 대분류 기준 매칭
    if (nCat1.includes('의류') || nCat1.includes('패션의류')) {
      targetName = '의류';
    } else if (nCat1.includes('디지털') || nCat1.includes('가전')) {
      // 중분류로 전자기기/가전 구분
      if (nCat2.includes('PC') || nCat2.includes('모바일') || nCat2.includes('휴대폰') || nCat2.includes('음향') || nCat2.includes('카메라')) {
        targetName = '전자기기';
      } else {
        targetName = '가전';
      }
    } else if (nCat1.includes('가구') || nCat1.includes('인테리어')) {
      targetName = '가구';
    } else if (nCat1.includes('패션잡화')) {
      if (nCat2.includes('신발') || nCat3.includes('신발')) targetName = '신발';
      else if (nCat2.includes('가방') || nCat3.includes('가방')) targetName = '가방';
      else targetName = '잡화';
    } else if (nCat1.includes('식품')) {
      targetName = '식품';
    } else if (nCat1.includes('도서')) {
      targetName = '도서';
    } else if (nCat1.includes('화장품') || nCat1.includes('미용')) {
      targetName = '뷰티';
    } else if (nCat1.includes('생활/건강')) {
      targetName = '생활용품';
    }

    // 2. 우리 앱 카테고리에서 ID 찾기
    const matchedCat = appCategories.find(c => c.name === targetName);
    return matchedCat ? matchedCat.seq : null;
  };

  const onCodeScanned = useCallback(async (codes) => {
    if (codes.length > 0 && isActive && !loading && isFocused && !isDetected) {
      const code = codes[0].value;
      if (!code) return;
      
      console.log('Scanned barcode:', code);
      
      // 1. 인식 성공 시각적 피드백 (테두리 초록색)
      setIsDetected(true);
      
      // 2. 약 0.4초 대기 후 로딩/API 진행 (사용자 인지용 지연 시간 단축)
      setTimeout(async () => {
        setIsActive(false);
        setLoading(true);

        try {
          console.log('--- Naver API Request Start ---');
          console.log('Query (Barcode):', code);
          console.log('Client ID:', NAVER_CLIENT_ID ? 'Set' : 'Not Set');

          const isBook = code.startsWith('978') || code.startsWith('979');
          const apiUrl = isBook 
            ? 'https://openapi.naver.com/v1/search/book_adv.json' 
            : 'https://openapi.naver.com/v1/search/shop.json';
            
          const apiParams = isBook 
            ? { d_isbn: code, display: 1 } 
            : { query: code, display: 5, sort: 'sim' };

          // 네이버 API 호출 (도서 또는 쇼핑)
          const response = await axios.get(apiUrl, {
            params: apiParams,
            headers: {
              'X-Naver-Client-Id': NAVER_CLIENT_ID,
              'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
            },
          });

          console.log('--- Naver API Response Success ---');
          const items = response.data.items;
          const total = response.data.total;

          if (items && items.length > 0) {
            const item = items[0];
            
            // 제목 가공: HTML 태그 제거 및 괄호 안의 바코드 번호 패턴 제거
            let cleanTitle = item.title.replace(/<[^>]*>?/gm, ''); // HTML 태그 제거
            cleanTitle = cleanTitle.replace(/\(\d+\)/g, '').trim(); // (숫자) 패턴 제거
            cleanTitle = cleanTitle.replace(/\[\d+\]/g, '').trim(); // [숫자] 패턴 제거

            // 카테고리 자동 매칭 (도서일 경우 '도서' 카테고리 고정)
            const matchedCategoryId = isBook 
              ? matchCategory({ category1: '도서' }, categories) 
              : matchCategory(item, categories);

            const prefilledData = {
              name: cleanTitle,
              price: isBook ? (item.discount || item.price) : item.lprice,
              image_url: item.image,
              link: item.link,
              store_name: isBook ? item.publisher : item.mallName,
              category_id: matchedCategoryId,
            };
            
            navigation.navigate('ItemForm', {prefilledData});
          } else {
            // 결과 없음 팝업에 바코드 번호 포함
            showAlert({
              title: '검색 결과 없음',
              message: `인식된 바코드: ${code}\n네이버 검색 결과: ${total}개\n\n해당 바코드로 등록된 상품 정보를 찾을 수 없습니다. 직접 입력하시겠습니까?`,
              confirmText: '직접 입력',
              cancelText: '다시 시도',
              onConfirm: () => {
                setAlertConfig(prev => ({...prev, visible: false}));
                navigation.navigate('ItemForm');
              },
              onCancel: () => {
                setAlertConfig(prev => ({...prev, visible: false}));
                setIsDetected(false);
                setIsActive(true);
              },
            });
          }
        } catch (error) {
          console.error('Naver API Error:', error?.response?.data || error.message);
          const errorDetail = error?.response?.data || error.message;
          const status = error?.response?.status;

          showAlert({
            title: 'API 호출 오류',
            message: `바코드: ${code}\n상태코드: ${status}\n메시지: ${JSON.stringify(errorDetail)}\n\n네트워크 또는 API 설정을 확인해주세요.`,
            confirmText: '확인',
            onConfirm: () => {
              setAlertConfig(prev => ({...prev, visible: false}));
              setIsDetected(false);
              setIsActive(true);
            },
          });
        } finally {
          setLoading(false);
        }
      }, 800);
    }
  }, [isActive, loading, isFocused, isDetected, navigation]);

  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128', 'qr'],
    onCodeScanned: onCodeScanned,
  });

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라 권한이 필요합니다.</Text>
        <Pressable
          style={styles.button}
          onPress={() => Camera.requestCameraPermission()}>
          <Text style={styles.buttonText}>권한 요청</Text>
        </Pressable>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>카메라 장치를 찾을 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={colors.textInverse} />
        </Pressable>
        <Text style={styles.headerTitle}>바코드 스캔</Text>
        <View style={{width: 40}} />
      </View>

      <View style={styles.cameraContainer}>
        {isFocused && (
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive={isActive}
            codeScanner={codeScanner}
          />
        )}
        
        {/* 가이드 라인 */}
        <View style={styles.overlay}>
          <View style={[
            styles.scanArea,
            isDetected && {borderColor: '#4CAF50', borderWidth: 3} // 인식 시 초록색
          ]} />
          <Text style={styles.guideText}>
            {isDetected ? '인식 성공!' : '바코드를 사각형 안에 맞춰주세요'}
          </Text>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>상품 정보 찾는 중...</Text>
          </View>
        )}
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textInverse,
  },
  backBtn: {
    padding: spacing.sm,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  scanArea: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  guideText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    marginTop: spacing.lg,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 4,
  },
  text: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyBold,
    color: colors.textInverse,
    marginTop: spacing.md,
  },
});

export default BarcodeScanScreen;
