import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { newPassword, token } = await req.json();

        if (!newPassword || !token) {
            return NextResponse.json(
                { error: "Missing newPassword or token" }, 
                { status: 400 }
            );
        }

        // 1. Reset the password using BetterAuth API
        const response = await auth.api.resetPassword({
            body: { newPassword, token },
            headers: req.headers,
        });

        // 2. Always return a valid Next.js Response object
        return NextResponse.json(response);
        
    } catch (error: any) {
        console.error("Password reset error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to reset password" }, 
            { status: 400 }
        );
    }
}