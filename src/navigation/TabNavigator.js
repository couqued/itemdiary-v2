import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';
import ListScreen from '../screens/main/ListScreen';
import SearchScreen from '../screens/main/SearchScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import {colors} from '../constants/colors';
import {typography} from '../constants/typography';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="List"
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;
          if (route.name === '홈') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === '캘린더') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === '더보기') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.borderLight,
        },
        tabBarLabelStyle: {
          ...typography.small,
          fontWeight: '500',
        },
      })}>
      <Tab.Screen
        name="홈"
        component={ListScreen}
        options={{title: '아이템 다이어리', headerShown: true, headerTitleStyle: typography.h3}}
      />
      <Tab.Screen
        name="캘린더"
        component={SearchScreen}
        options={{title: '캘린더', headerShown: true, headerTitleStyle: typography.h3}}
      />
      <Tab.Screen
        name="더보기"
        component={ProfileScreen}
        options={{title: '더보기', headerShown: true, headerTitleStyle: typography.h3}}
      />
    </Tab.Navigator>
  );
}

export default TabNavigator;
