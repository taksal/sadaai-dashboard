'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, KeyRound, Settings, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User as UserType } from '@/types';
import { ChangePasswordDialog } from './ChangePasswordDialog';

interface UserProfileDropdownProps {
  user: UserType;
}

export function UserProfileDropdown({ user }: UserProfileDropdownProps) {
  const router = useRouter();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  // Get user initials for avatar
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Generate a consistent color based on user name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="relative group focus:outline-none">
            <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-slate-200 dark:ring-slate-700 hover:ring-blue-500 dark:hover:ring-blue-500 transition-all duration-200 hover:scale-110">
              <AvatarFallback className={`${getAvatarColor(user.name)} text-white font-bold text-sm`}>
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            {/* Active indicator dot */}
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-slate-950"></span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64 mt-2" sideOffset={8}>
          {/* User Info Header */}
          <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-slate-200 dark:ring-slate-700">
                <AvatarFallback className={`${getAvatarColor(user.name)} text-white font-bold text-sm`}>
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1.5">
            <DropdownMenuItem className="cursor-pointer mx-1.5 px-2 py-2 rounded-md">
              <User className="mr-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm">My Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer mx-1.5 px-2 py-2 rounded-md">
              <Settings className="mr-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              className="cursor-pointer mx-1.5 px-2 py-2 rounded-md"
              onClick={() => setIsChangePasswordOpen(true)}
            >
              <KeyRound className="mr-2.5 h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span className="text-sm">Change Password</span>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator />

          {/* Logout */}
          <div className="py-1.5">
            <DropdownMenuItem
              className="cursor-pointer mx-1.5 px-2 py-2 rounded-md text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950"
              onClick={handleLogout}
            >
              <LogOut className="mr-2.5 h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
        userId={user.id}
      />
    </>
  );
}
