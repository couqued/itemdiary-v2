/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React from 'react';
 import {StyleSheet, View, ActivityIndicator} from 'react-native';
 import {useNavigation} from '@react-navigation/native';
 import CustomButton from './customButton';

 function SignUpButton ({isSignUp, onSubmit, loading}) {
   
  const navigation = useNavigation();

  const primaryTitle = isSignUp ? '회원가입' : '로그인';
  const secondaryTitle = isSignUp ? '로그인' : '회원가입';

  const onSecondaryButtonPress = () => {
    if(isSignUp){
      navigation.goBack();
    }else{
      navigation.push('SignUp', {isSignUp: true});
      // navigation.reset({routes: [{name: "SignUp", params: { isSignUp: true }}]});
    }
  };

  if(loading){
    return (
      <View style={styles.spinnerWrapper}>
        <ActivityIndicator size={32} color="#6200ee" />
      </View>
    );
    return;
  }

  return(
    <View style={styles.buttons}>
      <CustomButton 
        title={primaryTitle}
        hasMarginBottom 
        onPress={onSubmit}
      />
      <CustomButton 
        title={secondaryTitle} 
        theme="secondary" 
        onPress={onSecondaryButtonPress}
      />
    </View>
  );
 }

 const styles = StyleSheet.create({
  buttons: {
    marginTop: 64,
  },
  spinnerWrapper: {
    marginTop: 64,
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
  },
 });

 export default SignUpButton;
 