import { NextResponse } from "next/server";
import { hasAllowedRole } from "@/lib/auth-utils";
import { getServerSession } from "@/lib/get-server";

type RequireApiSessionOptions = {
    requirePasswordVerified?: boolean;
};

export async function requireApiSession(options: RequireApiSessionOptions = {}) {
    const { requirePasswordVerified = true } = options;
    const session = await getServerSession();

    if (!session?.user) {
        return {
            session: null,
            errorResponse: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
        };
    }

    if (!hasAllowedRole(session.user.role)) {
        return {
            session: null,
            errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 403 }),
        };
    }

    const passwordVerified = Boolean((session.user as { passwordVerified?: boolean }).passwordVerified);
    if (requirePasswordVerified && !passwordVerified) {
        return {
            session: null,
            errorResponse: NextResponse.json({ error: "Password reset required" }, { status: 403 }),
        };
    }

    return {
        session,
        errorResponse: null,
    };
}
