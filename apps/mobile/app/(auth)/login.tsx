import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login, loginWithGoogle, loginWithApple } = useAuthStore();
  const isExpoGo = Constants.appOwnership === 'expo';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (isExpoGo) {
      Alert.alert(
        t('common.error'),
        'Google Sign-In no esta disponible en Expo Go. Usa email/password o un development build.',
      );
      return;
    }

    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const signInResult = userInfo as { data?: { idToken?: string | null }; idToken?: string | null };
      const idToken = signInResult.data?.idToken ?? signInResult.idToken;
      if (!idToken) return;
      setIsLoading(true);
      await loginWithGoogle(idToken);
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert(t('common.error'), e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) return;
      setIsLoading(true);
      await loginWithApple(credential.identityToken, {
        email: credential.email,
        name: credential.fullName
          ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
          : undefined,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.brand}>taula</Text>
            <Text style={styles.subtitle}>{t('home.greeting')}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.email')}
                placeholderTextColor={Colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <View style={styles.inputIconWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                placeholderTextColor={Colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, (!email.trim() || !password.trim()) && styles.primaryBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading || !email.trim() || !password.trim()}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.primaryBtnText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialBtns}>
            <TouchableOpacity
              style={[styles.socialBtn, isExpoGo && styles.socialBtnDisabled]}
              onPress={handleGoogle}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={20} color={Colors.text} />
              <Text style={styles.socialBtnText}>{t('auth.google')}</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity style={styles.socialBtn} onPress={handleApple} activeOpacity={0.7}>
                <Ionicons name="logo-apple" size={20} color={Colors.text} />
                <Text style={styles.socialBtnText}>{t('auth.apple')}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.no_account')}</Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <TouchableOpacity
            style={styles.restaurantCta}
            onPress={() => router.push('/register-restaurant')}
            activeOpacity={0.7}
          >
            <Ionicons name="storefront-outline" size={18} color={Colors.primary} />
            <Text style={styles.restaurantCtaText}>{t('register_restaurant.cta_login')}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 44,
  },
  brand: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 56,
    gap: 10,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...Colors.shadow.md,
  },
  primaryBtnDisabled: {
    backgroundColor: Colors.surfaceSecondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.textTertiary,
    fontSize: 14,
  },
  socialBtns: {
    gap: 12,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  socialBtnDisabled: {
    opacity: 0.4,
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 36,
    gap: 6,
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  restaurantCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  restaurantCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
});
