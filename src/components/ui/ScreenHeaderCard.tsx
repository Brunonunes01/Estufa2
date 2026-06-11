import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeMode } from '../../hooks/useThemeMode';

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
    <View style={[styles.wrapper, { backgroundColor: theme.panelBackground, paddingTop: Math.max(12, insets.top * 0.35 + 12) }]}>
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          {badgeLabel ? (
            <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.25)' }]}>
              <Text style={[styles.badgeText, { color: '#10B981' }]}>{badgeLabel}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.7)' }]}>{subtitle}</Text>
        </View>

        {actionLabel && onPressAction ? (
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={onPressAction} activeOpacity={0.85}>
            <MaterialCommunityIcons name={actionIcon as any} size={18} color="#FFFFFF" />
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {children ? <View style={styles.bottomArea}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
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
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '500',
  },
  actionButton: {
    height: 44,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 0,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bottomArea: {
    marginTop: 16,
  },
});

export default ScreenHeaderCard;
