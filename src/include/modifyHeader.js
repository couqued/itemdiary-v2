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
 import ModifyTopButton from './modifyTopButton';
 import {CommonActions} from "@react-navigation/native";


 function ModifyHeader ({productData, prodModify}) {
  const navigation = useNavigation();

  const onGoBack = () => {
    // navigation.pop();
    navigation.dispatch(CommonActions.goBack());
  }

  const onModify = () => {
    navigation.push("Modify", {data: productData});
  }
 
  return(
    <View style={styles.block}>
      <View style={styles.iconButtonWrapper}>
        <ModifyTopButton
          onPress={onGoBack}
          iconName={"chevron-back-outline"}
          iconSize={35}
        />
      </View>
      <View>
        <Text style={styles.text}>수정하기</Text>
      </View>
      <View style={styles.buttons}>
        <ModifyTopButton
          onPress={prodModify}
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
    marginLeft: 25,
  },
  
});

 export default ModifyHeader;
 