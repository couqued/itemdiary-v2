import {Platform} from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
});

export const typography = {
  h1: {
    fontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  h2: {
    fontFamily,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  body: {
    fontFamily,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyBold: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  caption: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  captionBold: {
    fontFamily,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  small: {
    fontFamily,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  price: {
    fontFamily,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
};
