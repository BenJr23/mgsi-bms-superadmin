import { headers } from "next/headers";
import { auth } from "./auth";

export async function getSession() {
    return await auth.api.getSession({ headers: await headers() });
}

/**
 * Get the current logged-in user (SERVER-SIDE ONLY)
 * Use this in server components, server actions, and API routes
 * Returns null if no user is logged in
 */
export async function getCurrentUser() {
    const session = await getSession();
    return session?.user ?? null;
}

/**
 * Require authentication - throws if no user is logged in (SERVER-SIDE ONLY)
 * Use this in server actions or API routes that require authentication
 */
export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized - please sign in");
    }
    return user;
}