import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS } from '../../constants/design';

interface RecordingPulseProps {
  isActive?: boolean;
  size?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const RecordingPulse: React.FC<RecordingPulseProps> = ({
  isActive = false,
  size = 200,
  style,
  children,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.15,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      // Reset to initial state
      Animated.parallel([
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isActive, pulseAnim, opacityAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  return (
    <Animated.View style={[
      styles.container,
      {
        width: size,
        height: size,
      },
      style
    ]}>
      {/* Pulse effect background */}
      <Animated.View
        style={[
          styles.pulseCircle,
          {
            width: size,
            height: size,
            transform: [{ scale: pulseScale }],
            opacity: opacityAnim,
          },
        ]}
      />
      
      {/* Content */}
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    backgroundColor: COLORS.accentError,
    borderRadius: 999, // Large number for perfect circle
  },
});

export default RecordingPulse;