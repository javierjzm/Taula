import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuthStore } from '@/stores/authStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useModeStore } from '@/stores/modeStore';
import { api } from '@/services/api';
import '@/i18n';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

async function registerPushToken() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Taula',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF5C3A',
        sound: 'default',
      });
    }

    const projectId =
      ((Constants.expoConfig?.extra as any)?.eas?.projectId as string | undefined) ??
      ((Constants as any).easConfig?.projectId as string | undefined);
    const isValidProjectId =
      !!projectId &&
      projectId !== 'your-eas-project-id' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(projectId);

    // In local dev / Expo Go with placeholder projectId, skip push registration.
    if (!isValidProjectId) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api('/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }).catch(() => {});
  } catch {
    // Never block app usage if push registration fails in local/dev environments.
  }
}

let lastHandledNotificationId: string | null = null;

function readNotificationData(response: Notifications.NotificationResponse) {
  return response.notification.request.content.data as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

async function openNotification(response: Notifications.NotificationResponse) {
  const responseId = response.notification.request.identifier;
  if (lastHandledNotificationId === responseId) return;
  lastHandledNotificationId = responseId;

  const data = readNotificationData(response);
  const scope = asString(data.scope);
  const restaurantId = asString(data.restaurantId);
  const deepLink = asString(data.deepLink);

  if (scope === 'RESTAURANT' && restaurantId) {
    try {
      let auth = useAuthStore.getState();
      if (!auth.isAuthenticated) {
        await auth.loadSession();
        auth = useAuthStore.getState();
      }
      if (auth.isAuthenticated && auth.ownerships.length === 0) {
        await auth.refreshOwnerships();
        auth = useAuthStore.getState();
      }

      const mode = useModeStore.getState();
      if (mode.mode !== 'restaurant' || mode.activeRestaurantId !== restaurantId) {
        await mode.switchToRestaurant(restaurantId, auth.ownerships);
      }

      router.push((deepLink ?? '/(restaurant)/agenda') as any);
      return;
    } catch {
      router.push('/notifications?scope=restaurant' as any);
      return;
    }
  }

  router.push((deepLink ?? '/notifications') as any);
}

function RootLayoutInner() {
  const loadSession = useAuthStore((s) => s.loadSession);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const ownerships = useAuthStore((s) => s.ownerships);
  const mode = useModeStore((s) => s.mode);
  const activeRestaurantId = useModeStore((s) => s.activeRestaurantId);
  const modeHydrated = useModeStore((s) => s.hydrated);
  const restoredRestaurantMode = useRef(false);

  useEffect(() => {
    loadSession();
    useFavoritesStore.getState().load();
    void useModeStore.getState().hydrate();
  }, [loadSession]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    if (isAuthenticated) {
      void registerPushToken();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (
      isLoading ||
      !modeHydrated ||
      !isAuthenticated ||
      restoredRestaurantMode.current ||
      mode !== 'restaurant' ||
      !activeRestaurantId
    ) {
      return;
    }

    const ownership = ownerships.find((o) => o.restaurantId === activeRestaurantId);
    if (!ownership) {
      void useModeStore.getState().switchToClient();
      return;
    }

    restoredRestaurantMode.current = true;
    void useModeStore
      .getState()
      .switchToRestaurant(activeRestaurantId, ownerships)
      .then(() => router.replace('/(restaurant)/agenda'))
      .catch(() => {
        restoredRestaurantMode.current = false;
        void useModeStore.getState().switchToClient();
      });
  }, [activeRestaurantId, isAuthenticated, isLoading, mode, modeHydrated, ownerships]);

  useEffect(() => {
    if (isLoading) return undefined;

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void openNotification(response);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) void openNotification(response);
    });

    return () => sub.remove();
  }, [isLoading]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(restaurant)" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="search" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="restaurant/[slug]" />
        <Stack.Screen name="reservation/new" />
        <Stack.Screen name="reservation/[id]" />
        <Stack.Screen name="notifications" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutInner />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
