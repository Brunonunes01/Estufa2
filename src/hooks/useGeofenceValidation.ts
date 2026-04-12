import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Valida se o dispositivo está dentro do raio permitido da estufa.
 * Essencial para garantir que aplicações e manejos ocorram no local físico correto.
 */
export const useGeofenceValidation = (targetCoords?: Coordinates, radiusInMeters: number = 50) => {
  const [isWithinRange, setIsWithinRange] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetCoords || !targetCoords.latitude || !targetCoords.longitude) {
      setLoading(false);
      return;
    }

    const checkLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permissão de localização negada.');
          setLoading(false);
          return;
        }

        const currentPos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });

        const distance = getDistance(
          currentPos.coords.latitude,
          currentPos.coords.longitude,
          targetCoords.latitude,
          targetCoords.longitude
        );

        setIsWithinRange(distance <= radiusInMeters);
      } catch (err) {
        setError('Erro ao obter localização.');
      } finally {
        setLoading(false);
      }
    };

    checkLocation();
  }, [targetCoords, radiusInMeters]);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; 
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(p1) * Math.cos(p2) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return { isWithinRange, loading, error };
};
