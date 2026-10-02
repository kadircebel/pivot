import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../theme/colors';

interface TVFocusableButtonProps {
  label: string;
  iconText?: string;
  variant?: 'primary' | 'secondary';
  hasTVPreferredFocus?: boolean;
  onPress: () => void;
  onFocus?: () => void;
}

export const TVFocusableButton: React.FC<TVFocusableButtonProps> = ({
  label,
  iconText,
  variant = 'primary',
  hasTVPreferredFocus = false,
  onPress,
  onFocus,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const isPrimary = variant === 'primary';

  return (
    <Pressable
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusable={true}
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => setIsFocused(false)}
      onPress={onPress}
      style={[
        styles.button,
        isPrimary ? styles.buttonPrimary : styles.buttonSecondary,
        isFocused && (isPrimary ? styles.buttonPrimaryFocused : styles.buttonSecondaryFocused),
      ]}
    >
      <View style={styles.contentRow}>
        {iconText ? <Text style={[styles.icon, isFocused && styles.textFocused]}>{iconText}</Text> : null}
        <Text
          style={[
            styles.label,
            isPrimary ? styles.labelPrimary : styles.labelSecondary,
            isFocused && styles.textFocused,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    transform: [{ scale: 1.0 }],
  },
  buttonPrimary: {
    backgroundColor: Colors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonPrimaryFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.focusBorder,
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  buttonSecondaryFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.focusBorder,
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
    color: '#FFFFFF',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  labelPrimary: {
    color: '#FFFFFF',
  },
  labelSecondary: {
    color: '#FFFFFF',
  },
  textFocused: {
    color: '#121212', // Black text when button background turns white on focus
  },
});
