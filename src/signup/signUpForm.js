/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useRef} from 'react';
 import CustomInput from './customInput';

 function SignUpForm ({isSignUp, onSubmit, form, createChangeTextHandler}) {
   
  const passwordRef = useRef();
  const confirmPasswordRef = useRef();

  return(
    <>
      <CustomInput 
        hasMarginBottom 
        placeholder="이메일을 입력해주세요."
        placeholderTextColor="#808080"
        value={form.email}
        onChangeText={createChangeTextHandler('email')}
        autoCapitalize="none"
        autoCorrect={false}
        autoCompleteType="email"
        keyboardType="email-address"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current.focus()}
      />
      <CustomInput 
        placeholder="비밀번호를 입력해주세요." 
        placeholderTextColor="#808080"
        hasMarginBottom={isSignUp} 
        value={form.password}
        onChangeText={createChangeTextHandler('password')}
        secureTextEntry
        ref={passwordRef}
        returnKeyType={isSignUp ? 'next' : 'done'}
        onSubmitEditing={() => {
          if(isSignUp){
            confirmPasswordRef.current.focus();
          }else{
            onSubmit();
          }
        }}
      />
      {isSignUp && (
        <CustomInput 
          placeholder="비밀번호를 다시 입력해주세요." 
          placeholderTextColor="#808080"
          value={form.confirmPassword}
          onChangeText={createChangeTextHandler('confirmPassword')}
          secureTextEntry
          ref={confirmPasswordRef}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />
      )}
      </>    
  );
 }

 export default SignUpForm;
 