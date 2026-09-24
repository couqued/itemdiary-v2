import React, {useState} from 'react';
import {
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {supabase} from '../lib/supabase';
import {CustomAlert} from '../components/ui';
import CustomButton from './customButton';

function ResetPasswordScreen({navigation}) {
  const [form, setForm] = useState({password: '', confirmPassword: ''});
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
  });

  const showAlert = (title, message, onConfirm) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm: onConfirm || (() => setAlertConfig(prev => ({...prev, visible: false}))),
    });
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    const {password, confirmPassword} = form;

    if (!password || !password.trim()) {
      showAlert('알림', '새 비밀번호를 입력해주세요.');
      return;
    }
    if (password.length < 6) {
      showAlert('알림', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('알림', '비밀번호가 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const {error} = await supabase.auth.updateUser({password});
      if (error) {
        showAlert('오류', '비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
      } else {
        showAlert(
          '변경 완료',
          '비밀번호가 성공적으로 변경되었습니다.',
          async () => {
            setAlertConfig(prev => ({...prev, visible: false}));
            await supabase.auth.signOut();
          },
        );
      }
    } catch (e) {
      showAlert('오류', '일시적인 오류입니다. 잠시 후 다시 시도해주세요.');
      console.log('ResetPassword error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.block}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        extraScrollHeight={20}
        enableOnAndroid={true}>
        <View style={styles.header}>
          <Text style={styles.title}>새 비밀번호 설정</Text>
          <Text style={styles.subtitle}>사용할 새 비밀번호를 입력해주세요.</Text>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>새 비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="6자 이상 입력해주세요"
            value={form.password}
            onChangeText={v => setForm(prev => ({...prev, password: v}))}
            secureTextEntry
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>새 비밀번호 확인</Text>
          <TextInput
            style={styles.input}
            placeholder="비밀번호를 다시 입력해주세요"
            value={form.confirmPassword}
            onChangeText={v => setForm(prev => ({...prev, confirmPassword: v}))}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={onSubmit}
          />
        </View>

        {loading ? (
          <View style={styles.spinnerWrapper}>
            <ActivityIndicator size={32} color="#4287f5" />
          </View>
        ) : (
          <View style={styles.buttons}>
            <CustomButton title="비밀번호 변경" onPress={onSubmit} />
          </View>
        )}
      </KeyboardAwareScrollView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  block: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  buttons: {
    marginTop: 8,
  },
  spinnerWrapper: {
    marginTop: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ResetPasswordScreen;
