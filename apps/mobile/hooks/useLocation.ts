import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import i18n from '../i18n';
import { ANDORRA_CENTER } from '../constants/andorra';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface LocationState {
  location: LocationCoords;
  cityName: string;
  hasPermission: boolean;
  isLoading: boolean;
  isGps: boolean;
  setManualLocation: (coords: LocationCoords, name: string) => void;
  refreshGps: () => Promise<void>;
}

async function reverseGeocode(coords: LocationCoords): Promise<string> {
  const fallback = () => i18n.t('location.default_city');
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    if (results.length > 0) {
      const r = results[0];
      return r.city || r.subregion || r.region || fallback();
    }
  } catch {
    // geocoding can fail silently on some devices / Expo Go
  }
  return fallback();
}

export const useLocation = (): LocationState => {
  const [location, setLocation] = useState<LocationCoords>(ANDORRA_CENTER);
  const [cityName, setCityName] = useState(() => i18n.t('location.default_city'));
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGps, setIsGps] = useState(false);

  const fetchGps = useCallback(async () => {
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setLocation(coords);
        setIsGps(true);
        const name = await reverseGeocode(coords);
        setCityName(name);
      }
    } catch {
      // keep defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGps();
  }, [fetchGps]);

  const setManualLocation = useCallback((coords: LocationCoords, name: string) => {
    setLocation(coords);
    setCityName(name);
    setIsGps(false);
  }, []);

  return { location, cityName, hasPermission, isLoading, isGps, setManualLocation, refreshGps: fetchGps };
};
