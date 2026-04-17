import React from 'react';
import { View, Text, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Colors } from '@/constants/colors';

interface RestaurantMiniMapProps {
  latitude: number;
  longitude: number;
  name: string;
}

function openInMaps(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  if (Platform.OS === 'web') {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    return;
  }
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
  const isExpoGo = Constants.appOwnership === 'expo';
  if (Platform.OS === 'web' || isExpoGo) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.mapWrapper}
          onPress={() => openInMaps(latitude, longitude, name)}
        >
          <View style={[styles.map, styles.webFallback]}>
            <Ionicons name="map-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.webCoords}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
            <Text style={styles.webHint}>Toca para abrir en Google Maps</Text>
          </View>
        </Pressable>
      </View>
    );
  }

  let MapboxGL: any;
  try {
    MapboxGL = require('@rnmapbox/maps').default;
  } catch {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.mapWrapper}
          onPress={() => openInMaps(latitude, longitude, name)}
        >
          <View style={[styles.map, styles.webFallback]}>
            <Ionicons name="map-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.webCoords}>
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </Text>
            <Text style={styles.webHint}>Toca para abrir en Google Maps</Text>
          </View>
        </Pressable>
      </View>
    );
  }

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
  webFallback: {
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  webCoords: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  webHint: {
    fontSize: 12,
    color: Colors.textTertiary,
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
