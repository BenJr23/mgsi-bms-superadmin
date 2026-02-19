"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { signIn, signOut } from '@/lib/auth-client';
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle unauthorized access - sign out user automatically
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      signOut({
        fetchOptions: {
          onSuccess: () => {
            setError('Access denied. Only users with ADMIN or SUPERADMIN role are allowed.');
          },
        },
      });
    }
  }, [searchParams]);

const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

      try {
      const res = await signIn.email({
        email,
        password,
        rememberMe: formData.get("rememberMe") === "on",
      }, {
        onError: async (ctx) => {
          if (ctx.error.status === 403) {
            setError("Email not verified. Please verify your account or contact support.");
          } else {
            setError(ctx.error.message || "Something went wrong.");
          }
        }
      });

      if (res && !res.error) {
        try {
          const me = await fetch('/api/user/me', { cache: 'no-store' });
          if (me.ok) {
            const data = await me.json();
            if (data?.user?.passwordVerified === false) {
              router.push('/reset-password');
              return;
            }
          }
        } catch {
          // fallback to dashboard when user lookup fails
        }

        router.push('/dashboard');
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
};

  return (
    <main className="min-h-screen w-full bg-white flex flex-col items-center justify-center px-6 relative">

      {/* --- TOP LEFT BRANDING (Optional, nice for no-container layouts) --- */}
      <div className="absolute top-8 left-8 hidden md:block">
        <div className="relative w-32 h-10 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <Image src="/images/gwlogo.png" alt="GreatWork" fill className="object-contain" />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-10">

        {/* --- HEADER SECTION --- */}
        <div className="text-center space-y-4">
          <div className="relative w-48 h-16 mx-auto mb-6">
            <Image
              src="/images/gwlogo.png"
              alt="GreatWork"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Welcome back.
          </h1>
          <p className="text-slate-500 text-sm">
            Please enter your details to sign in.
          </p>
        </div>

        {/* --- FORM SECTION --- */}
        <form onSubmit={handleSignIn} className="space-y-6">
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider ml-1">Email Address</label>
            <input
              name="email"
              type="email"
              placeholder="name@company.com"
              className="w-full bg-gray-50 border-b-2 border-gray-200 text-slate-900 p-4 text-base focus:outline-none focus:border-black focus:bg-white transition-all placeholder:text-gray-400"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">Password</label>
              <a href="#" className="text-xs font-medium text-gray-400 hover:text-[#8B1D1D] transition-colors">Forgot?</a>
            </div>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              className="w-full bg-gray-50 border-b-2 border-gray-200 text-slate-900 p-4 text-base focus:outline-none focus:border-black focus:bg-white transition-all placeholder:text-gray-400"
              required
            />
          </div>

          <div className="">
            <div className="flex items-center justify-between pb-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  name="rememberMe"
                  type="checkbox"
                  className="h-4 w-4 border-gray-300 text-black focus:ring-black"
                />
                Remember me
              </label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-black text-white font-bold uppercase tracking-[0.15em] text-xs py-5 hover:bg-[#8B1D1D] transition-colors duration-300
                ${isLoading ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {isLoading ? 'Processing...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* --- FOOTER --- */}
        <p className="text-center text-xs text-slate-400">
          Not a member? <span className="text-slate-900 font-bold cursor-pointer underline hover:text-[#8B1D1D]">Apply now</span>
        </p>
      </div>

    </main>
  );
}