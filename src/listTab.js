/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import { useIsFocused } from '@react-navigation/native';
 import React, {useState, useEffect} from 'react';
 import {View, Text, StyleSheet, Image, SafeAreaView, FlatList, TouchableOpacity
      , Alert, BackHandler, ToastAndroid, StatusBar} from 'react-native';
 import sample from '../src/assets/sample.jpeg';
 import Splash from '../src/utils/splash';
 import { supabase } from '../src/lib/supabase';


 function TabListScreen ({navigation}){
    const isFocused = useIsFocused();
    const [productList, setProductList] = useState("");
    const [splash, setSplash] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    let isExitApp, timeout;

    StatusBar.setBarStyle('dark-content');

    useEffect(() => {

      if(isFocused){
        prodList();
      }

      const backAction = () => {
        console.log('backAction')

        if(navigation.isFocused()){
          if (isExitApp == undefined || !isExitApp) {
            ToastAndroid.show('뒤로 버튼을 한번 더 누르시면 종료됩니다.', ToastAndroid.SHORT);
            isExitApp = true;
            timeout = setTimeout(
                () => {
                  isExitApp = false;
                },
                3000
            );
          } else {
              clearTimeout(timeout);
              BackHandler.exitApp();
          }
          return true;

        }else{
            navigation.goBack();
            return true;
        }
      }

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();

    }, [isFocused]);

 const renderData = ({ item }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        margin: 5,
      }}
    >
      <TouchableOpacity style={styles.itemTouch}
        onPress={()=>goDetail(item)}
        >
          <Image
            source={
              item.image_url
              ? {uri: item.image_url}
              : sample
            }
            style={styles.imgCover}
          />

          <View style={styles.itemView}>
            <Text style={styles.title}>{item.name}</Text>
            <View style={styles.dateAndPrice}>
              <Text style={styles.date}>{item.item_date ? item.item_date.substring(0,10) : ''}</Text>
            </View>
            <View>
              <Text style={styles.price}>
                {item.price ? item.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : 0}원
              </Text>
            </View>
          </View>
      </TouchableOpacity>
    </View>
  );

  goDetail = (item) => {
    navigation.push("Detail", {data: item});
  }

  // 상품 리스트 조회
  prodList = async () => {
    setSplash(true);

    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false });

    setSplash(false);

    if (error) {
      Alert.alert('', '일시적인 오류로 조회에 실패하였습니다.', [{text: '확인'}]);
      console.log("error : " + JSON.stringify(error));
      return;
    }

    setProductList(data);
  }

  const onRefresh = () => {
    if(!refreshing){
      getRefreshData();
    }
  }

  const getRefreshData = () => {
    setRefreshing(true);
    prodList();
    setRefreshing(false);
  }

  return(
    <SafeAreaView style={{flex: 1}}>

      <FlatList
        data={productList}
        renderItem={renderData}
        keyExtractor={(data)=>String(data.seq)}
        style={{margin: 0, backgroundColor: "#FFFFFF"}}
        numColumns={1}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />

      {splash && <Splash />}

    </SafeAreaView>

  )
}

 const styles = StyleSheet.create({
    itemTouch: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderBottomColor: "#e2e3da",
        borderBottomWidth: 2,
        padding: 1,
        height: '100%',
        width: '100%',
    },
    imgCover: {
        flex: 2,
        width: '100%',
        height: '100%',
        resizeMode: "cover",
    },
    itemView: {
        flex: 3,
        alignItems: "flex-end",
        flexDirection: "column",
        alignSelf: "center",
        padding: 10
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10,
      alignSelf: "flex-start",
    },
    date: {
      fontSize: 16,
      color: "#787774",
      borderRadius: 30,
      padding:3,
    },
    price: {fontSize: 18, marginTop: 10},
    dateAndPrice: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    },

    circleButton: {
      backgroundColor: '#4287f5',
      width: 65,
      height: 65,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      right: 40,
      bottom: 40,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 5,
      elevation: 8,
    },
    circleButtonLabel: {
      color: '#fff',
      fontSize: 32,
      lineHeight: 32,
      fontWeight: 'bold',
    },

 });

 export default TabListScreen;
