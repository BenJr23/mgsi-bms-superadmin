"use client";

import { useRouter } from "next/navigation";
import { Home, ChevronLeft } from "lucide-react";

export default function NotFound() {
    const router = useRouter();

    return (
        <main className="min-h-screen flex items-center justify-center bg-white px-6 select-none">
            <div className="text-center max-w-lg">
                <div className="mb-8">
                    <h1 className="text-9xl font-bold text-[#8B1D1D] mb-4 tracking-tight">
                        404
                    </h1>
                </div>

                <div className="mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                        Page Not Found
                    </h2>
                    <p className="text-slate-600 text-base leading-relaxed">
                        The page you&apos;re trying to access doesn&apos;t exist or has been moved.
                        Don&apos;t worry, you can always go back to the home page.
                    </p>
                </div>

                <div className="space-x-4">
                    <button
                        onClick={() => router.push("/")}
                        className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition-colors bg-[#8B1D1D] text-white hover:bg-[#6D1515] active:bg-[#5A0F0F] focus:outline-none focus:ring-2 focus:ring-[#8B1D1D]/20 shadow-sm"
                    >
                        <Home className="w-5 h-5" />
                        Return to Home
                    </button>

                    <button
                        onClick={() => router.back()}
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-semibold transition-colors border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300/20 shadow-sm"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Go Back
                    </button>
                </div>
            </div>
        </main>
    );
}
