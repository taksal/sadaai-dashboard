'use client';

import { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { UserProfileDropdown } from './UserProfileDropdown';
import { Bell, Search, X, RefreshCw, Bot, ChevronDown } from 'lucide-react';
import { MobileSidebar } from '@/components/dashboard/MobileSidebar';
import { DateFilterSelect } from '@/components/common/DateFilterSelect';
import { AutoSyncButton } from '@/components/client/AutoSyncButton';
import { VapiSyncButton } from '@/components/client/VapiSyncButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ModernSelect } from '@/components/common/ModernSelect';

// Custom Assistant Dropdown Component
function AssistantDropdown({
  assistants,
  selectedId,
  onSelect
}: {
  assistants: Array<{ id: string; name: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedAssistant = assistants.find(a => a.id === selectedId);
  const displayName = selectedId === 'all' ? '✨ All Assistants' : selectedAssistant?.name || assistants[0]?.name;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (id: string) => {
    onSelect(id);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group cursor-pointer"
      >
        <span className="text-xl font-extrabold text-gradient-primary-horizontal">
          {displayName}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-gradient-primary-horizontal transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{
            filter: 'brightness(0) saturate(100%) invert(20%) sepia(93%) saturate(3574%) hue-rotate(268deg) brightness(82%) contrast(101%)'
          }}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {assistants.map((assistant) => (
            <button
              key={assistant.id}
              onClick={() => handleSelect(assistant.id)}
              className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors ${
                assistant.id === selectedId
                  ? 'bg-gradient-to-r from-[#540D9B] to-[#004769] text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {assistant.name}
            </button>
          ))}
          <button
            onClick={() => handleSelect('all')}
            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors border-t border-gray-200 ${
              selectedId === 'all'
                ? 'bg-gradient-to-r from-[#540D9B] to-[#004769] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✨ All Assistants
          </button>
        </div>
      )}
    </div>
  );
}

interface HeaderProps {
  user: User;
  userRole: UserRole;
  dateFilter?: string;
  onDateFilterChange?: (value: string) => void;
  showDateFilter?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  appAccess?: string[];
  onSync?: () => void;
  isSyncing?: boolean;
  viewMode?: 'day' | 'week' | 'month';
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void;
  showViewModeSelector?: boolean;
  selectedAssistantId?: string;
  onAssistantChange?: (assistantId: string) => void;
  showAssistantSelector?: boolean;
}

export function Header({
  user,
  userRole,
  dateFilter,
  onDateFilterChange,
  showDateFilter = false,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  appAccess = [],
  onSync,
  isSyncing,
  viewMode,
  onViewModeChange,
  showViewModeSelector = false,
  selectedAssistantId,
  onAssistantChange,
  showAssistantSelector = false
}: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen && onSearchChange) {
      onSearchChange(''); // Clear search when closing
    }
  };

  return (
    <header className="card">
      <div className="flex h-14 items-center justify-between relative">
        {/* Left side - Mobile menu and Assistant selector */}
        <div className="flex items-center gap-4">
          {/* Mobile Sidebar Toggle */}
          <div className="lg:hidden">
            <MobileSidebar userRole={userRole} />
          </div>

          {/* Assistant Selector/Branding - Only shown for clients with assistants */}
          {showAssistantSelector && selectedAssistantId !== undefined && onAssistantChange && user.vapiAssistants && user.vapiAssistants.length > 0 && (
            <>
              {/* Single Assistant - Show as Simple Gradient Text */}
              {user.vapiAssistants.length === 1 ? (
                <span className="text-xl font-extrabold text-gradient-primary-horizontal">
                  {user.vapiAssistants[0].name}
                </span>
              ) : (
                /* Multiple Assistants - Custom Dropdown with Gradient Text */
                <AssistantDropdown
                  assistants={user.vapiAssistants}
                  selectedId={selectedAssistantId}
                  onSelect={onAssistantChange}
                />
              )}
            </>
          )}
        </div>

        {/* Expanding Search Input */}
        {isSearchOpen && onSearchChange && (
          <div className="absolute left-0 right-0 top-0 bottom-0 flex items-center px-4 bg-card z-50 animate-in fade-in slide-in-from-right-10 duration-200">
            <div className="relative flex-1 max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder={searchPlaceholder}
                value={searchTerm || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              <button
                onClick={handleSearchToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Right side - Date filter, sync buttons, and User profile */}
        <div className="flex items-center gap-3 ml-auto">
          {/* View Mode Selector for Calendar */}
          {showViewModeSelector && viewMode && onViewModeChange && (
            <div className="inline-flex rounded-full border border-border bg-muted p-1">
              <button
                onClick={() => onViewModeChange('day')}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                  viewMode === 'day'
                    ? 'bg-gradient-primary-horizontal text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => onViewModeChange('week')}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                  viewMode === 'week'
                    ? 'bg-gradient-primary-horizontal text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => onViewModeChange('month')}
                className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                  viewMode === 'month'
                    ? 'bg-gradient-primary-horizontal text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Month
              </button>
            </div>
          )}

          {/* Date Filter and Sync Buttons - Only shown on dashboard */}
          {showDateFilter && dateFilter && onDateFilterChange && (
            <>
              <DateFilterSelect value={dateFilter} onChange={onDateFilterChange} appAccess={appAccess} />
              {onSync ? (
                <Button
                  onClick={onSync}
                  disabled={isSyncing}
                  size="sm"
                  variant="outline"
                  className="hidden sm:flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Calendar'}
                </Button>
              ) : (
                <>
                  <AutoSyncButton />
                  <VapiSyncButton />
                </>
              )}
            </>
          )}

          {/* Search button - Only show if search functionality is provided */}
          {onSearchChange && (
            <button
              onClick={handleSearchToggle}
              className="hidden sm:flex btn-icon btn-ghost"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {/* Notifications button */}
          <button className="relative btn-icon btn-ghost">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
          </button>

          {/* User Profile Dropdown */}
          <UserProfileDropdown user={user} />
        </div>
      </div>
    </header>
  );
}
