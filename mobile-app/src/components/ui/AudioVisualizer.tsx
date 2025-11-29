import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/design';

interface AudioVisualizerProps {
  isActive?: boolean;
  barCount?: number;
  height?: number;
  width?: number;
  style?: ViewStyle;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive = false,
  barCount = 5,
  height = 60,
  width = 80,
  style,
}) => {
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (isActive) {
      // Create more realistic audio waveform patterns
      const createWaveAnimation = (animatedValue: Animated.Value, index: number) => {
        const baseDelay = index * 80; // Stagger the start
        const baseFrequency = 400 + (index * 100); // Different frequencies for each bar
        
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animatedValue, {
              toValue: 0.2 + Math.random() * 0.3, // Gentle start
              duration: baseFrequency * 0.3,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.6 + Math.random() * 0.4, // Peak
              duration: baseFrequency * 0.4,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.3 + Math.random() * 0.4, // Mid level
              duration: baseFrequency * 0.5,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.8 + Math.random() * 0.2, // Another peak
              duration: baseFrequency * 0.3,
              useNativeDriver: false,
            }),
            Animated.timing(animatedValue, {
              toValue: 0.15 + Math.random() * 0.25, // Low
              duration: baseFrequency * 0.4,
              useNativeDriver: false,
            }),
          ]),
          { resetBeforeIteration: true }
        );
      };

      // Start each bar's animation with slight delays
      const animations = animatedValues.map((animatedValue, index) => {
        const animation = createWaveAnimation(animatedValue, index);
        setTimeout(() => animation.start(), index * 50);
        return animation;
      });

      return () => {
        animations.forEach(animation => animation.stop());
      };
    } else {
      // Smooth transition to inactive state
      const resetAnimations = animatedValues.map((animatedValue, index) =>
        Animated.timing(animatedValue, {
          toValue: 0.1 + (index % 2) * 0.05, // Slight variation in inactive heights
          duration: 400,
          useNativeDriver: false,
        })
      );

      Animated.stagger(50, resetAnimations).start();
    }
  }, [isActive, animatedValues]);

  const getBarStyle = (animatedValue: Animated.Value, index: number) => {
    const barWidth = (width - (barCount - 1) * SPACING.xs) / barCount;
    
    return {
      width: barWidth,
      height: animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [height * 0.15, height],
        extrapolate: 'clamp',
      }),
      backgroundColor: animatedValue.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [COLORS.neutral400, COLORS.primary, COLORS.accentError],
        extrapolate: 'clamp',
      }),
      marginRight: index < barCount - 1 ? SPACING.xs : 0,
      borderRadius: RADIUS.sm,
    };
  };

  return (
    <View style={[styles.container, { width, height }, style]}>
      <View style={styles.barsContainer}>
        {animatedValues.map((animatedValue, index) => (
          <Animated.View
            key={index}
            style={getBarStyle(animatedValue, index)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});

export default AudioVisualizer;