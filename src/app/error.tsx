"use client";

import { useRouter } from "next/navigation";
import { Home, RefreshCw, AlertTriangle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    return (
        <main className="min-h-screen flex items-center justify-center bg-white px-6">
            <div className="text-center max-w-lg">
                <div className="mb-8 flex justify-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-[#8B1D1D]/10 rounded-full blur-2xl"></div>
                        <div className="relative bg-[#8B1D1D]/10 rounded-full p-6">
                            <AlertTriangle className="w-20 h-20 text-[#8B1D1D]" strokeWidth={1.5} />
                        </div>
                    </div>
                </div>

                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                        Something Went Wrong
                    </h2>
                    <p className="text-slate-600 text-base leading-relaxed mb-2">
                        We encountered an unexpected error while processing your request.
                        Please try again or return to the home page.
                    </p>
                    {error.digest && (
                        <p className="text-xs text-slate-400 font-mono mt-4">
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => {
                            reset();
                            router.refresh();
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition-colors bg-[#8B1D1D] text-white hover:bg-[#6D1515] active:bg-[#5A0F0F] focus:outline-none focus:ring-2 focus:ring-[#8B1D1D]/20 shadow-sm"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>

                    <button
                        onClick={() => router.push("/")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition-colors border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300/20 shadow-sm"
                    >
                        <Home className="w-5 h-5" />
                        Return to Home
                    </button>
                </div>
            </div>
        </main>
    );
}
