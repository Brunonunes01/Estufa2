import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOWS } from '../../../constants/theme';

interface DashboardFocusMetricsProps {
  metrics: Array<{
    key: string;
    label: string;
    value: string;
    tone: string;
  }>;
  theme: any;
}

const DashboardFocusMetrics = ({ metrics, theme }: DashboardFocusMetricsProps) => {
  return (
    <View style={styles.container}>
      {metrics.map((item) => {
        const toneStyle = item.tone === 'danger' 
          ? { bg: theme.dangerBackground, border: COLORS.danger, text: COLORS.danger }
          : item.tone === 'warning'
          ? { bg: theme.warningBackground, border: COLORS.warning, text: COLORS.warning }
          : { bg: theme.surfaceBackground, border: theme.border, text: theme.textPrimary };

        return (
          <View
            key={item.key}
            style={[
              styles.metricCard,
              { backgroundColor: toneStyle.bg, borderColor: toneStyle.border },
            ]}
          >
            <Text style={[styles.label, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.label}
            </Text>
            <Text style={[styles.value, { color: toneStyle.text }]} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  value: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});

export default React.memo(DashboardFocusMetrics);
