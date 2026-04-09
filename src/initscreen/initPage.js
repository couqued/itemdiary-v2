/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useEffect} from 'react';
 import {StyleSheet, Button, Text, Alert, View, BackHandler} from 'react-native';
 import { createStackNavigator } from '@react-navigation/stack';
 import { NavigationContainer, useIsFocused } from '@react-navigation/native';
 import AsyncStorage from "@react-native-async-storage/async-storage";

import MainScreen from '../mainScreen';
import DetailScreen from '../detailScreen';
import ModifyScreen from '../modifyScreen';
import SignUpScreen from '../signup/signUpScreen';
import WriteScreen from '../writeTab';
import UserQuitScreen from '../userQuitScreen';

import {useNavigation} from '@react-navigation/native';

import axios from 'axios';

 function initPage ({navigation}) {
  const isFocused = useIsFocused();
  const Stack = createStackNavigator();
  
  console.log("Stack Navigator setting");

  useEffect(() => {
    console.log('initPage useEffect()');
    
    if(isFocused){
      
    }

  }, [isFocused]);

  return (
      <Stack.Navigator>
        <Stack.Screen
          name="SignUp"
          component={SignUpScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Main"
          component={MainScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Write"
          component={WriteScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Modify"
          component={ModifyScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Quit"
          component={UserQuitScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
  )

};
    
export default initPage;
 