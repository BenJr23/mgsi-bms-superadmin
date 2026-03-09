'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, ChevronDown, Clock, LogOut, User } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth-client'
import { getNotificationCount } from '@/app/_actions/notification'
import { APP_NAV_ITEMS, Sidebar, type UserRole } from './Sidebar'

type AuthShellProps = {
  children: React.ReactNode
}

const SHELL_HIDDEN_PATHS = ['/reset-password']

function getPageTitle(pathname: string): string {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/bookings') return 'Bookings'
  if (pathname === '/buildings') return 'Buildings'
  if (pathname === '/rooms') return 'Rooms'
  if (pathname === '/calendar') return 'Calendar'
  if (pathname === '/reports') return 'Reports'
  if (pathname === '/users') return 'Users'
  if (pathname === '/companies') return 'Companies'
  if (pathname === '/profile') return 'Profile'
  if (pathname === '/settings') return 'Settings'
  return 'Dashboard'
}

export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [latestBookings, setLatestBookings] = useState<any[]>([])
  const [navigationTarget, setNavigationTarget] = useState<string | null>(null)
  const { data: session } = useSession()

  const sessionUser = session?.user as any
  const sessionRole = sessionUser?.role
  const userRole: UserRole = sessionRole === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN'
  const userName = sessionUser?.name?.trim() || (userRole === 'SUPERADMIN' ? 'Super Admin' : 'Admin User')
  const userImage = sessionUser?.image || null

  const userInitials = useMemo(
    () =>
      userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part[0]?.toUpperCase())
        .join('') || (userRole === 'SUPERADMIN' ? 'SA' : 'AD'),
    [userName, userRole]
  )

  const pageTitle = getPageTitle(pathname)
  const hideShell = SHELL_HIDDEN_PATHS.some((segment) => pathname.startsWith(segment))

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await getNotificationCount()
      if (res.success) {
        setNotifCount(res.count || 0)
        setLatestBookings(res.latestBookings || [])
      }
    }

    void fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!navigationTarget) {
      return
    }

    if (pathname === navigationTarget) {
      setNavigationTarget(null)
      return
    }

    const timer = setTimeout(() => {
      router.replace(navigationTarget)
    }, 120)

    return () => clearTimeout(timer)
  }, [navigationTarget, pathname, router])

  const navigateTo = (href: string) => {
    if (href === pathname) {
      return
    }

    setNavigationTarget(href)
    router.push(href)
  }

  const handleLogout = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/sign-in'
        },
      },
    })
  }

  if (hideShell) {
    return <>{children}</>
  }

  const mobileItems = APP_NAV_ITEMS.filter((item) => item.roles.includes(userRole))

  return (
    <div className="relative flex h-screen bg-slate-50 font-sans text-slate-900">
      <div className="pointer-events-none absolute left-0 right-0 top-16 z-15 h-[2px] bg-red-900" />
      <div className="hidden md:block">
        <Sidebar userRole={userRole} onNavigate={navigateTo} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white sticky top-0 z-20 shadow-sm">
          <div className="h-16 flex items-center justify-between px-4 lg:px-8">
            <div className="hidden md:flex items-center text-sm text-slate-500">
              <span className="font-bold text-red-900 text-lg">BookingOS</span>
              <span className="mx-2 text-slate-300">/</span>
              <span className="capitalize font-medium text-slate-700">{pageTitle}</span>
            </div>

            <div className="md:hidden flex items-center">
              <Image src="/GreatWork Logo.avif" alt="GreatWork Logo" width={120} height={32} className="object-contain" priority />
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-2 text-slate-500 hover:text-red-900 relative transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {notifCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-900 text-[10px] font-medium text-white border-2 border-white">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-30 overflow-hidden">
                      <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                        <span className="font-semibold text-sm">Latest Bookings</span>
                        <span className="text-xs text-red-900 font-medium">{notifCount} new (24h)</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {latestBookings.length > 0 ? (
                          latestBookings.map((booking) => (
                            <button
                              key={booking.id}
                              onClick={() => {
                                navigateTo('/bookings')
                                setNotifOpen(false)
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-slate-900 truncate">{booking.submittedBy?.name || 'Unknown User'}</span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="w-3 h-3" />
                                  {new Date(booking.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 truncate">Requested {booking.room?.roomName || 'Room'} in {booking.building?.buildingName || 'Building'}</p>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-sm text-slate-400">No recent bookings</div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          navigateTo('/bookings')
                          setNotifOpen(false)
                        }}
                        className="w-full py-2 text-center text-xs font-medium text-red-900 hover:bg-red-50 border-t border-slate-100"
                      > 
                        View All Bookings
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div className="relative">
                <button type="button" onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 hover:opacity-90 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-red-900 flex items-center justify-center text-white font-bold text-xs border border-red-900 overflow-hidden">
                    {userImage ? <Image src={userImage} alt={userName} width={32} height={32} className="w-full h-full object-cover" /> : userInitials}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-40">
                      <button
                        type="button"
                        onClick={() => {
                          navigateTo('/profile')
                          setDropdownOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4" /> Profile
                      </button>
                      <div className="my-1 border-t border-slate-200" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around border-t border-slate-200 bg-white px-2 py-2 z-20 shadow-lg">
          {mobileItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.href)}
                className="flex flex-col items-center justify-center gap-1 px-2 py-2 min-w-0 flex-1"
              >
                <Icon size={22} className={`${isActive ? 'text-red-900' : 'text-slate-500'} transition-colors`} />
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
