/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {Component, useState} from 'react';
 import {StyleSheet} from 'react-native';
 import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
 import Ionicons from 'react-native-vector-icons/dist/Ionicons';
 import TabListScreen from '../src/listTab';
 import TabWriteScreen from '../src/writeTab';
 import TabSetUpScreen from '../src/setUpScreen';


 const Tab = createBottomTabNavigator();

  const TabBarIcon = (focused, name) => {
    let iconName;
  
    if(name === '홈'){
      iconName = 'home-outline'
    }else if(name === '글쓰기'){
      iconName = 'add-circle-outline'
    }else if(name ==='설정'){
      iconName = 'settings-outline'
    }
    
    iconSize = focused ? 30 : 20
    return (
      <Ionicons
        name={iconName}
        size={iconSize}
      />
    )
  }

 function MainScreen () {

  return(
    <Tab.Navigator
          initialRouteName="List"
          screenOptions={({route})=>({
            tabBarLabel: route.name,
            tabBarIcon: ({focused})=>(
              TabBarIcon(focused, route.name)
            ),
            tabBarStyle: {
              backgroundColor: '#f2f2f2',
            },
            tabBarActiveTintColor: '#393937',  //fb8c00 (orange)
            // style: {backgroundColor: '#c6cbef'}
          })}
        >
          <Tab.Screen 
            name="홈" 
            component={TabListScreen} 
            options={{
              title:'아이템 다이어리',
              // tabBarIcon: ({color, size}) => (
              //   <Icon name="home" color={color} size={size} />
              // )
            }}
          />
          <Tab.Screen 
            name="글쓰기"
            component={TabWriteScreen} 
            options={{
              // title:'설정',
              headerShown: false,
              // tabBarIcon: ({color, size}) => (
              //   <Icon name="Write" color={color} size={size} />
              // )
            }}
          />
          <Tab.Screen 
            name="설정"
            component={TabSetUpScreen} 
            options={{
              title:'설정',
              // headerShown: false,
              // tabBarIcon: ({color, size}) => (
              //   <Icon name="Write" color={color} size={size} />
              // )
            }}
          />
        </Tab.Navigator>
  )
 }
 
 
const styles = StyleSheet.create({
  
});

 export default MainScreen;
 