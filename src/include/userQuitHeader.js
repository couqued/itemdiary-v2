/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {} from 'react';
import { useNavigation } from '@react-navigation/native';
import {View, StyleSheet, Text, Alert, Pressable, Platform} from 'react-native';
import Ionicons from 'react-native-vector-icons/dist/Ionicons';


function UserQuitHeader () {
  const navigation = useNavigation();

  const onGoBack = () => {
    navigation.pop();
  }

  return(
    <View style={styles.block}>
      <View style={[styles.iconButtonWrapper]}>
        <Pressable
          style={({pressed}) => [
            styles.iconButton,
            Platform.OS === 'ios' && pressed && {backgroundColor: '#efefef'}
          ]}
          onPress={onGoBack}
          android_ripple={{color: '#ededed'}}
        >
          <Ionicons name={"chevron-back-outline"} size={35} />
        </Pressable>
      </View>
    
      <View>
        <Text style={styles.text}>탈퇴하기</Text>
      </View>
    </View>
    )
 }
 
 
const styles = StyleSheet.create({
  block: {
      height: 48,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomColor: "#AAAAAA",
      borderBottomWidth: 1,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 160,
  },
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
});

 export default UserQuitHeader;
 