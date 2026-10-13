import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

type LogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  style?: object;
  textStyle?: object;
}

const sizeConfig: Record<LogoSize, { size: number }> = {
  sm: { size: 40 },
  md: { size: 64 },
  lg: { size: 96 },
  xl: { size: 140 },
};

export function Logo({ size = 'md', style }: LogoProps) {
  const config = sizeConfig[size];

  return (
    <View style={[styles.container, style]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={[
          styles.image,
          {
            width: config.size,
            height: config.size,
          },
        ]}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    overflow: 'hidden',
  },
});
