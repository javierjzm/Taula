import React from 'react';
import { View, Text, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface RestaurantMiniMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

function openInMaps(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps:0,0?q=${encodedLabel}&ll=${lat},${lng}`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`,
  });
  if (url) Linking.openURL(url);
}

export default function RestaurantMiniMap({
  latitude,
  longitude,
  name,
}: RestaurantMiniMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mapWrapper}>
        <MapboxGL.MapView
          style={styles.map}
          scrollEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          zoomEnabled={false}
          attributionEnabled={false}
          logoEnabled={false}
          styleURL={MapboxGL.StyleURL.Light}
        >
          <MapboxGL.Camera
            centerCoordinate={[longitude, latitude]}
            zoomLevel={15}
            animationMode="none"
          />
          <MapboxGL.PointAnnotation
            id="restaurant-pin"
            coordinate={[longitude, latitude]}
          >
            <View style={styles.pin}>
              <Ionicons name="restaurant" size={16} color={Colors.white} />
            </View>
          </MapboxGL.PointAnnotation>
        </MapboxGL.MapView>
      </View>

      <Pressable
        style={styles.openBtn}
        onPress={() => openInMaps(latitude, longitude, name)}
      >
        <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
        <Text style={styles.openBtnText}>Abrir en mapas</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
