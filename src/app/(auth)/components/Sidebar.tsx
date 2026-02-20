"use client";

import React from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  DoorOpen,
  Calendar,
  BarChart3,
  Users,
  ChevronLeft,
  ChevronRight } from
'lucide-react';
export type UserRole = 'ADMIN' | 'SUPERADMIN';
export type TabId =
'dashboard' |
'bookings' |
'buildings' |
'rooms' |
'calendar' |
'reports' |
'users';
interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userRole: UserRole;
  showingSpecialView?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}
export function Sidebar({
  activeTab,
  onTabChange,
  userRole,
  showingSpecialView,
  collapsed = false,
  onToggleCollapse
}: SidebarProps) {

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
  }];

  const filteredItems = menuItems.filter((item) =>
  item.roles.includes(userRole)
  );
  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white text-slate-700 flex flex-col h-screen border-r border-slate-200 transition-all duration-300 shadow-sm`}>
      {/* Header */}
      <div className="h-16 flex items-center justify-center px-3 border-b-2 border-red-900">
        {!collapsed ? (
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
        ) : (
          <div className="w-8 h-8 bg-red-900 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            B
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Menu
          </div>
        )}
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !showingSpecialView;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as TabId)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isActive ? 'bg-red-900 text-white shadow-md shadow-red-900/20' : 'hover:bg-slate-100 hover:text-slate-900 text-slate-700'}`}>

              <Icon
                size={18}
                className={isActive ? 'text-white' : 'text-slate-500'} />

              {!collapsed && item.label}
            </button>);

        })}
      </nav>

      {/* Collapse Toggle Button */}
      {onToggleCollapse && (
        <div className="p-3 border-t border-slate-200 hidden lg:block">
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight size={18} />
            ) : (
              <>
                <ChevronLeft size={18} />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>);

}