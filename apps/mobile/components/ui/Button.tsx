import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const SIZE_CONFIG: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 13 },
  md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 15 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, fontSize: 17 },
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle = {
    ...styles.base,
    paddingVertical: sizeConfig.paddingVertical,
    paddingHorizontal: sizeConfig.paddingHorizontal,
    ...(variant === 'primary' && styles.primary),
    ...(variant === 'secondary' && styles.secondary),
    ...(variant === 'ghost' && styles.ghost),
    ...(isDisabled && styles.disabled),
    ...style,
  };

  const textStyle: TextStyle = {
    fontSize: sizeConfig.fontSize,
    fontWeight: '700',
    ...(variant === 'primary' && { color: Colors.white }),
    ...(variant === 'secondary' && { color: Colors.primary }),
    ...(variant === 'ghost' && { color: Colors.primary }),
    ...(isDisabled && { color: Colors.textTertiary }),
  };

  const spinnerColor = variant === 'primary' ? Colors.white : Colors.primary;

  return (
    <Pressable
      style={({ pressed }) => [containerStyle, pressed && !isDisabled && styles.pressed]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
