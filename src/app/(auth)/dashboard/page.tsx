"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar, UserRole, TabId } from '../components/Sidebar';
import { DashboardView } from '../components/DashboardView';
import { BookingsView } from '../components/BookingsView';
import { BuildingsView } from '../components/BuildingsView';
import { RoomsView } from '../components/RoomsView';
import { CalendarView } from '../components/CalendarView';
import { ReportsView } from '../components/ReportsView';
import { UsersView } from '../components/UsersView';
import { SettingsView } from '../components/SettingsView';
import { ProfileView } from '../components/ProfileView';
import { Menu, Bell } from 'lucide-react';
import { useSession } from '@/lib/auth-client';
import Image from 'next/image';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastLogin, setLastLogin] = useState<string | null>(null);
  const [localUserName, setLocalUserName] = useState<string>('');
  const [localUserImage, setLocalUserImage] = useState<string | null>(null);
  const [localUserPhone, setLocalUserPhone] = useState<string>('');
  const { data: session } = useSession();
  const sessionUser = session?.user as
  | {
    role?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    phoneNumber?: string | null;
    createdAt?: string | null;
  }
  | undefined;
  const sessionRole = sessionUser?.role;
  const userRole: UserRole = sessionRole === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';
  const userName = localUserName || sessionUser?.name?.trim() || (userRole === 'SUPERADMIN' ? 'Super Admin' : 'Admin User');
  const userEmail = sessionUser?.email || `${userRole.toLowerCase()}@company.com`;
  const userImage = localUserImage || sessionUser?.image || null;
  const userPhone = localUserPhone || sessionUser?.phoneNumber || '';
  const userCreatedAt = sessionUser?.createdAt || null;
  const userInitials =
  userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || (userRole === 'SUPERADMIN' ? 'SA' : 'AD');

  // Initialize local state when session loads
  useEffect(() => {
    if (sessionUser?.name && !localUserName) {
      setLocalUserName(sessionUser.name.trim());
    }
    if (sessionUser?.image && !localUserImage) {
      setLocalUserImage(sessionUser.image);
    }
    if (sessionUser?.phoneNumber && !localUserPhone) {
      setLocalUserPhone(sessionUser.phoneNumber);
    }
  }, [sessionUser?.name, sessionUser?.image, sessionUser?.phoneNumber, localUserName, localUserImage, localUserPhone]);

  const handleProfileUpdate = (updates: { name?: string; image?: string; phoneNumber?: string }) => {
    if (updates.name) {
      setLocalUserName(updates.name);
    }
    if (updates.image) {
      setLocalUserImage(updates.image);
    }
    if (updates.phoneNumber !== undefined) {
      setLocalUserPhone(updates.phoneNumber);
    }
  };

  useEffect(() => {
    if (userRole === 'ADMIN' && (activeTab === 'users' || activeTab === 'settings')) {
      setActiveTab('dashboard');
    }
  }, [activeTab, userRole]);

  useEffect(() => {
    const fetchLastLogin = async () => {
      try {
        const res = await fetch('/api/user/sessions/latest', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setLastLogin(data.lastLogin);
        }
      } catch (err) {
        console.error('Failed to fetch last login:', err);
      }
    };

    if (session?.user) {
      fetchLastLogin();
    }
  }, [session?.user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onViewAllBookings={() => setActiveTab('bookings')} />;
      case 'bookings':
        return <BookingsView />;
      case 'buildings':
        return <BuildingsView />;
      case 'rooms':
        return <RoomsView />;
      case 'calendar':
        return <CalendarView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView userName={userName} userEmail={userEmail} userRole={userRole} userImage={userImage} userPhone={userPhone} userCreatedAt={userCreatedAt} lastLogin={lastLogin} onProfileUpdate={handleProfileUpdate} />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {!sidebarOpen &&
      <div
        className="fixed inset-0 bg-black/50 z-20 lg:hidden"
        onClick={() => setSidebarOpen(true)} />

      }

      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out`}>

        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (window.innerWidth < 1024) setSidebarOpen(false);
          }}
          userRole={userRole}
          userName={userName}
          userEmail={userEmail}
          userImage={userImage}
          userInitials={userInitials} />

      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden ml-0 lg:ml-64 transition-all duration-300">
        {/* Top Header */}
        <header className="h-16 bg-white border-b-2 border-red-900 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md hover:bg-red-50 lg:hidden transition-colors">

              <Menu className="w-5 h-5 text-red-900" />
            </button>

            {/* Breadcrumbs / Title */}
            <div className="hidden sm:flex items-center text-sm text-slate-500">
              <span className="font-bold text-red-900 text-lg">BookingOS</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="capitalize font-medium text-slate-700">{activeTab}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-red-900 relative transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-900 rounded-full border-2 border-white"></span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-white font-bold text-xs border border-red-900 hover:opacity-90 transition-opacity overflow-hidden">

              {userImage ?
              <Image
                src={userImage}
                alt={userName}
                width={32}
                height={32}
                className="w-full h-full object-cover" /> :

              userInitials
              }
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>);

}