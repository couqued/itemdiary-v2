/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
//아직사용안함
//TODO 이메일 인증 개발
import React, {useState} from 'react';
import {Text, StyleSheet, SafeAreaView, View, Platform,
 Keyboard, KeyboardAvoidingView, Alert} from 'react-native';

import SignUpForm from './signUpForm';
import SignUpButton from './signUpButton';
import { supabase } from '../lib/supabase';


function SignUpScreenEmail ({navigation, route}) {
  const {isSignUp} = route.params || {};
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState();

  const createChangeTextHandler = (name) => (value) => {
    setForm({...form, [name]: value});
  };

  const onSubmit = async () => {
    Keyboard.dismiss();
    const {email, password, confirmPassword} = form;

    if(null === email || "" == email.trim()){
     Alert.alert('', '이메일을 입력해주세요.', [{text: '확인'}]);
     return;
    }
    if(null === password || "" == password.trim()){
     Alert.alert('', '비밀번호를 입력해주세요.', [{text: '확인'}]);
     return;
    }
    if(isSignUp && (password !== confirmPassword)){
      Alert.alert('', '비밀번호가 일치하지 않습니다. 동일한 비밀번호를 입력해주세요.', [{text: '확인'}]);
      return;
    }

    setLoading(true);

   try {
     isSignUp ? await signUp({email, password}) : await logIn({email, password});

   } catch (e) {
     Alert.alert('', '일시적인 오류입니다. 잠시 후 다시 이용해주세요.', [{text: '확인'}]);
     console.log("error : " + e);
   } finally {
     setLoading(false);
   }
  };

 const logIn = async ({email, password}) => {
   const { error } = await supabase.auth.signInWithPassword({ email, password });
   if (error) {
     Alert.alert('', '아이디 또는 패스워드를 확인해주세요.', [{text: '확인'}]);
     return;
   }
   navigation.push('Main');
 }

 const signUp = async ({email, password}) => {
   const { error } = await supabase.auth.signUp({ email, password });
   if (error) {
     Alert.alert('SignUp Error', error.message, [{text: '확인'}]);
     return;
   }
   Alert.alert(
     '회원가입이 완료되었습니다.', '로그인 후 이용해주세요.', [
         {text: '로그인', onPress: () => navigation.push('SignUp', {isSignUp: false})},
     ]
   );
 }

 return(
   <KeyboardAvoidingView
     style={styles.keyboardAvoidingView}
     behavior={Platform.select({ios: 'padding'})}
   >
     <SafeAreaView style={styles.fullScreen}>
       <Text style={styles.text}>아이템 다이어리</Text>
       <View style={styles.form}>
         <SignUpForm
           isSignUp={isSignUp}
           onSubmit={onSubmit}
           form={form}
           createChangeTextHandler={createChangeTextHandler}
         />
         <SignUpButton
           isSignUp={isSignUp}
           onSubmit={onSubmit}
           loading={loading}
         />
       </View>
     </SafeAreaView>
   </KeyboardAvoidingView>
 );
}

const styles = StyleSheet.create({
 fullScreen: {
   flex: 1,
   alignItems: 'center',
   justifyContent: 'center',
 },
 text: {
   fontSize: 32,
   fontWeight: 'bold',
 },
 form: {
   marginTop: 64,
   width: '100%',
   paddingHorizontal: 16,
 },
 keyboardAvoidingView: {
   flex: 1,
 },
});

export default SignUpScreenEmail;
