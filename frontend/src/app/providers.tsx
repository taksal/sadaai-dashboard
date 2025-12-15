'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onForceLogout } from '@/lib/forceLogout';

function ForceLogoutListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't setup listener on login page
    if (pathname === '/login') return;

    const cleanup = onForceLogout(() => {
      // Clear user data
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');

      // Redirect to login
      router.push('/login');
    });

    return cleanup;
  }, [router, pathname]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ForceLogoutListener />
      {children}
    </QueryClientProvider>
  );
}
