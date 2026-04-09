/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {} from 'react';
 import {View, StyleSheet, Pressable, Platform} from 'react-native';
 import Ionicons from 'react-native-vector-icons/dist/Ionicons';

 function ModifyTopButton ({iconName, iconSize, hasMarginRight, onPress}) {

  return(
    iconName == 'checkmark-outline' ?
    <View style={[styles.iconButtonWrapper, hasMarginRight && styles.rightMargin]}>
      <Pressable
        style={({pressed}) => [
          styles.iconButton,
          Platform.OS === 'ios' && pressed && {backgroundColor: '#efefef'}
        ]}
        onPress={onPress}
        android_ripple={{color: '#ededed'}}
      >
        <Ionicons name={iconName} size={iconSize} color='#4287f5'/>
      </Pressable>
    </View>
    :
    <View style={[styles.iconButtonWrapper, hasMarginRight && styles.rightMargin]}>
      <Pressable
        style={({pressed}) => [
          styles.iconButton,
          Platform.OS === 'ios' && pressed && {backgroundColor: '#efefef'}
        ]}
        onPress={onPress}
        android_ripple={{color: '#ededed'}}
      >
        <Ionicons name={iconName} size={iconSize}/>
      </Pressable>
    </View>
    )
 }
 
 
const styles = StyleSheet.create({
  iconButtonWrapper: {
      height: 32,
      width: 32,
      borderRadius: 16,
      overflow: 'hidden',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  rightMargin: {
    marginRight: 10,
  },
  
});

 export default ModifyTopButton;
 