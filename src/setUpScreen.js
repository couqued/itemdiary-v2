/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import { useIsFocused } from '@react-navigation/native';
 import React, {Component, useState, useEffect} from 'react';
 import {StyleSheet, View, Text, Pressable, Platform, Alert} from 'react-native';
 import VersionCheck from 'react-native-version-check';
 import { supabase } from '../src/lib/supabase';


 function SetUpScreen ({navigation}) {
  const isFocused = useIsFocused();

  const [appCurrentVersion, setAppCurrentVersion] = useState("");
  const [appLatestVersion, setAppLatestVersion] = useState("");
  const [appCurrentBuildNumber, setAppCurrentBuildNumber] = useState("");

  useEffect(() => {

    if(isFocused){
      setAppCurrentVersion(VersionCheck.getCurrentVersion());
      setAppCurrentBuildNumber(VersionCheck.getCurrentBuildNumber());

      VersionCheck.getLatestVersion({
          provider: 'playStore'
      })
      .then(latestVersion => {
        setAppLatestVersion(latestVersion);
      });

    }
  }, [isFocused]);

  const logOut = async () => {

    Alert.alert(
      '',
      '로그아웃 하시겠습니까?',
      [
        {text: '취소', onPress: () => {}, style: 'cancel'},
        {
          text: '로그아웃',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({routes: [{name: "SignUp"}]});
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

  const goQuit = () => {
    navigation.push('Quit');
  }

  return(
    <View style={styles.block}>
      <Pressable
        onPress={logOut}
        style={({pressed}) => [
          styles.item,
          pressed && Platform.select({ios: {opacity: 0.5}}),
        ]}
        android_ripple={{
          color: '#eee',
        }}
      >
        <Text>로그아웃</Text>
      </Pressable>
      <Pressable
        onPress={goQuit}
        style={({pressed}) => [
          styles.item,
          pressed && Platform.select({ios: {opacity: 0.5}}),
        ]}
        android_ripple={{
          color: '#eee',
        }}
      >
        <Text>탈퇴하기</Text>
      </Pressable>
      <Pressable
        style={({pressed}) => [
          styles.item,
          pressed && Platform.select({ios: {opacity: 0.5}}),
        ]}
        android_ripple={{
          color: '#eee',
        }}
      >
        <Text>현재 앱버전 {appCurrentVersion}</Text>
        <Text style={{color: "#787774"}}>최신 앱버전 {appLatestVersion}</Text>
      </Pressable>
    </View>
  )
 }


const styles = StyleSheet.create({
  block: {
    flex: 1,
    paddingTop: 32,
  },
  item: {
    borderTopWidth: 1,
    borderBottomWidth: 7,
    borderColor: '#eeeeee',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
});

 export default SetUpScreen;
