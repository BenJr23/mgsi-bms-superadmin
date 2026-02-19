import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN"] as const;

/**
 * Get and validate the current session
 * Only allows ADMIN and SUPERADMIN role access
 */
export async function getValidatedSession() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    // RBAC: Only allow ADMIN and SUPERADMIN roles
    if (!session.user.role || !ALLOWED_ROLES.includes(session.user.role as (typeof ALLOWED_ROLES)[number])) {
        redirect("/sign-in?error=unauthorized");
    }

    return session;
}

/**
 * Check if user has ADMIN or SUPERADMIN role
 */
export function hasAllowedRole(role?: string | null): boolean {
    return !!role && ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);
}

/**
 * Validate role on client components
 * Call this in useEffect or event handlers
 */
export function validateAllowedRole(role?: string | null): void {
    if (!hasAllowedRole(role)) {
        window.location.href = "/sign-in?error=unauthorized";
    }
}
