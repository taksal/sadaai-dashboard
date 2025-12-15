import { useCallback } from 'react';
import { useAuthUser } from './useAuthUser';
import { User } from '@/types';

/**
 * Global hook for component-level access control
 *
 * Usage:
 * const { user } = useAuthUser();
 * const { hasAccess, canAccessPage } = useComponentAccess(user);
 * if (hasAccess('live_calls')) { ... }
 * if (canAccessPage('calendar')) { ... }
 */
export function useComponentAccess(providedUser?: User | null) {
  const { user: hookUser } = useAuthUser(); // Fallback if no user provided
  const user = providedUser !== undefined ? providedUser : hookUser;

  /**
   * Check if user has access to a specific component
   * Admins have access to everything
   * Clients are controlled by their appAccess array
   */
  const hasAccess = useCallback((componentId: string): boolean => {
    // Admins have access to everything
    if (user?.role === 'ADMIN') {
      return true;
    }

    // If no user, deny access
    if (!user) {
      return false;
    }

    // If appAccess is not set or empty, grant access to all (backward compatibility)
    if (!user.appAccess || !Array.isArray(user.appAccess) || user.appAccess.length === 0) {
      return true;
    }

    // Check if component is in user's access list
    return user.appAccess.includes(componentId);
  }, [user]);

  /**
   * Check if user can access a specific page
   * Pages: dashboard, calls, calendar, appointments, integrations
   */
  const canAccessPage = useCallback((pageId: string): boolean => {
    return hasAccess(pageId);
  }, [hasAccess]);

  /**
   * Get list of accessible pages for navigation
   */
  const getAccessiblePages = useCallback((): string[] => {
    if (user?.role === 'ADMIN') {
      return ['dashboard', 'calls', 'calendar', 'appointments', 'integrations'];
    }

    if (!user || !user.appAccess || !Array.isArray(user.appAccess)) {
      return ['dashboard', 'calls', 'calendar', 'appointments', 'integrations'];
    }

    const allPages = ['dashboard', 'calls', 'calendar', 'appointments', 'integrations'];
    return allPages.filter(page => user.appAccess?.includes(page));
  }, [user]);

  return {
    hasAccess,
    canAccessPage,
    getAccessiblePages,
    user,
  };
}
