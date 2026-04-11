import React, {useState, useEffect} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import SplashScreen from 'react-native-splash-screen';
import SignUpScreen from '../signup/signUpScreen';
import TabNavigator from './TabNavigator';
import ItemFormScreen from '../screens/items/ItemFormScreen';
import DetailScreen from '../screens/items/DetailScreen';
import UserQuitScreen from '../screens/main/UserQuitScreen';
import { supabase } from '../lib/supabase';

const Stack = createStackNavigator();

function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 세션 초기 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
      SplashScreen.hide();
    });

    // 인증 상태 변화 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return null; // 로딩 중에는 아무것도 그리지 않아 스플래시 유지
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {session ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="ItemForm"
            component={ItemFormScreen}
            options={{presentation: 'modal'}}
          />
          <Stack.Screen name="Detail" component={DetailScreen} />
          <Stack.Screen name="Quit" component={UserQuitScreen} />
        </>
      ) : (
        <Stack.Screen name="SignUp" component={SignUpScreen} />
      )}
    </Stack.Navigator>
  );
}

export default RootNavigator;
