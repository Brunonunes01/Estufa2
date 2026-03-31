import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

const SectionHeading = ({ title, subtitle, right, style, titleStyle, subtitleStyle }: SectionHeadingProps) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.title,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
  },
});

export default SectionHeading;
