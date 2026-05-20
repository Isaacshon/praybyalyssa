import React from 'react';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

type BlessiLogoProps = {
  imageStyle?: StyleProp<ImageStyle>;
  style?: StyleProp<ViewStyle>;
};

const blessiLogo = require('@/assets/images/praybor/blessi-logo.png');

export function BlessiLogo({ imageStyle, style }: BlessiLogoProps) {
  return (
    <View style={[styles.logoWrap, style]}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel="BLESSI"
        resizeMode="contain"
        source={blessiLogo}
        style={[styles.logoImage, imageStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 112,
    height: 34,
  },
});
