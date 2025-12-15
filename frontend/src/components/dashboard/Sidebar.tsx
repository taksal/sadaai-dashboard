'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Phone, Users, Settings, LogOut, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types';
import { MonthlyBillWidget } from './MonthlyBillWidget';
import { useComponentAccess } from '@/hooks/useComponentAccess';

interface SidebarProps {
  userRole: UserRole;
}

interface NavLink {
  href: string;
  label: string;
  icon: any;
  pageId?: string; // ID for access control
}

export function Sidebar({ userRole }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const { canAccessPage } = useComponentAccess();

  useEffect(() => {
    if (userRole === UserRole.CLIENT) {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserId(user.id);
      }
    }
  }, [userRole]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const adminLinks: NavLink[] = [
    { href: '/admin', label: 'Dashboard', icon: Home },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const allClientLinks: NavLink[] = [
    { href: '/client', label: 'Dashboard', icon: Home, pageId: 'dashboard' },
    { href: '/client/calls', label: 'Call History', icon: Phone, pageId: 'calls' },
    { href: '/client/appointments', label: 'Appointments', icon: Calendar, pageId: 'appointments' },
    { href: '/client/integrations', label: 'Integrations', icon: Settings, pageId: 'integrations' },
  ];

  // Filter client links based on access permissions
  const clientLinks = userRole === UserRole.CLIENT
    ? allClientLinks.filter(link => !link.pageId || canAccessPage(link.pageId))
    : allClientLinks;

  const links = userRole === UserRole.ADMIN ? adminLinks : clientLinks;

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
        <Image
          src="/logo.png"
          alt="SADA Conversation AI"
          width={150}
          height={150}
          className="w-auto h-auto max-w-[100px] border-2 border-black rounded-[25px]"
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="nav-menu flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Monthly Bill Widget - Only for Clients */}
      {userRole === UserRole.CLIENT && userId && (
        <div className="mt-auto flex justify-center -mx-6">
          <MonthlyBillWidget userId={userId} />
        </div>
      )}
    </div>
  );
}
