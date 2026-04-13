import React, {useState, useEffect} from 'react';
import {NativeModules} from 'react-native';
import ShareMenu from 'react-native-share-menu';
import ShareModalScreen from './ShareModalScreen';

function ShareScreen() {
  const [sharedData, setSharedData] = useState(null);

  useEffect(() => {
    ShareMenu.getInitialShare(data => {
      if (data && data.mimeType === 'text/plain') {
        setSharedData(data);
      } else {
        NativeModules.ShareActivityModule.close();
      }
    });
  }, []);

  const handleClose = () => {
    NativeModules.ShareActivityModule.close();
  };

  if (!sharedData) {
    return null;
  }

  return <ShareModalScreen sharedData={sharedData} onClose={handleClose} />;
}

export default ShareScreen;
