'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { signIn, signOut } from '@/lib/auth-client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { getCurrentUser } from '@/app/_actions/auth';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<'login' | 'otp' | 'reset-password'>('login');
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'unauthorized') {
      signOut({
        fetchOptions: {
          onSuccess: () => {
            setError('Access denied. Only users with CLIENT role are allowed.');
          },
        },
      });
    }
  }, [searchParams]);

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // CORRECTED URL PATH BELOW
      const res = await fetch('/api/auth/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      const result = await res.json();

      if (res.ok) {
        setView('otp');
      } else {
        setError(result.error || "Failed to send OTP.");
      }
    } catch (err: any) {
      console.error("FORGOT_PASSWORD_CLIENT_ERROR:", err);
      setError(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
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
          const result = await getCurrentUser();
          if (result.success && result.user?.passwordVerified === false) {
            router.push('/reset-password');
            return;
          }
        } catch (innerErr) {
          console.error("GET_CURRENT_USER_ERROR:", innerErr);
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error("SIGN_IN_CLIENT_ERROR:", err);
      setError(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // CORRECTED URL PATH BELOW
      const res = await fetch('/api/auth/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, otp }),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setResetToken(result.token); 
        setView('reset-password');
        setError(null);
      } else {
        setError(result.error || "Invalid or expired OTP.");
      }
    } catch (err: any) {
      console.error("VERIFY_OTP_CLIENT_ERROR:", err);
      setError(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      // CORRECTED URL PATH BELOW
      const res = await fetch('/api/auth/user/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reset', 
          token: resetToken, 
          password: newPassword 
        }),
      });
      const result = await res.json();

      if (res.ok) {
        setView('login');
        setError(null);
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
        setShowSuccessModal(true);
      } else {
        setError(result.error || "Failed to reset password.");
      }
    } catch (err: any) {
      console.error("RESET_PASSWORD_CLIENT_ERROR:", err);
      setError(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const unauthorizedCopy = useMemo(() => {
    return error;
  }, [error]);

  return (
    <main className="min-h-screen w-full flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-[#8B1D1D]/35 bg-white/1 backdrop-blur-xl shadow-2xl shadow-black/20">
        <div className="px-8 py-10 sm:px-12 sm:py-12">
          <div className="mx-auto mb-6 flex justify-center">
            <div className="relative h-14 w-44">
              <Image src="/images/gwlogo.png" alt="GreatWork" fill priority className="object-contain" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#8B1D1D]">
              {view === 'login' && 'Welcome'}
              {view === 'otp' && 'Verify Code'}
              {view === 'reset-password' && 'Reset Password'}
            </h1>
            <p className="text-[#8B1D1D]/80 text-sm">
              {view === 'login' && 'Please enter your details to sign in'}
              {view === 'otp' && `Enter the 6-digit code sent to ${email}`}
              {view === 'reset-password' && 'Enter your new password'}
            </p>
          </div>

          {view === 'login' && (
            <form onSubmit={handleSignIn} className="mt-10 space-y-8">
              {unauthorizedCopy && (
                <p className="text-sm text-[#8B1D1D] text-center font-bold bg-red-100/10 p-2 rounded">{unauthorizedCopy}</p>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8B1D1D]">Email</label>
                <div className="relative">
                  <input
                    name="email"
                    type="email"
                    value={email || ""}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-b border-[#8B1D1D]/55 text-[#8B1D1D] px-1 pr-10 py-3 text-base focus:outline-none focus:border-[#8B1D1D] transition-colors"
                    required
                    autoComplete="email"
                  />
                  <Mail className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 text-[#8B1D1D]/70" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8B1D1D]">Password</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-transparent border-b border-[#8B1D1D]/55 text-[#8B1D1D] px-1 pr-10 py-3 text-base focus:outline-none focus:border-[#8B1D1D] transition-colors"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[#8B1D1D]/70 hover:text-[#8B1D1D]"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-medium text-[#8B1D1D] hover:text-black transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-3 text-sm text-[#8B1D1D] select-none">
                  <input name="rememberMe" type="checkbox" className="h-5 w-5 rounded-md border border-[#8B1D1D]/40 bg-white/10 accent-[#8B1D1D]" />
                  Remember Me
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full rounded-xl border border-[#8B1D1D]/60 bg-transparent text-[#8B1D1D] font-bold text-sm py-4 transition-colors hover:bg-[#8B1D1D] hover:text-white ${isLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isLoading ? 'Processing...' : 'Login'}
              </button>
            </form>
          )}

          {view === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="mt-10 space-y-8">
              {error && <p className="text-sm text-[#8B1D1D] text-center font-bold">{error}</p>}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8B1D1D]">One-Time Password</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp || ""}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-transparent border-b border-[#8B1D1D]/55 text-[#8B1D1D] px-1 py-3 text-center text-2xl tracking-[0.3em] focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>
              <div className="space-y-4">
                <button type="submit" disabled={isLoading} className={`w-full rounded-xl border border-[#8B1D1D]/60 bg-transparent text-[#8B1D1D] font-bold text-sm py-4 hover:bg-[#8B1D1D] hover:text-white ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button type="button" onClick={() => { setView('login'); setError(null); setOtp(""); }} className="w-full text-center text-xs font-medium text-[#8B1D1D] hover:text-black">Back to Login</button>
              </div>
            </form>
          )}

          {view === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="mt-10 space-y-8">
              {error && <p className="text-sm text-[#8B1D1D] text-center font-bold">{error}</p>}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8B1D1D]">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword || ""}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-[#8B1D1D]/55 text-[#8B1D1D] px-1 pr-10 py-3 text-base focus:outline-none"
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[#8B1D1D]/70">
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[#8B1D1D]">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword || ""}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-transparent border-b border-[#8B1D1D]/55 text-[#8B1D1D] px-1 pr-10 py-3 text-base focus:outline-none"
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[#8B1D1D]/70">
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <button type="submit" disabled={isLoading} className={`w-full rounded-xl border border-[#8B1D1D]/60 bg-transparent text-[#8B1D1D] font-bold text-sm py-4 hover:bg-[#8B1D1D] hover:text-white ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
                <button type="button" onClick={() => { setView('login'); setError(null); }} className="w-full text-center text-xs font-medium text-[#8B1D1D] hover:text-black">Back to Login</button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-6 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h3>
            <p className="text-gray-600 mb-6">Please sign in with your new password.</p>
            <button onClick={() => { setShowSuccessModal(false); setView('login'); setError(null); }} className="w-full rounded-xl bg-[#8B1D1D] text-white font-bold text-sm py-4 transition-colors hover:bg-[#7A1919]">Continue to Login</button>
          </div>
        </div>
      )}
    </main>
  );
}