/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import {AppRegistry} from 'react-native';
import notifee, {EventType} from '@notifee/react-native';
import {BACKGROUND_ACTIONS, handleBackgroundAction} from './src/lib/reminders';
import {setPendingOpen} from './src/lib/notificationRouter';
import App from './App';
import ShareScreen from './src/screens/items/ShareScreen';
import {name as appName} from './app.json';

// 앱이 꺼져 있거나 백그라운드일 때 알림 이벤트
// - 알림 본문·앱을 여는 버튼(소모품 구매 등): 앱이 열리고 RootNavigator 가 해당 화면/링크로 이동
// - 앱을 열지 않는 버튼(교체 완료·내일 다시 알림·점검 완료·구입 완료): 여기서 바로 처리
notifee.onBackgroundEvent(async ({type, detail}) => {
  const notification = detail.notification;
  if (type === EventType.PRESS) {
    setPendingOpen({notificationId: notification?.id, pressId: 'default', data: notification?.data});
  }
  if (type === EventType.ACTION_PRESS) {
    const pressId = detail.pressAction?.id;
    if (BACKGROUND_ACTIONS.includes(pressId)) await handleBackgroundAction(pressId, notification);
    else setPendingOpen({notificationId: notification?.id, pressId, data: notification?.data});
  }
});

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('ShareScreen', () => ShareScreen);
