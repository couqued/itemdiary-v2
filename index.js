/**
 * @format
 */

import 'react-native-url-polyfill/auto';
import {AppRegistry} from 'react-native';
import App from './App';
import ShareScreen from './src/screens/items/ShareScreen';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
AppRegistry.registerComponent('ShareScreen', () => ShareScreen);
