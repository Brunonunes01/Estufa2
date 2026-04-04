import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeMode } from '../../hooks/useThemeMode';
import LoadingButton from './LoadingButton';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState = ({ icon = 'inbox-outline', title, description, actionLabel, onAction }: EmptyStateProps) => {
  const theme = useThemeMode();

  return (
    <View style={[styles.container, { backgroundColor: theme.surfaceBackground, borderColor: theme.border }]}>
      <MaterialCommunityIcons name={icon as any} size={44} color={theme.textSecondary} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      {description ? <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <LoadingButton label={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 26,
    alignItems: 'center',
  },
  title: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  button: {
    marginTop: 14,
    minWidth: 190,
  },
});

export default React.memo(EmptyState);
