import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, LAYOUT } from '../../constants/design';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  iconOnly?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  iconOnly = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.md,
      borderWidth: variant === 'outline' ? 1 : 0,
    };

    // Size variants
    switch (size) {
      case 'sm':
        baseStyle.paddingHorizontal = iconOnly ? SPACING.sm : SPACING.md;
        baseStyle.paddingVertical = SPACING.sm;
        baseStyle.minHeight = 40;
        if (iconOnly) {
          baseStyle.minWidth = 40;
          baseStyle.paddingHorizontal = 0;
        }
        break;
      case 'lg':
        baseStyle.paddingHorizontal = iconOnly ? SPACING.md : SPACING.xl;
        baseStyle.paddingVertical = SPACING.md;
        baseStyle.minHeight = 56;
        if (iconOnly) {
          baseStyle.minWidth = 56;
          baseStyle.paddingHorizontal = 0;
        }
        break;
      default: // md
        baseStyle.paddingHorizontal = iconOnly ? SPACING.sm : SPACING.lg;
        baseStyle.paddingVertical = SPACING.sm + 4;
        baseStyle.minHeight = LAYOUT.buttonHeight;
        if (iconOnly) {
          baseStyle.minWidth = LAYOUT.buttonHeight;
          baseStyle.paddingHorizontal = 0;
        }
    }

    // Color variants
    switch (variant) {
      case 'primary':
        baseStyle.backgroundColor = disabled ? COLORS.neutral400 : COLORS.primary;
        break;
      case 'secondary':
        baseStyle.backgroundColor = disabled ? COLORS.neutral300 : COLORS.neutral200;
        break;
      case 'outline':
        baseStyle.backgroundColor = 'transparent';
        baseStyle.borderColor = disabled ? COLORS.neutral400 : COLORS.primary;
        break;
      case 'ghost':
        baseStyle.backgroundColor = 'transparent';
        break;
      case 'success':
        baseStyle.backgroundColor = disabled ? COLORS.neutral400 : COLORS.success;
        break;
      case 'warning':
        baseStyle.backgroundColor = disabled ? COLORS.neutral400 : COLORS.warning;
        break;
      case 'error':
        baseStyle.backgroundColor = disabled ? COLORS.neutral400 : COLORS.error;
        break;
    }

    if (fullWidth) {
      baseStyle.width = '100%';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: TYPOGRAPHY.fontWeight.semiBold,
      textAlign: 'center',
    };

    // Size variants
    switch (size) {
      case 'sm':
        baseTextStyle.fontSize = TYPOGRAPHY.fontSize.sm;
        break;
      case 'lg':
        baseTextStyle.fontSize = TYPOGRAPHY.fontSize.lg;
        break;
      default: // md
        baseTextStyle.fontSize = TYPOGRAPHY.fontSize.base;
    }

    // Color variants
    switch (variant) {
      case 'primary':
      case 'success':
      case 'warning':
      case 'error':
        baseTextStyle.color = disabled ? COLORS.neutral500 : COLORS.neutral100;
        break;
      case 'secondary':
        baseTextStyle.color = disabled ? COLORS.neutral500 : COLORS.neutral700;
        break;
      case 'outline':
      case 'ghost':
        baseTextStyle.color = disabled ? COLORS.neutral500 : COLORS.primary;
        break;
    }

    return baseTextStyle;
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 16;
      case 'lg':
        return 24;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'primary':
      case 'success':
      case 'warning':
      case 'error':
        return disabled ? COLORS.neutral500 : COLORS.neutral100;
      case 'secondary':
        return disabled ? COLORS.neutral500 : COLORS.neutral700;
      case 'outline':
      case 'ghost':
        return disabled ? COLORS.neutral500 : COLORS.primary;
      default:
        return COLORS.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={getIconColor()}
          style={!iconOnly ? { marginRight: SPACING.sm } : undefined}
        />
      ) : (
        <>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={getIconSize()}
              color={getIconColor()}
              style={!iconOnly ? { marginRight: SPACING.sm } : undefined}
            />
          )}
          {!iconOnly && (
            <Text style={[getTextStyle(), textStyle]}>
              {title}
            </Text>
          )}
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={getIconSize()}
              color={getIconColor()}
              style={!iconOnly ? { marginLeft: SPACING.sm } : undefined}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;