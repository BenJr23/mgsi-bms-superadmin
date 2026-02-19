"use client";

import React from 'react';
import Image from 'next/image';
import { signOut } from '@/lib/auth-client';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  DoorOpen,
  Calendar,
  BarChart3,
  Users,
  Settings,
  LogOut } from
'lucide-react';
export type UserRole = 'ADMIN' | 'SUPERADMIN';
export type TabId =
'dashboard' |
'bookings' |
'buildings' |
'rooms' |
'calendar' |
'reports' |
'users' |
'settings' |
'profile';
interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userRole: UserRole;
  userName: string;
  userEmail: string;
  userImage: string | null;
  userInitials: string;
}
export function Sidebar({
  activeTab,
  onTabChange,
  userRole,
  userName,
  userEmail,
  userImage,
  userInitials
}: SidebarProps) {
  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/sign-in';
        }
      }
    });
  };

  const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: CalendarCheck,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'buildings',
    label: 'Buildings',
    icon: Building2,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'rooms',
    label: 'Rooms',
    icon: DoorOpen,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    roles: ['ADMIN', 'SUPERADMIN']
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
    roles: ['SUPERADMIN']
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    roles: ['SUPERADMIN']
  }];

  const filteredItems = menuItems.filter((item) =>
  item.roles.includes(userRole)
  );
  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-200 z-10 transition-all duration-300 shadow-sm">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b-2 border-red-900">
        <div className="flex items-center gap-2 w-full">
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
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as TabId)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive ? 'bg-red-900 text-white shadow-md shadow-red-900/20' : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'}`}>

              <Icon
                size={18}
                className={isActive ? 'text-white' : 'text-slate-500'} />

              {item.label}
            </button>);

        })}
      </nav>

      {/* User Profile / Footer */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange('profile')}
            className={`flex-1 flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-200 text-left ${activeTab === 'profile' ? 'bg-red-900 text-white shadow-md shadow-red-900/20' : 'hover:bg-slate-100'}`}>

            <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-xs text-white font-medium overflow-hidden">
              {userImage ?
              <Image
                src={userImage}
                alt={userName}
                width={32}
                height={32}
                className="w-full h-full object-cover" /> :

              userInitials
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${activeTab === 'profile' ? 'text-white' : 'text-slate-900'}`}>
                {userName}
              </p>
              <p className={`text-xs truncate ${activeTab === 'profile' ? 'text-red-100' : 'text-slate-500'}`}>
                {userEmail}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            className="p-2 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">

            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>);

}