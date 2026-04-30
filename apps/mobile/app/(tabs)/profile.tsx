import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { ModeSwitcher } from '@/components/ModeSwitcher';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  id: string;
  icon: IoniconsName;
  labelKey: string;
  onPress: () => void;
}

function LoginPrompt() {
  const { t } = useTranslation();

  return (
    <View style={styles.center}>
      <View style={styles.loginAvatar}>
        <Ionicons name="person-outline" size={48} color={Colors.textTertiary} />
      </View>
      <Text style={styles.loginTitle}>{t('reservations.login_prompt')}</Text>
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => router.push('/(auth)/login')}
        activeOpacity={0.8}
      >
        <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.loginRestaurantLink}
        onPress={() => router.push('/register-restaurant')}
        activeOpacity={0.7}
      >
        <Ionicons name="storefront-outline" size={16} color={Colors.primary} />
        <Text style={styles.loginRestaurantTxt}>{t('register_restaurant.cta_login')}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ProfileHeader() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <View style={styles.profileHeader}>
      {user.avatar ? (
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}
      <Text style={styles.userName}>{user.name}</Text>
      <Text style={styles.userEmail}>{user.email}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const ownerships = useAuthStore((s) => s.ownerships);
  const hasRestaurant = ownerships.length > 0;

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      '',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(tabs)');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.delete_account'),
      t('profile.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.delete_account'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api('/me', { method: 'DELETE' });
              await logout();
              router.replace('/(tabs)');
            } catch {
              Alert.alert(t('common.error'));
            }
          },
        },
      ],
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoginPrompt />
      </SafeAreaView>
    );
  }

  const menuItems: MenuItem[] = [
    {
      id: 'edit',
      icon: 'create-outline',
      labelKey: 'profile.edit',
      onPress: () => router.push('/profile/edit'),
    },
    {
      id: 'language',
      icon: 'language-outline',
      labelKey: 'profile.language',
      onPress: () => router.push('/profile/language'),
    },
    {
      id: 'notifications',
      icon: 'notifications-outline',
      labelKey: 'profile.notifications',
      onPress: () => router.push('/profile/notifications'),
    },
    {
      id: 'about',
      icon: 'information-circle-outline',
      labelKey: 'profile.about',
      onPress: () => router.push('/profile/about'),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('profile.title')}</Text>

        <ProfileHeader />

        <ModeSwitcher />

        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.restaurantCta, hasRestaurant && styles.restaurantCtaDisabled]}
          onPress={() => {
            if (hasRestaurant) return;
            router.push('/register-restaurant');
          }}
          activeOpacity={0.7}
          disabled={hasRestaurant}
        >
          <View style={styles.restaurantCtaIcon}>
            <Ionicons name="storefront-outline" size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.restaurantCtaTitle}>
              {hasRestaurant ? 'Ya tienes un restaurante' : t('register_restaurant.cta_profile')}
            </Text>
            <Text style={styles.restaurantCtaSub}>
              {hasRestaurant
                ? 'Cada cuenta solo puede gestionar un restaurante.'
                : t('register_restaurant.subtitle')}
            </Text>
          </View>
          <Ionicons
            name={hasRestaurant ? 'checkmark-circle' : 'chevron-forward'}
            size={18}
            color={Colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
          <Text style={styles.deleteText}>{t('profile.delete_account')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  scroll: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 14,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  menu: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },

  restaurantCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: 12,
  },
  restaurantCtaDisabled: {
    borderColor: Colors.border,
    opacity: 0.75,
  },
  restaurantCtaIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantCtaTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  restaurantCtaSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.errorLight,
    gap: 8,
    borderWidth: 1,
    borderColor: `${Colors.error}25`,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 12,
    gap: 6,
  },
  deleteText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textTertiary,
    textDecorationLine: 'underline',
  },

  loginAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  loginBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  loginBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  loginRestaurantLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
  },
  loginRestaurantTxt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
