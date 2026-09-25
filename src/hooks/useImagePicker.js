import {useState} from 'react';
import {launchImageLibrary, launchCamera} from 'react-native-image-picker';
import Config from 'react-native-config';
import {supabase} from '../lib/supabase';

// onPicked: 사진을 고른 직후 asset(base64 포함)을 받는 콜백 (AI 사진 인식용)
export function useImagePicker({onPicked} = {}) {
  const [imageResponse, setImageResponse] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');

  const handleImageResponse = res => {
    if (res.didCancel) return;
    if (res.errorCode) {
      console.log('Image Error: ' + res.errorCode);
      return;
    }
    if (!res.assets || res.assets.length === 0) return;
    setImageResponse(res);
    setExistingImageUrl('');
    onPicked?.(res.assets[0]);
  };

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,
      },
      handleImageResponse,
    );
  };

  const takePhoto = () => {
    launchCamera(
      {
        mediaType: 'photo',
        maxWidth: 800,
        maxHeight: 800,
        includeBase64: true,
      },
      handleImageResponse,
    );
  };

  const uploadImage = async userId => {
    if (!imageResponse) return existingImageUrl || null;

    const asset = imageResponse.assets[0];
    const ext = (asset.type || 'image/jpeg').split('/')[1] || 'jpg';
    const fileName = `${userId}/${Date.now()}.${ext}`;

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      name: `photo.${ext}`,
      type: asset.type || 'image/jpeg',
    });

    const {
      data: {session},
    } = await supabase.auth.getSession();

    const response = await fetch(
      `${Config.SUPABASE_URL}/storage/v1/object/item-images/${fileName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: Config.SUPABASE_ANON_KEY,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed: ${response.status}`);
    }

    const {data: urlData} = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const previewUri = imageResponse
    ? imageResponse.assets[0].uri
    : existingImageUrl || null;

  return {
    pickImage,
    takePhoto,
    uploadImage,
    previewUri,
    setExistingImageUrl,
    hasNewImage: !!imageResponse,
  };
}
