import React from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { ARDAB_LOGO_URL } from '@/constants/branding';
import { Radius, Shadows, Colors } from '@/theme';

export interface ArdabLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero' | number;
  watermark?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
}

export const ArdabLogo: React.FC<ArdabLogoProps> = ({
  size = 'md',
  watermark = false,
  style,
  imageStyle,
}) => {
  const getDimension = () => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm':
        return 34;
      case 'lg':
        return 50;
      case 'hero':
        return 72;
      case 'md':
      default:
        return 42;
    }
  };

  const dim = getDimension();

  if (watermark) {
    return (
      <View style={[styles.watermarkContainer, style]} pointerEvents="none">
        <Image
          source={{ uri: ARDAB_LOGO_URL }}
          style={[
            styles.watermarkImage,
            { width: dim * 2.5, height: dim * 2.5 },
            imageStyle,
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: dim,
          height: dim,
          borderRadius: Math.round(dim * 0.28),
        },
        style,
      ]}>
      <Image
        source={{ uri: ARDAB_LOGO_URL }}
        style={[
          styles.image,
          {
            width: dim - 6,
            height: dim - 6,
            borderRadius: Math.round((dim - 6) * 0.25),
          },
          imageStyle,
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EDF2EE',
    ...Shadows.sm,
  },
  image: {
    backgroundColor: '#FFFFFF',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    opacity: 0.12,
  },
  watermarkImage: {
    borderRadius: Radius.lg,
  },
});
