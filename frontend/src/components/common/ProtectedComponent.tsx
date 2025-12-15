import { ReactNode } from 'react';
import { useComponentAccess } from '@/hooks/useComponentAccess';

interface ProtectedComponentProps {
  componentId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Wrapper component that conditionally renders children based on user access
 *
 * Usage:
 * <ProtectedComponent componentId="live_calls">
 *   <LiveCallsCard />
 * </ProtectedComponent>
 */
export function ProtectedComponent({ componentId, children, fallback = null }: ProtectedComponentProps) {
  const { hasAccess } = useComponentAccess();

  if (!hasAccess(componentId)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
