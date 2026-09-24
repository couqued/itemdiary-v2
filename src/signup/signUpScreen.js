/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useState, useEffect} from 'react';
 import {Text, StyleSheet, SafeAreaView, View, Platform,
  Keyboard, KeyboardAvoidingView, Alert, TouchableOpacity} from 'react-native';

 import SignUpForm from './signUpForm';
 import SignUpButton from './signUpButton';
 import Splash from '../../src/utils/splash'; // This is likely the custom loading screen
 import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
 import { supabase } from '../lib/supabase';
 import { CustomAlert } from '../components/ui';

 function SignUpScreen ({navigation, route}) {
   const [isAuthLoading, setIsAuthLoading] = useState(false); // 단일 로딩 상태로 관리

   const {isSignUp} = route.params || {};
   const [form, setForm] = useState({
     email: '',
     password: '',
     confirmPassword: '',
   });

   const [alertConfig, setAlertConfig] = useState({
     visible: false,
     title: '',
     message: '',
     onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
   });

   const createChangeTextHandler = (name) => (value) => {
     setForm({...form, [name]: value});
   };

   const checkEmail = (str) => {
       var emailCheck = /^([0-9a-zA-Z_\.-]+)@([0-9a-zA-Z_-]+)(\.[0-9a-zA-Z_-]+){1,2}$/;
       if(!emailCheck.test(str)) {
         return false;
       }else {
         return true;
       }
   }

   const showAlert = (title, message) => {
     setAlertConfig({
       visible: true,
       title,
       message,
       onConfirm: () => setAlertConfig(prev => ({...prev, visible: false})),
     });
   };

   const onSubmit = async () => {
     Keyboard.dismiss();

     const {email, password, confirmPassword} = form;
     const info = {email, password, confirmPassword};

     if(null === email || "" == email.trim()){
        showAlert('알림', '이메일을 입력해주세요.');
        return;
     }else{
        if(!checkEmail(email))	{
          showAlert('알림', '이메일 형식이 잘못되었습니다.');
          return;
        }
     }

     if(null === password || "" == password.trim()){
      showAlert('알림', '비밀번호를 입력해주세요.');
      return;
     }
     if(isSignUp && (password !== confirmPassword)){
      showAlert('알림', '비밀번호가 일치하지 않습니다. 동일한 비밀번호를 입력해주세요.');
      return;
     }

     setIsAuthLoading(true);

    try {
      isSignUp ? await signUp(info) : await logIn(info);

    } catch (e) {
      showAlert('오류', '일시적인 오류입니다. 잠시 후 다시 이용해주세요.');
      console.log("error : " + e);
    } finally {
      setIsAuthLoading(false);
    }
   };

  const logIn = async ({email, password}) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert('로그인 실패', '아이디 또는 패스워드를 확인해주세요.');
    }
  };

  const signUp = async ({email, password}) => {
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({ email, password });

    if (error) {
      showAlert('가입 실패', error.message);
    } else {
      if (!session) {
        showAlert('알림', '인증 이메일이 발송되었습니다. 이메일을 확인해주세요.');
      }
    }
  };

   return (
     <SafeAreaView style={styles.block}>
       <KeyboardAwareScrollView
         contentContainerStyle={styles.scrollContent}
         extraScrollHeight={20}
         enableOnAndroid={true}
       >
         <View style={styles.header}>
           <Text style={styles.title}>아이템 다이어리</Text>
           <Text style={styles.subtitle}>
             {isSignUp ? '계정을 생성하고 나만의 아이템을 관리하세요' : '반가워요! 다시 만나서 기뻐요'}
           </Text>
         </View>

         <SignUpForm
           isSignUp={isSignUp}
           form={form}
           createChangeTextHandler={createChangeTextHandler}
           onSubmit={onSubmit}
         />

         <SignUpButton
           isSignUp={isSignUp}
           onSubmit={onSubmit}
           loading={isAuthLoading} // 버튼 내부 로딩만 사용
         />

         {!isSignUp && (
           <TouchableOpacity
             onPress={() => navigation.push('ForgotPassword')}
             style={styles.forgotPassword}
           >
             <Text style={styles.forgotPasswordText}>비밀번호를 잊으셨나요?</Text>
           </TouchableOpacity>
         )}

         <TouchableOpacity
           onPress={() => navigation.setParams({isSignUp: !isSignUp})}
           style={styles.footer}
         >
           <Text style={styles.footerText}>
             {isSignUp ? '이미 계정이 있으신가요? ' : '아직 계정이 없으신가요? '}
             <Text style={styles.footerLink}>{isSignUp ? '로그인' : '회원가입'}</Text>
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
   footer: {
     marginTop: 'auto',
     alignItems: 'center',
     paddingVertical: 20,
   },
   forgotPassword: {
     alignItems: 'center',
     paddingVertical: 12,
     marginTop: 8,
   },
   forgotPasswordText: {
     fontSize: 14,
     color: '#4287f5',
   },
   footerText: {
     fontSize: 14,
     color: '#666',
   },
   footerLink: {
     color: '#4287f5',
     fontWeight: 'bold',
   }
 });

 export default SignUpScreen;
