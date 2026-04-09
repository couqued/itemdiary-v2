/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React from 'react';
 import {StyleSheet, TextInput} from 'react-native';


 function customInput ({hasMarginBottom, ...rest}, ref) {
  return(
    <TextInput 
      style={[styles.input, hasMarginBottom && styles.margin]}
      ref={ref}
      {...rest}
    />
  )
 }

 const styles = StyleSheet.create({
  input: {
    borderColor: '#bdbdbd',
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 4,
    height: 48,
    backgroundColor: 'white',
    color: 'black',
  },
  margin: {
    marginBottom: 16,
  }
 });

 export default React.forwardRef(customInput);
 