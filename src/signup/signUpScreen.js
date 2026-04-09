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
 import InitSplash from 'react-native-splash-screen';
 import Splash from '../../src/utils/splash';
 import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
 import { supabase } from '../lib/supabase';

 function SignUpScreen ({navigation, route}) {
   const [splash, setSplash] = useState(null);

   const {isSignUp} = route.params || {};
   const [form, setForm] = useState({
     email: '',
     password: '',
     confirmPassword: '',
   });

   InitSplash.hide();


   useEffect(() => {
    loginChk();
    async function loginChk(){
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigation.reset({routes: [{name: 'Main'}]});
      }
    }
  }, []);

   const [loading, setLoading] = useState();

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

   const onSubmit = async () => {
     Keyboard.dismiss();

     const {email, password, confirmPassword} = form;
     const info = {email, password, confirmPassword};

     if(null === email || "" == email.trim()){
        Alert.alert('', '이메일을 입력해주세요.', [{text: '확인'}]);
        return;
     }else{
        if(!checkEmail(email))	{
          Alert.alert('', '이메일 형식이 잘못되었습니다.', [{text: '확인'}]);
          return;
        }
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
      isSignUp ? await signUp(info) : await logIn(info);

    } catch (e) {
      Alert.alert('', '일시적인 오류입니다. 잠시 후 다시 이용해주세요.', [{text: '확인'}]);
      console.log("error : " + e);
    } finally {
      setLoading(false);
    }
   };

  const logIn = async ({email, password}) => {
    setSplash(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSplash(false);

    if (error) {
      Alert.alert('', '아이디 또는 패스워드를 확인해주세요.', [{text: '확인'}]);
      return;
    }
    navigation.reset({routes: [{name: 'Main'}]});
  }

  const signUp = async ({email, password}) => {
    setSplash(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setSplash(false);

    if (error) {
      Alert.alert('SignUp Error', error.message, [{text: '확인'}]);
      return;
    }

    Alert.alert(
      '회원가입이 완료되었습니다.', '로그인 후 이용해주세요.', [
          {text: '로그인', onPress: () => navigation.navigate('SignUp', {isSignUp: false})},
      ]
    );
  }

  // const onDemoLogin = async () => {
  //   setLoading(true);
  //   try {
  //     await logIn({ email: '', password: '' });
  //   } catch (e) {
  //     Alert.alert('', '일시적인 오류입니다. 잠시 후 다시 이용해주세요.', [{text: '확인'}]);
  //     console.log("error : " + e);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

 return(
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.select({ios: 'padding'})}
      onPress={Keyboard.dismiss}
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
          {!isSignUp && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>또는</Text>
                <View style={styles.dividerLine} />
              </View>
              {/* <TouchableOpacity style={styles.demoButton} onPress={onDemoLogin} disabled={loading}>
                <Text style={styles.demoButtonText}>데모 계정으로 체험하기</Text>
              </TouchableOpacity> */}
            </>
          )}
        </View>
        {splash && <Splash />}
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 13,
  },
  demoButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  demoButtonText: {
    color: '#6B7280',
    fontSize: 15,
  },
 });

 export default SignUpScreen;
