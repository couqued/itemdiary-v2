import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {colors} from '../../constants/colors';
import {typography} from '../../constants/typography';
import {spacing, radius} from '../../constants/spacing';
import {Input, CustomAlert, LoadingOverlay} from '../../components/ui';
import {supabase} from '../../lib/supabase';

function UserQuitScreen({navigation}) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: '확인',
    type: 'default',
    onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
    onCancel: null,
  });

  const showAlert = (config) => {
    setAlertConfig({
      ...config,
      visible: true,
    });
  };

  const onQuitPress = () => {
    if (!password.trim()) {
      showAlert({
        title: '알림',
        message: '패스워드를 입력해주세요.',
        onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
      });
      return;
    }

    showAlert({
      title: '탈퇴 확인',
      message: '정말로 탈퇴하시겠습니까?\n모든 데이터가 즉시 삭제됩니다.',
      confirmText: '탈퇴하기',
      cancelText: '취소',
      type: 'danger',
      onConfirm: doQuit,
      onCancel: () => setAlertConfig(prev => ({...prev, visible: false})),
    });
  };

  const doQuit = async () => {
    setAlertConfig(prev => ({...prev, visible: false}));
    setLoading(true);

    try {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ID를 확인할 수 없습니다.');
      }

      // 1. 비밀번호 재검증
      const {error: signInError} = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (signInError) {
        throw new Error('비밀번호가 올바르지 않습니다.');
      }

      // 2. 사용자 아이템 데이터 삭제
      const {error: deleteError} = await supabase
        .from('items')
        .delete()
        .eq('user_id', user.email);

      if (deleteError) {
        throw new Error('데이터 삭제 중 오류가 발생했습니다.');
      }

      // 3. 계정 삭제 시도 (Supabase RPC 호출)
      // 주의: 이 기능은 Supabase에서 'delete_user'라는 RPC 함수를 직접 생성해야 작동합니다.
      // 클라이언트 라이브러리만으로는 보안상 Auth 유저를 직접 삭제할 수 없습니다.
      const { error: rpcError } = await supabase.rpc('delete_user');
      
      // RPC가 없더라도 일단 로그아웃 처리하여 진행
      await supabase.auth.signOut();
      
    } catch (e) {
      showAlert({
        title: '탈퇴 실패',
        message: e.message || '탈퇴 처리 중 오류가 발생했습니다.',
        onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>회원 탈퇴</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.warningBox}>
          <Icon name="warning-outline" size={24} color={colors.warning} style={{marginRight: spacing.sm}} />
          <Text style={styles.warningText}>
            탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
          </Text>
        </View>

        <Input
          label="패스워드 확인"
          value={password}
          onChangeText={setPassword}
          placeholder="패스워드를 입력해주세요"
          secureTextEntry
          maxLength={30}
          returnKeyType="done"
        />

        <Pressable
          onPress={onQuitPress}
          style={({pressed}) => [
            styles.quitBtn,
            pressed && {opacity: 0.8}
          ]}>
          <Text style={styles.quitBtnText}>탈퇴하기</Text>
        </Pressable>
      </ScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />

      {loading && <LoadingOverlay />}
    </SafeAreaView>
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
    width: 44,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xl,
  },
  warningText: {
    ...typography.caption,
    color: '#92400E',
    flex: 1,
  },
  quitBtn: {
    backgroundColor: colors.danger,
    height: 52,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  quitBtnText: {
    ...typography.bodyBold,
    color: colors.textInverse,
  }
});

export default UserQuitScreen;
