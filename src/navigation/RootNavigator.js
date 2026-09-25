import React, {useState, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import notifee, {EventType} from '@notifee/react-native';
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
import {
  syncAllReminders,
  cancelAllReminders,
  BACKGROUND_ACTIONS,
  handleBackgroundAction,
  launchTargetOf,
} from '../lib/reminders';
import {takePendingOpen, onPendingOpen} from '../lib/notificationRouter';

const Stack = createStackNavigator();

function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const navigation = useNavigation();

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
        cancelAllReminders();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 로그인 상태가 되면 DB 기준으로 일정 알림을 다시 예약 (재설치·기기 변경 복구)
  const userId = session?.user?.id;
  useEffect(() => {
    if (userId) syncAllReminders();
  }, [userId]);

  // 알림을 누르면 종류에 맞는 화면으로 이동
  // (앱 켜짐: onForegroundEvent / 백그라운드: index.js → notificationRouter / 꺼짐: getInitialNotification)
  const openedIds = useRef(new Set());
  useEffect(() => {
    if (!userId) return;
    // event: {notificationId, pressId('default' 또는 버튼 id), data}
    const open = async event => {
      if (!event) return;
      // 같은 알림이 여러 경로로 들어와도 한 번만 처리
      const key = `${event.notificationId}:${event.pressId}`;
      if (event.notificationId) {
        if (openedIds.current.has(key)) return;
        openedIds.current.add(key);
      }
      // 앱을 여는 버튼 → 링크 열기 또는 화면 이동
      if (event.pressId && event.pressId !== 'default') {
        const target = launchTargetOf(event.pressId, event.data);
        if (target?.url) Linking.openURL(target.url).catch(() => {});
        if (target?.screen) navigation.navigate(target.screen, target.params);
        if (event.notificationId) notifee.cancelNotification(event.notificationId);
        return;
      }
      const data = event.data || {};
      if (data.type === 'nudge') {
        navigation.navigate('ItemForm');
      } else if (data.type === 'item' && data.seq) {
        const {data: item} = await supabase.from('items').select('*').eq('seq', Number(data.seq)).single();
        if (item) navigation.navigate('Detail', {data: item});
      }
      // 월간 요약·묶음 알림은 앱 첫 화면(목록)을 연다
    };
    const toEvent = (notification, pressId = 'default') =>
      notification && {notificationId: notification.id, pressId, data: notification.data};
    // 앱이 꺼진 상태에서 알림(또는 앱을 여는 버튼)으로 열린 경우
    notifee.getInitialNotification().then(initial => {
      if (initial) open(toEvent(initial.notification, initial.pressAction?.id || 'default'));
    });
    const openPending = () => open(takePendingOpen());
    openPending();
    const unsubPending = onPendingOpen(openPending);
    const appState = AppState.addEventListener('change', s => s === 'active' && openPending());
    const unsubForeground = notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS) open(toEvent(detail.notification));
      if (type === EventType.ACTION_PRESS) {
        const pressId = detail.pressAction?.id;
        if (BACKGROUND_ACTIONS.includes(pressId)) handleBackgroundAction(pressId, detail.notification);
        else open(toEvent(detail.notification, pressId));
      }
    });
    return () => {
      unsubPending();
      appState.remove();
      unsubForeground();
    };
  }, [userId, navigation]);

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
