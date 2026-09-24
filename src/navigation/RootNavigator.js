import React, {useState, useEffect} from 'react';
import {Linking} from 'react-native';
import {createStackNavigator} from '@react-navigation/stack';
import SplashScreen from 'react-native-splash-screen';
import SignUpScreen from '../signup/signUpScreen';
import ForgotPasswordScreen from '../signup/ForgotPasswordScreen';
import ResetPasswordScreen from '../signup/ResetPasswordScreen';
import TabNavigator from './TabNavigator';
import ItemFormScreen from '../screens/items/ItemFormScreen';
import BarcodeScanScreen from '../screens/items/BarcodeScanScreen';
import DetailScreen from '../screens/items/DetailScreen';
import UserQuitScreen from '../screens/main/UserQuitScreen';
import { supabase } from '../lib/supabase';

const Stack = createStackNavigator();

function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      SplashScreen.hide();
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'SIGNED_OUT') {
        setNeedsPasswordReset(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 딥링크 처리 (비밀번호 재설정)
  useEffect(() => {
    const handleUrl = async (url) => {
      if (!url || !url.includes('reset-password')) return;

      const hash = url.split('#')[1];
      if (!hash) return;

      const params = Object.fromEntries(new URLSearchParams(hash));
      if (params.type === 'recovery' && params.access_token) {
        // setSession 전에 플래그를 먼저 세팅해야 Main으로 가는 것을 막을 수 있음
        setNeedsPasswordReset(true);
        await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
      }
    };

    // 앱이 종료된 상태에서 딥링크로 열릴 때
    Linking.getInitialURL().then(url => { if (url) handleUrl(url); });

    // 앱이 이미 열려있는 상태에서 딥링크 수신 시
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {session ? (
        needsPasswordReset ? (
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="ItemForm"
              component={ItemFormScreen}
              options={{presentation: 'modal'}}
            />
            <Stack.Screen name="BarcodeScan" component={BarcodeScanScreen} />
            <Stack.Screen name="Detail" component={DetailScreen} />
            <Stack.Screen name="Quit" component={UserQuitScreen} />
          </>
        )
      ) : (
        <>
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default RootNavigator;
