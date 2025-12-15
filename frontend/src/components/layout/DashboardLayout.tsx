import React from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/layout/Header';
import { UserRole, User } from '@/types';

interface DashboardLayoutProps {
  userRole: UserRole;
  user?: User;
  children: React.ReactNode;
  dateFilter?: string;
  onDateFilterChange?: (value: string) => void;
  showDateFilter?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onSync?: () => void;
  isSyncing?: boolean;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
  showViewModeSelector?: boolean;
  selectedAssistantId?: string;
  onAssistantChange?: (assistantId: string) => void;
  showAssistantSelector?: boolean;
}

export function DashboardLayout({
  userRole,
  user,
  children,
  dateFilter,
  onDateFilterChange,
  showDateFilter = false,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  onSync,
  isSyncing,
  viewMode,
  onViewModeChange,
  showViewModeSelector = false,
  selectedAssistantId,
  onAssistantChange,
  showAssistantSelector = false
}: DashboardLayoutProps) {
  return (
    <div className="floating-layout">
      {/* Floating Sidebar - Hidden on mobile */}
      <aside className="hidden lg:block">
        <div className="floating-sidebar">
          <Sidebar userRole={userRole} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="floating-main">
        {user && (
          <Header
            user={user}
            userRole={userRole}
            dateFilter={dateFilter}
            onDateFilterChange={onDateFilterChange}
            showDateFilter={showDateFilter}
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            searchPlaceholder={searchPlaceholder}
            appAccess={user.appAccess || []}
            onSync={onSync}
            isSyncing={isSyncing}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
            showViewModeSelector={showViewModeSelector}
            selectedAssistantId={selectedAssistantId}
            onAssistantChange={onAssistantChange}
            showAssistantSelector={showAssistantSelector}
          />
        )}

        {/* Content */}
        <div className="animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
