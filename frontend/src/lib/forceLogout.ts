/**
 * Force logout utility
 * Broadcasts a logout event to all tabs/windows for a specific user
 */

const FORCE_LOGOUT_EVENT = 'force_logout';
const FORCE_LOGOUT_KEY = 'force_logout_data';

interface ForceLogoutData {
  userId: string;
  timestamp: number;
}

/**
 * Trigger force logout for a specific user across all tabs
 * @param userId - ID of the user to log out (optional - logs out current user if not provided)
 */
export function triggerForceLogout(userId?: string) {
  const currentUser = localStorage.getItem('user');
  const targetUserId = userId || (currentUser ? JSON.parse(currentUser).id : null);

  if (!targetUserId) {
    console.warn('Cannot trigger force logout: no user ID provided');
    return;
  }

  const logoutData: ForceLogoutData = {
    userId: targetUserId,
    timestamp: Date.now()
  };

  // Set logout data in localStorage to trigger storage event in other tabs
  localStorage.setItem(FORCE_LOGOUT_KEY, JSON.stringify(logoutData));

  // Also dispatch custom event for current tab
  window.dispatchEvent(new CustomEvent(FORCE_LOGOUT_EVENT, { detail: logoutData }));
}

/**
 * Listen for force logout events
 * @param callback Function to call when force logout is triggered for current user
 * @returns Cleanup function to remove listeners
 */
export function onForceLogout(callback: () => void) {
  const getCurrentUserId = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData).id : null;
  };

  // Handle custom event (same tab)
  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<ForceLogoutData>;
    const currentUserId = getCurrentUserId();

    if (currentUserId && customEvent.detail?.userId === currentUserId) {
      callback();
    }
  };

  // Handle storage event (other tabs)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === FORCE_LOGOUT_KEY && e.newValue) {
      try {
        const logoutData: ForceLogoutData = JSON.parse(e.newValue);
        const currentUserId = getCurrentUserId();

        if (currentUserId && logoutData.userId === currentUserId) {
          callback();
        }
      } catch (error) {
        console.error('Error parsing force logout data:', error);
      }
    }
  };

  window.addEventListener(FORCE_LOGOUT_EVENT, handleCustomEvent as EventListener);
  window.addEventListener('storage', handleStorageEvent);

  // Return cleanup function
  return () => {
    window.removeEventListener(FORCE_LOGOUT_EVENT, handleCustomEvent as EventListener);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
