import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from '../ui/SkeletonBlock';
import { RADIUS, SPACING } from '../../constants/theme';

const DashboardLoadingSkeleton = () => {
  return (
    <View style={styles.wrapper}>
      <SkeletonBlock style={styles.heading} />
      <View style={styles.metricsRow}>
        <SkeletonBlock style={styles.metricCard} />
        <SkeletonBlock style={styles.metricCard} />
      </View>
      <View style={styles.metricsRow}>
        <SkeletonBlock style={styles.metricCard} />
        <SkeletonBlock style={styles.metricCard} />
      </View>
      <SkeletonBlock style={styles.alertCard} />
      <SkeletonBlock style={styles.alertCard} />
      <SkeletonBlock style={styles.hubCard} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  heading: { width: '55%', height: 18, borderRadius: RADIUS.sm },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, height: 92, borderRadius: RADIUS.md },
  alertCard: { width: '100%', height: 52, borderRadius: RADIUS.md },
  hubCard: { width: '100%', height: 130, borderRadius: RADIUS.lg, marginTop: 8 },
});

export default DashboardLoadingSkeleton;
