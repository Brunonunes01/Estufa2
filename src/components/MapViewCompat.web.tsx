import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type LatLng = {
  latitude: number;
  longitude: number;
};

type MapViewProps = {
  style?: any;
  children?: React.ReactNode;
};

const MapViewCompat = ({ style }: MapViewProps) => (
  <View style={[styles.placeholder, style]}>
    <Text style={styles.title}>Mapa disponível no app mobile</Text>
    <Text style={styles.text}>No navegador, preencha latitude e longitude manualmente.</Text>
  </View>
);

export const Marker = () => null;
export const Polygon = () => null;

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
  },
  title: { color: COLORS.textPrimary, fontWeight: '900', marginBottom: 6 },
  text: { color: COLORS.textSecondary, textAlign: 'center', fontSize: 12 },
});

export default MapViewCompat;
