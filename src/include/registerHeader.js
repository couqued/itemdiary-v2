/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {} from 'react';
 import { useNavigation } from '@react-navigation/native';
 import {View, StyleSheet, Text} from 'react-native';
 import RegisterTopButton from './registerTopButton';


 function RegisterHeader ({prodRegister}) {
  const navigation = useNavigation();

  const onGoHome = () => {
    navigation.pop();
  }

  return(
    <View style={styles.block}>
      <View style={styles.iconButtonWrapper}>
      {/* <RegisterTopButton
          onPress={onGoHome}
          // iconName={"home-outline"}
          iconName={"chevron-back-outline"}
          iconSize={35}
        /> */}
      </View>
      <View>
        <Text style={styles.text}>글쓰기</Text>
      </View>
      <View style={styles.buttons}>
        <RegisterTopButton
          onPress={prodRegister}
          iconName={"checkmark-outline"}
          iconSize={35}
          hasMarginRight
        />
      </View>
      
    </View>
    )
 }
 
 
const styles = StyleSheet.create({
  block: {
      height: 55,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomColor: "#AAAAAA",
      borderBottomWidth: 1,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 40
  },
  
});

 export default RegisterHeader;
 