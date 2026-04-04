import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.panelBackground }]}>
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          {badgeLabel ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {actionLabel && onPressAction ? (
          <TouchableOpacity style={styles.actionButton} onPress={onPressAction} activeOpacity={0.85}>
            <MaterialCommunityIcons name={actionIcon as any} size={16} color="#FFFFFF" />
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
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleArea: {
    flex: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  badgeText: {
    color: '#E5E7EB',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 30,
  },
  subtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  actionButton: {
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomArea: {
    marginTop: 12,
  },
});

export default ScreenHeaderCard;
