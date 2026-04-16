import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { ANDORRA_CENTER } from '../constants/andorra';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

export const useLocation = () => {
  const [location, setLocation] = useState<LocationCoords>(ANDORRA_CENTER);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setHasPermission(true);
        try {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch {
          // Keep default Andorra center
        }
      }
      setIsLoading(false);
    })();
  }, []);

  return { location, hasPermission, isLoading };
};
