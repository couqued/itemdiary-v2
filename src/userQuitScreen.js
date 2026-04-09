/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */


 import React, {useState} from 'react';
 import {View, Text, StyleSheet, TextInput, SafeAreaView, Alert
      , ScrollView, TouchableOpacity} from 'react-native';
 import UserQuitHeader from './include/userQuitHeader';
 import Splash from '../src/utils/splash';
 import { supabase } from '../src/lib/supabase';

 function UserQuitScreen ({navigation}) {

  const [splash, setSplash] = useState(null);
  const [password, setPassword] = useState("");
  const onChangePassword = (password) => {
    setPassword(password);
  }

   const onQuit = () => {
    Alert.alert(
      '',
      '정말 탈퇴 하시겠습니까?',
      [
        {text: '취소', onPress: () => {}, style: 'cancel'},
        {
          text: '탈퇴하기',
          onPress: () => {
            ajaxQuit();
          },
          style: 'destructive',
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {},
      },
    );
   }

   //탈퇴하기
  const ajaxQuit = async () => {

    if(null === password || "" == password.trim()){
      Alert.alert('', '패스워드를 입력해주세요.', [{text: '확인'}]);
      return;
    }

    setSplash(true);

    // 현재 로그인된 유저 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSplash(false);
      Alert.alert('', 'ID를 확인할 수 없습니다.');
      return;
    }

    // 패스워드 재확인
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    });

    if (signInError) {
      setSplash(false);
      Alert.alert('', '아이디 또는 비밀번호를 확인해주세요.', [{text: '확인'}]);
      return;
    }

    // 사용자 데이터 삭제
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('user_id', user.email);

    if (deleteError) {
      setSplash(false);
      Alert.alert('', '일시적인 오류로 탈퇴처리에 실패하였습니다.', [{text: '확인'}]);
      return;
    }

    // 로그아웃
    await supabase.auth.signOut();
    setSplash(false);
    navigation.reset({routes: [{name: "SignUp"}]});
   }

  return(
    <SafeAreaView style={{backgroundColor: '#FFFFFF', flex: 1}}>
      <UserQuitHeader />
      <ScrollView>
        <View>
            <Text style={{marginTop: 30, marginLeft: 10}}>패스워드</Text>
            <TextInput
              style={styles.title}
              maxLength={30}
              value={password}
              autoCapitalize={'none'}
              placeholderTextColor="grey"
              onChangeText={(password)=>onChangePassword(password)}
              placeholder="패스워드를 입력해주세요."
              secureTextEntry
              returnKeyType="done"
            />

            <TouchableOpacity
              style={{
                backgroundColor: '#4287f5',
                padding: 12,
                borderRadius: 8,
                marginTop: 20,
                marginLeft: 60,
                marginRight: 60,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={()=>onQuit()}
            >
              <Text style={{ color: 'white', fontSize: 18}}>탈퇴하기</Text>
            </TouchableOpacity>

        </View>
      </ScrollView>
      {splash && <Splash />}
    </SafeAreaView>
    )
 }


const styles = StyleSheet.create({

  title: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    fontSize: 20,
    padding: 10,
    borderBottomColor: "#AAAAAA",
    borderBottomWidth: 1,
    color: 'black',
  },

});

export default UserQuitScreen;
