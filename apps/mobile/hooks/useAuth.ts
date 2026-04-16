import { useAuthStore } from '../stores/authStore';
import { router } from 'expo-router';

export const useAuth = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const requireAuth = (callback?: () => void) => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return false;
    }
    callback?.();
    return true;
  };

  return { user, isAuthenticated, isLoading, requireAuth };
};
