/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React from 'react';
 import {StyleSheet, View, Pressable, Text, Platform} from 'react-native';


 function CustomButton ({onPress, title, hasMarginBottom, theme}) {
   const isPrimary = theme === 'primary';

  return(
    <View style={[styles.block, styles.overflow, hasMarginBottom && styles.margin]}>
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          styles.wrapper,
          isPrimary && styles.primaryWrapper,
          Platform.OS === 'ios' && pressed && {opacity: 0.5},
        ]}
        android_ripple={{
          color: isPrimary ? '#ffffff' : '#4287f5',  //#6200ee
          
        }}
      >
        <Text 
          style={[
            styles.text,
            isPrimary ? styles.primaryText : styles.secondaryText,
          ]}
        >
          {title}
        </Text>
      </Pressable>
    </View>
  )
 }

 CustomButton.defaultProps = {
   theme: 'primary',
 }

 const styles = StyleSheet.create({
  overflow: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  wrapper: {
    borderRadius: 4,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryWrapper: {
    backgroundColor: '#4287f5', //#6200ee
  },
  text: {
    fontWeight: 'bold',
    fontSize: 14,
    color: 'white',
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: '#4287f5',  //#6200ee
  },
  margin: {
    marginBottom: 8,
  },
 });

 export default CustomButton;
 