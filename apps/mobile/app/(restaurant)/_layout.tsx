import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';
import { useModeStore } from '@/stores/modeStore';

export default function RestaurantTabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const ownerships = useAuthStore((s) => s.ownerships);
  const mode = useModeStore((s) => s.mode);
  const activeRestaurantId = useModeStore((s) => s.activeRestaurantId);
  const modeHydrated = useModeStore((s) => s.hydrated);

  if (isLoading || !modeHydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  if (ownerships.length === 0 || mode !== 'restaurant' || !activeRestaurantId) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="agenda"
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={
                focused
                  ? {
                      shadowColor: Colors.primary,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 8,
                    }
                  : undefined
              }
            >
              <Ionicons
                name={focused ? 'list' : 'list-outline'}
                size={24}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Mas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'apps' : 'apps-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/*
        Estas pantallas se abren desde "Mas". Si no se ocultan, Expo Router
        las añade como pestañas y la navegación del panel se vuelve inmanejable.
      */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="billing" options={{ href: null }} />
      <Tabs.Screen name="offers" options={{ href: null }} />
      <Tabs.Screen name="blocked-dates" options={{ href: null }} />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  );
}
