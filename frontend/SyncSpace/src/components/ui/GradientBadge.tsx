import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, BorderRadius, Spacing } from '@/constants/theme';

interface GradientBadgeProps {
  label: string;
  color?: string;
  variant?: 'solid' | 'subtle' | 'outline';
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export const GradientBadge: React.FC<GradientBadgeProps> = ({
  label,
  color = Colors.dark.canvas,
  variant = 'subtle',
  style,
  icon,
}) => {
  const containerStyles = [
    styles.badge,
    variant === 'subtle' && {
      backgroundColor: `${color}1A`,
      borderColor: `${color}4D`,
    },
    variant === 'solid' && {
      backgroundColor: color,
      borderColor: color,
    },
    variant === 'outline' && {
      backgroundColor: 'transparent',
      borderColor: color,
    },
    style,
  ];

  const textColor = variant === 'solid' ? '#FFFFFF' : color;

  return (
    <View style={containerStyles}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.half + 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: Spacing.half,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
