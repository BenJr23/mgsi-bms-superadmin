"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { getNotificationCount } from '../app/_actions/notification'
const ChevronDown = ({ className }: { className?: string }) => (
  <svg
    className={className || "w-3 h-3 opacity-70"}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
  </svg>
);

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    async function fetchNotifications() {
      if (!session?.user) return;

const res = await getNotificationCount();
      if (res.success && typeof res.count === "number") {
        setNotificationCount(res.count);
      }
    }

    fetchNotifications();

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session]);

  return (
    <header className="sticky top-0 z-[1000] h-20 w-full border-b border-gray-100 bg-white flex items-center">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/images/gwlogo.png"
            alt="GreatWork Logo"
            width={150}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden lg:block">
          <ul className="flex items-center gap-8 list-none">
            <li>
              <Link
                href="/dashboard"
                className={`text-[0.95rem] font-medium transition-all hover:text-[#8B1D1D] ${
                  isActive("/dashboard")
                    ? "text-[#8B1D1D]"
                    : "text-gray-500"
                }`}
              >
                Home
              </Link>
            </li>

            <li>
              <Link
                href="/bookings"
                className="group flex items-center gap-1 text-[0.95rem] font-medium text-gray-500 transition-all hover:text-[#8B1D1D]"
              >
                Booking
                <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
              </Link>
            </li>

            <li>
              <Link
                href="/solutions"
                className="group flex items-center gap-1 text-[0.95rem] font-medium text-gray-500 transition-all hover:text-[#8B1D1D]"
              >
                Enterprise Solutions
                <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
              </Link>
            </li>

            <li>
              <Link
                href="/apply"
                title="Redirect to application form"
                className="text-[0.95rem] font-semibold text-gray-900 transition-all hover:text-[#8B1D1D]"
              >
                Apply now
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-4">
          {/* 🔔 Notification Bell */}
          {session?.user && (
            <div className="relative hidden sm:flex">
              <Link
                href="/dashboard/bookings"
                className="relative p-2 text-gray-600 hover:text-[#8B1D1D] transition-all"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405C18.79 15.21 18 13.705 18 12V8a6 6 0 10-12 0v4c0 1.705-.79 3.21-1.595 3.595L3 17h5m4 0a3 3 0 01-6 0m6 0H9"
                  />
                </svg>

                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {notificationCount}
                  </span>
                )}
              </Link>
            </div>
          )}

          <Link
            href="/journal"
            className="hidden sm:flex items-center gap-2 rounded-md border-2 border-[#8B1D1D] px-5 py-2 text-[0.9rem] font-semibold text-[#8B1D1D] transition-all hover:bg-[#8B1D1D] hover:text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-900/15 active:translate-y-0"
          >
            The Greatwork Journal
            <ChevronDown />
          </Link>

          {session?.user && (
            <button
              onClick={() => signOut()}
              className="hidden sm:flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2 text-[0.9rem] font-semibold text-white transition-all hover:bg-[#8B1D1D]"
            >
              Sign out
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="block lg:hidden p-2 text-gray-600 hover:text-[#8B1D1D]"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16m-7 6h7"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-20 left-0 w-full bg-white border-b border-gray-100 p-6 flex flex-col gap-4 lg:hidden animate-in slide-in-from-top-2">
          <Link href="/" className="text-gray-500 font-medium">
            Home
          </Link>
          <Link href="/spaces" className="text-gray-500 font-medium">
            Spaces
          </Link>
          <Link href="/solutions" className="text-gray-500 font-medium">
            Enterprise Solutions
          </Link>
          <Link href="/apply" className="text-gray-900 font-bold">
            Apply now
          </Link>

          {session?.user && (
            <button
              onClick={() => signOut()}
              className="text-left text-gray-900 font-bold"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  );
}