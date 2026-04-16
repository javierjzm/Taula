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
        <Ionicons name="person-outline" size={48} color={Colors.border} />
      </View>
      <Text style={styles.loginTitle}>{t('reservations.login_prompt')}</Text>
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => router.push('/(auth)/login')}
        activeOpacity={0.8}
      >
        <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
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
                <Ionicons name={item.icon} size={22} color={Colors.text} />
              </View>
              <Text style={styles.menuLabel}>{t(item.labelKey)}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
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
    gap: 14,
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

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
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
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 12,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Menu
  menu: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 16,
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceSecondary,
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

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 28,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.error + '10',
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.error,
  },

  // Login prompt
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
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  loginBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
});
