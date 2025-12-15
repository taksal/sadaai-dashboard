import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@/types';
import api from '@/lib/api';

interface AuthUser extends User {
  forceLogoutAt?: string | null;
  [key: string]: any;
}

interface UseAuthUserOptions {
  requiredRole?: UserRole;
  redirectTo?: string;
}

export function useAuthUser(options?: UseAuthUserOptions) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      // Check if admin is viewing client dashboard
      const urlParams = new URLSearchParams(window.location.search);
      const viewAsUserId = urlParams.get('view_as');

      const userData = localStorage.getItem('user');

      if (!userData) {
        router.push(options?.redirectTo || '/login');
        setIsLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(userData);

        // If admin is viewing as client
        if (viewAsUserId && parsed.role === UserRole.ADMIN) {
          // Fetch the client's data
          const response = await api.get(`/users/${viewAsUserId}`);
          setUser(response.data);
          setIsLoading(false);
          return;
        }

        // Check if user must change password (unless already on change-password page)
        if (parsed.mustChangePassword && !window.location.pathname.includes('/change-password')) {
          router.push('/change-password');
          setIsLoading(false);
          return;
        }

        // Check if required role matches
        if (options?.requiredRole && parsed.role !== options.requiredRole) {
          const redirectPath = parsed.role === UserRole.ADMIN ? '/admin' : '/client';
          router.push(redirectPath);
          setIsLoading(false);
          return;
        }

        // Fetch fresh user data from API to get complete profile including vapiAssistants
        try {
          const response = await api.get(`/users/${parsed.id}`);
          const freshUserData = response.data;
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(freshUserData));
          setUser(freshUserData);
        } catch (fetchError) {
          console.error('Failed to fetch fresh user data:', fetchError);
          // Fall back to cached data if API fails
          setUser(parsed);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to parse user data:', error);
        router.push('/login');
        setIsLoading(false);
      }
    };

    initAuth();
  }, [router, options?.requiredRole, options?.redirectTo]);

  // Force logout polling (only for normal sessions, not when viewing as)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewAsUserId = urlParams.get('view_as');

    if (viewAsUserId || !user) {
      return; // Skip polling if viewing as another user
    }

    const checkForceLogout = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) return;

        const currentUser = JSON.parse(userData);
        const loginTime = localStorage.getItem('login_time');

        // Fetch latest user data to check forceLogoutAt
        const response = await api.get(`/users/${currentUser.id}`);
        const latestUser = response.data;

        if (latestUser.forceLogoutAt) {
          const forceLogoutTime = new Date(latestUser.forceLogoutAt).getTime();
          const userLoginTime = loginTime ? new Date(loginTime).getTime() : 0;

          // If force logout happened after user logged in, log them out
          if (forceLogoutTime > userLoginTime) {
            localStorage.clear();
            router.push('/login');
          }
        }
      } catch (error) {
        // Silently ignore errors in polling - backend may not be available
      }
    };

    // Check immediately
    checkForceLogout();

    // Then check every 30 seconds (reduced frequency to minimize errors)
    const interval = setInterval(checkForceLogout, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [router, user]);

  return { user, isLoading };
}
