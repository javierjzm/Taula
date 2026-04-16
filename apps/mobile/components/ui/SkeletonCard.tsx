import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

interface SkeletonCardProps {
  variant?: 'horizontal' | 'vertical';
}

export default function SkeletonCard({ variant = 'vertical' }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  if (variant === 'horizontal') {
    return (
      <View style={styles.hCard}>
        <Animated.View style={[styles.hImage, { opacity }]} />
        <View style={styles.hBody}>
          <Animated.View style={[styles.lineLong, { opacity }]} />
          <Animated.View style={[styles.lineShort, { opacity }]} />
          <Animated.View style={[styles.lineMedium, { opacity }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.vCard}>
      <Animated.View style={[styles.vImage, { opacity }]} />
      <View style={styles.vBody}>
        <Animated.View style={[styles.lineLong, { opacity }]} />
        <Animated.View style={[styles.lineShort, { opacity }]} />
        <Animated.View style={[styles.lineMedium, { opacity }]} />
      </View>
    </View>
  );
}

const BONE_COLOR = Colors.border;

const styles = StyleSheet.create({
  vCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 12,
    height: 100,
  },
  vImage: {
    width: 100,
    height: 100,
    backgroundColor: BONE_COLOR,
  },
  vBody: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    gap: 8,
  },
  hCard: {
    width: 220,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  hImage: {
    width: '100%',
    height: 130,
    backgroundColor: BONE_COLOR,
  },
  hBody: {
    padding: 10,
    gap: 8,
  },
  lineLong: {
    height: 12,
    borderRadius: 6,
    backgroundColor: BONE_COLOR,
    width: '80%',
  },
  lineShort: {
    height: 10,
    borderRadius: 5,
    backgroundColor: BONE_COLOR,
    width: '50%',
  },
  lineMedium: {
    height: 10,
    borderRadius: 5,
    backgroundColor: BONE_COLOR,
    width: '65%',
  },
});
