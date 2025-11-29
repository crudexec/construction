import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, LAYOUT } from '../../constants/design';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  size = 'md',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getInputHeight = () => {
    switch (size) {
      case 'sm':
        return 40;
      case 'lg':
        return 56;
      default:
        return LAYOUT.inputHeight;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return TYPOGRAPHY.fontSize.sm;
      case 'lg':
        return TYPOGRAPHY.fontSize.lg;
      default:
        return TYPOGRAPHY.fontSize.base;
    }
  };

  const getInputContainerStyle = (): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: getInputHeight(),
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: error 
      ? COLORS.error 
      : isFocused 
        ? COLORS.primary 
        : COLORS.border,
    paddingHorizontal: SPACING.md,
  });

  const getInputStyle = (): TextStyle => ({
    flex: 1,
    fontSize: getFontSize(),
    lineHeight: getFontSize() * 1.4,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
    paddingHorizontal: leftIcon || rightIcon ? SPACING.sm : 0,
  });

  const getLabelStyle = (): TextStyle => ({
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: error ? COLORS.error : COLORS.text,
    marginBottom: SPACING.xs,
  });

  const getHelperTextStyle = (): TextStyle => ({
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: error ? COLORS.error : COLORS.textSecondary,
    marginTop: SPACING.xs,
  });

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
    if (error) return COLORS.error;
    if (isFocused) return COLORS.primary;
    return COLORS.textSecondary;
  };

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={getLabelStyle()}>
          {label}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <View style={{ marginRight: SPACING.sm }}>
            <Ionicons
              name={leftIcon}
              size={getIconSize()}
              color={getIconColor()}
            />
          </View>
        )}
        
        <TextInput
          style={[getInputStyle(), inputStyle]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={COLORS.textTertiary}
          selectionColor={COLORS.primary}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity 
            style={{ marginLeft: SPACING.sm }}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <Ionicons
              name={rightIcon}
              size={getIconSize()}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || helperText) && (
        <Text style={getHelperTextStyle()}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

export default Input;