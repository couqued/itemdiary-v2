import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import SignUpScreen from '../signup/signUpScreen';
import TabNavigator from './TabNavigator';
import ItemFormScreen from '../screens/items/ItemFormScreen';
import DetailScreen from '../screens/items/DetailScreen';
import UserQuitScreen from '../screens/main/UserQuitScreen';

const Stack = createStackNavigator();

function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="ItemForm"
        component={ItemFormScreen}
        options={{presentation: 'modal'}}
      />
      <Stack.Screen name="Detail" component={DetailScreen} />
      <Stack.Screen name="Quit" component={UserQuitScreen} />
    </Stack.Navigator>
  );
}

export default RootNavigator;
