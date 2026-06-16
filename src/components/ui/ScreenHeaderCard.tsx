import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeMode } from '../../hooks/useThemeMode';
import { SHADOWS } from '../../constants/theme';

interface ScreenHeaderCardProps {
  title: string;
  subtitle: string;
  badgeLabel?: string;
  actionLabel?: string;
  actionIcon?: string;
  onPressAction?: () => void;
  children?: React.ReactNode;
}

const ScreenHeaderCard = ({
  title,
  subtitle,
  badgeLabel,
  actionLabel,
  actionIcon = 'plus',
  onPressAction,
  children,
}: ScreenHeaderCardProps) => {
  const theme = useThemeMode();
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        styles.wrapper, 
        { 
          backgroundColor: theme.panelBackground, 
          paddingTop: Math.max(12, insets.top * 0.4 + 16),
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
        }
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          {badgeLabel ? (
            <View style={[styles.badge, { backgroundColor: theme.rawColors.whiteAlpha20 }]}>
              <Text style={[styles.badgeText, { color: theme.rawColors.textLight }]}>{badgeLabel}</Text>
            </View>
          ) : null}
          <Text style={[styles.title, { color: theme.rawColors.textLight }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.rawColors.whiteAlpha60 }]}>{subtitle}</Text>
        </View>

        {actionLabel && onPressAction ? (
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.rawColors.primary }]} 
            onPress={onPressAction} 
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={actionIcon as any} size={18} color={theme.rawColors.textLight} />
            <Text style={[styles.actionLabel, { color: theme.rawColors.textLight }]}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {children ? <View style={styles.bottomArea}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    ...SHADOWS.floating,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  titleArea: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  bottomArea: {
    marginTop: 20,
  },
});

export default ScreenHeaderCard;

