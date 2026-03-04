"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  DoorOpen,
  Calendar,
  BarChart3,
  Users } from
'lucide-react';
export type UserRole = 'ADMIN' | 'SUPERADMIN';

export type AppNavItem = {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  roles: UserRole[]
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'bookings',
    label: 'Bookings',
    href: '/bookings',
    icon: CalendarCheck,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'buildings',
    label: 'Buildings',
    href: '/buildings',
    icon: Building2,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'rooms',
    label: 'Rooms',
    href: '/rooms',
    icon: DoorOpen,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'reports',
    label: 'Reports',
    href: '/reports',
    icon: BarChart3,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'users',
    label: 'Users',
    href: '/users',
    icon: Users,
    roles: ['SUPERADMIN']
  }
]

interface SidebarProps {
  userRole: UserRole;
}
export function Sidebar({
  userRole
}: SidebarProps) {
  const pathname = usePathname();

  const filteredItems = APP_NAV_ITEMS.filter((item) =>
  item.roles.includes(userRole)
  );
  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col h-screen border-r border-slate-200 transition-all duration-300 shadow-sm">
      {/* Header */}
      <div className="h-16 flex items-center justify-center px-3">
        <div className="flex items-center gap-2 w-full px-3">
          <Image
            src="/GreatWork Logo.avif"
            alt="GreatWork Logo"
            width={150}
            height={40}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Menu
        </div>
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive ? 'bg-red-900 text-white shadow-md shadow-red-900/20' : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'}`}>

              <Icon
                size={18}
                className={isActive ? 'text-white' : 'text-slate-500'} />

              {item.label}
            </Link>);

        })}
      </nav>
    </aside>);

}