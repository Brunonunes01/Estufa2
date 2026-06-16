import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../../constants/theme';

interface DashboardPriorityCalloutProps {
  priority: {
    tone: 'danger' | 'warning' | 'success';
    title: string;
    subtitle: string;
    cta: string;
    icon: string;
    onPress: () => void;
  };
}

const DashboardPriorityCallout = ({ priority }: DashboardPriorityCalloutProps) => {
  const toneStyles = {
    danger: { bg: COLORS.danger, iconBg: '#B91C1C' },
    warning: { bg: COLORS.orange, iconBg: '#C2410C' },
    success: { bg: COLORS.success, iconBg: COLORS.primaryDark },
  };

  const style = toneStyles[priority.tone];

  return (
    <View style={[styles.priorityCard, { backgroundColor: style.bg }]}>
      <View style={styles.priorityCardHeader}>
        <View style={[styles.priorityIconWrap, { backgroundColor: style.iconBg }]}>
          <MaterialCommunityIcons name={priority.icon as any} size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.priorityEyebrow}>Foco do momento</Text>
          <Text style={styles.priorityTitle}>{priority.title}</Text>
          <Text style={styles.prioritySubtitle}>{priority.subtitle}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={[styles.priorityButton, { backgroundColor: 'rgba(255,255,255,0.15)' }]} 
        activeOpacity={0.8}
        onPress={priority.onPress}
      >
        <Text style={styles.priorityButtonText}>{priority.cta}</Text>
        <MaterialCommunityIcons name="arrow-right" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  priorityCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    ...SHADOWS.floating,
  },
  priorityCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priorityIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityEyebrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  priorityTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  prioritySubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
    fontWeight: '600',
  },
  priorityButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  priorityButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default React.memo(DashboardPriorityCallout);
