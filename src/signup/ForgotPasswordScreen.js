import React, {useState} from 'react';
import {
  Text,
  StyleSheet,
  SafeAreaView,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {supabase} from '../lib/supabase';
import {CustomAlert} from '../components/ui';
import CustomButton from './customButton';

function ForgotPasswordScreen({navigation}) {
  const [email, setEmail] = useState('');
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

  const checkEmail = str => {
    const emailCheck = /^([0-9a-zA-Z_\.-]+)@([0-9a-zA-Z_-]+)(\.[0-9a-zA-Z_-]+){1,2}$/;
    return emailCheck.test(str);
  };

  const onSubmit = async () => {
    Keyboard.dismiss();

    if (!email || !email.trim()) {
      showAlert('알림', '이메일을 입력해주세요.');
      return;
    }
    if (!checkEmail(email)) {
      showAlert('알림', '이메일 형식이 잘못되었습니다.');
      return;
    }

    setLoading(true);
    try {
      const {error} = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'itemdiary://reset-password',
      });
      if (error) {
        showAlert('오류', '일시적인 오류입니다. 잠시 후 다시 시도해주세요.');
      } else {
        showAlert(
          '이메일 발송 완료',
          '비밀번호 재설정 링크를 이메일로 보냈습니다.\n이메일을 확인해주세요.',
          () => {
            setAlertConfig(prev => ({...prev, visible: false}));
            navigation.goBack();
          },
        );
      }
    } catch (e) {
      showAlert('오류', '일시적인 오류입니다. 잠시 후 다시 시도해주세요.');
      console.log('ForgotPassword error:', e);
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
          <Text style={styles.title}>비밀번호 찾기</Text>
          <Text style={styles.subtitle}>
            가입한 이메일 주소를 입력하면{'\n'}비밀번호 재설정 링크를 보내드립니다.
          </Text>
        </View>

        <View style={styles.inputWrapper}>
          <Text style={styles.label}>이메일</Text>
          <TextInput
            style={styles.input}
            placeholder="이메일을 입력해주세요"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            <CustomButton title="재설정 링크 보내기" onPress={onSubmit} />
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.footer}>
          <Text style={styles.footerText}>
            {'로그인으로 '}
            <Text style={styles.footerLink}>돌아가기</Text>
          </Text>
        </TouchableOpacity>
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
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerLink: {
    color: '#4287f5',
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
