import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) {
  const { theme } = useTheme();

  let btnBg = theme.colors.primary;
  let textColor = '#ffffff';
  let borderColor = 'transparent';
  let borderWidth = 0;

  if (variant === 'secondary') {
    btnBg = theme.isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9';
    textColor = theme.colors.text;
  } else if (variant === 'outline') {
    btnBg = 'transparent';
    textColor = theme.colors.primary;
    borderColor = theme.colors.primary;
    borderWidth = 1;
  } else if (variant === 'danger') {
    btnBg = theme.colors.danger;
    textColor = '#ffffff';
  }

  const height = size === 'sm' ? 36 : size === 'lg' ? 50 : 44;
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 15 : 14;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: btnBg,
          height,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.text, { color: textColor, fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
