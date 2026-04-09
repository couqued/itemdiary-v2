/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

 import React, {useState, useEffect} from 'react';
 import {View, Text, StyleSheet, Image, TextInput, SafeAreaView,
        Pressable, ScrollView, Alert, Keyboard, Platform, TouchableOpacity} from 'react-native';
 import {launchImageLibrary} from 'react-native-image-picker';
 import DateTimePickerModal from 'react-native-modal-datetime-picker';
 import {ko} from 'date-fns/locale';
 import {format} from "date-fns";
 import ModifyHeader from './include/modifyHeader';
 import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
 import Splash from '../src/utils/splash';
 import { supabase } from '../src/lib/supabase';


 function ModifyScreen ({navigation, route}) {

  const [splash, setSplash] = useState(null);

   //제목
   const [title, setTitle] = useState("");
   const onChangeTitle = (title) => {
    setTitle(title);
   }

   //날짜
   const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
   const [date, onChangeDate] = useState(new Date());

   const showDatePicker = () => {
     setDatePickerVisibility(true);
   }
   const hideDatePicker = () => {
     setDatePickerVisibility(false);
   }

   const handleConfirm = (date) => {
     onChangeDate(date);
     hideDatePicker();
   }

   //가격
   const [price, setPrice] = useState("");
   const onChangePrice = (price) => {
    let commaPrice = String(price).replace(/[^\d]+/g, '');
    commaPrice = commaPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g,',');
    setPrice(commaPrice);
   }

   //링크
   const [link, setLink] = useState("");
   const onChangeLink = (link) => {
    setLink(link);
   }

   //메모
   const [memo, setMemo] = useState("");
   const onChangeMemo = (memo) => {
    setMemo(memo);
   }

   //이미지
   const [response, setResponse] = useState(null);

   const [seq, setSeq] = useState("");
   const [imageFilePath, setImageFilePath] = useState("");

   // 이미지 가져오기
   onSelectImage = () => {
    launchImageLibrary(
      {
        madiaType: 'photo',
        maxWidth: 512,
        maxHeight: 512,
        includeBase64: false,
      },
      (res) => {
        if(res.didCancel) return;
        if(res.errorCode){
          console.log("Image Error : " + res.errorCode);
          return;
        }
        setResponse(res);
        setImageFilePath("");
     })
   }

   // 이미지 업로드
   const uploadImage = async () => {
     if (!response) return null;

     const { data: { user } } = await supabase.auth.getUser();
     const userId = user?.email || 'unknown';

     const imageUri = response.assets[0].uri;
     const fileName = `${userId}/${Date.now()}.jpg`;

     const imgRes = await fetch(imageUri);
     const blob = await imgRes.blob();

     const { data, error } = await supabase.storage
       .from('item-images')
       .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

     if (error) throw error;

     const { data: urlData } = supabase.storage
       .from('item-images')
       .getPublicUrl(data.path);

     return urlData.publicUrl;
   }

   useEffect(() => {
    onChangeTitle(route.params.data.name);
    handleConfirm(new Date(route.params.data.item_date));
    onChangePrice(route.params.data.price || 0);
    onChangeLink(route.params.data.link || '');
    onChangeMemo(route.params.data.memo || '');
    setSeq(route.params.data.seq);
    setImageFilePath(route.params.data.image_url || '');

  return () => {
      console.log('useEffect Modify return');
    };
  }, []);

  const prodModifyCheck = () => {
    if(null === title || "" == title.trim()){
      Alert.alert('', '제목을 입력해주세요.', [{text: '확인'}]);
      return;
    }

    Alert.alert(
      '알림',
      '수정하시겠습니까?',
      [
        {text: '취소', onPress: () => {}, style: 'cancel'},
        {
          text: '수정',
          onPress: () => {
            prodModify();
          },
          style: 'destructive',
        },
      ],
      {
        cancelable: true,
        onDismiss: () => {},
      },
    );
  };

   // 상품 수정
   prodModify = async () => {
    setSplash(true);

    try {
      let newImageUrl = imageFilePath; // 기존 이미지 유지
      if (response) {
        newImageUrl = await uploadImage(); // 새 이미지 업로드
      }

      const { error } = await supabase
        .from('items')
        .update({
          name: title,
          price: parseInt(price.replace(/,/g, '')) || 0,
          item_date: format(new Date(date), 'yyyy-MM-dd'),
          link: link,
          memo: memo,
          image_url: newImageUrl,
        })
        .eq('seq', seq);

      setSplash(false);

      if (error) {
        Alert.alert('', '수정에 실패하였습니다. 다시 시도해주세요.', [{text: '확인'}]);
        return;
      }

      navigation.push("Main");
    } catch (e) {
      setSplash(false);
      console.log('prodModify error : ' + e);
      Alert.alert('', '일시적인 오류로 수정에 실패하였습니다.', [{text: '확인'}]);
    }
   }


  return(
    <SafeAreaView style={{backgroundColor: '#FFFFFF', flex: 1}}>
      <ModifyHeader prodModify={prodModifyCheck} />
      <KeyboardAwareScrollView
        style={styles.KeyboardAwareScrollView}
        behavior={Platform.select({ios: 'padding'})}
        onPress={Keyboard.dismiss}
      >
        <ScrollView>
          <View>
              <Image
                source={
                  imageFilePath
                  ? {uri: imageFilePath}
                  : {uri: response ? response.assets[0].uri : null}
                }
                style={styles.img}
              />

              <TouchableOpacity
                style={{
                  backgroundColor: '#4287f5',
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 20,
                  marginLeft: 60,
                  marginRight: 60,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={()=>onSelectImage()}
              >
                <Text style={{ color: 'white', fontSize: 18}}>이미지 수정하기</Text>
              </TouchableOpacity>

              <View style={{margin: 15}}></View>
              <Text style={styles.titleText}>제목</Text>
              <TextInput
                style={styles.title}
                placeholderTextColor="grey"
                maxLength={20}
                onChangeText={(text)=>onChangeTitle(text)}
                value={title}
                autoCapitalize={'none'}
                returnKeyType="next"
              />

              <Text style={styles.titleText}>구입날짜</Text>
              <View>
                <Pressable onPress={showDatePicker}>
                  <Text style={styles.date}>
                    {format(new Date(date), 'PPP', {locale: ko})}
                  </Text>
                </Pressable>
                <DateTimePickerModal
                  isVisible={isDatePickerVisible}
                  mode="date"
                  onConfirm={handleConfirm}
                  onCancel={hideDatePicker}
                />
              </View>

              <Text style={styles.titleText}>가격</Text>
              <TextInput
                style={styles.title}
                placeholderTextColor="grey"
                maxLength={15}
                onChangeText={(text)=>onChangePrice(text)}
                value={price}
                autoCapitalize={'none'}
                keyboardType="number-pad"
                returnKeyType="next"
              />

              <Text style={styles.titleText}>링크</Text>
              <TextInput
                style={styles.title}
                placeholderTextColor="grey"
                maxLength={70}
                onChangeText={(text)=>onChangeLink(text)}
                value={link}
                autoCapitalize={'none'}
                keyboardType="url"
                returnKeyType="next"
              />

              <Text style={styles.titleText}>메모</Text>
              <TextInput
                style={styles.memo}
                placeholderTextColor="grey"
                maxLength={100}
                onChangeText={(text)=>onChangeMemo(text)}
                value={memo}
                autoCapitalize={'none'}
                multiline={true}
                numberOfLines={5}
              />
          </View>
        </ScrollView>
        {splash && <Splash />}
      </KeyboardAwareScrollView>
    </SafeAreaView>
    )
 }


const styles = StyleSheet.create({
  img: {
      height: 120,
      width: 120,
      marginTop: 20,
      marginBottom: 20,
      alignSelf: 'center',
  },
  title: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    fontSize: 20,
    padding: 10,
    borderBottomColor: "#AAAAAA",
    borderBottomWidth: 1,
    color: 'black',
  },
  date: {
    width: '60%',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    fontSize: 20,
    padding: 10,
    borderBottomColor: "#AAAAAA",
    borderBottomWidth: 1,
    alignContent: 'center',
    color: 'black',
  },
  memo: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    fontSize: 20,
    padding: 10,
    borderBottomColor: "#AAAAAA",
    borderBottomWidth: 1,
    height: 150,
    textAlignVertical: 'top',
    color: 'black',
  },
  KeyboardAwareScrollView: {
    flex: 1,
  },
  titleText: {
    marginLeft: 10,
    color: "#787774"
  }

});

 export default ModifyScreen;
