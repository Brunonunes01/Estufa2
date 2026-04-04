import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { useThemeMode } from '../../hooks/useThemeMode';

interface SkeletonBlockProps {
  style?: StyleProp<ViewStyle>;
}

const SkeletonBlock = ({ style }: SkeletonBlockProps) => {
  const pulse = useRef(new Animated.Value(0.55)).current;
  const mode = useThemeMode();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 650, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: mode.skeleton,
          opacity: pulse,
          borderRadius: 10,
        },
        style,
      ]}
    />
  );
};

export default SkeletonBlock;
