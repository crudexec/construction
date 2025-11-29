import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS, ELEVATION } from '../../constants/design';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outline';
  padding?: keyof typeof SPACING;
  style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: RADIUS.lg,
      padding: SPACING[padding],
    };

    switch (variant) {
      case 'elevated':
        return {
          ...baseStyle,
          backgroundColor: COLORS.surfaceElevated,
          ...ELEVATION.md,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.border,
        };
      default: // default
        return {
          ...baseStyle,
          backgroundColor: COLORS.surfaceElevated,
          ...ELEVATION.sm,
        };
    }
  };

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

export default Card;