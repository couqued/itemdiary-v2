/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React from 'react';
 import {StyleSheet, View, ActivityIndicator} from 'react-native';
 
 
 function Splash (){
  return(
    <View style={[styles.container, {transform: [{scale: 1.5}]}]}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  )
}

 const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center', 
      alignItems: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      // backgroundColor: '#F5FCFF',
    },

    centering: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
    },

    horizontal: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 10,
      marginBottom: 200,
    }
 });
 
 export default Splash;
 