import { NextResponse, type NextRequest } from "next/server";
import { authEdge } from "@/lib/auth-edge";

const authPages = ["/sign-in", "/sign-up"];
const publicPrefixes = ["/home", "/api/auth", "/sign-in", "/sign-up"];
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN"] as const;

const hasAllowedRole = (role?: string | null) =>
    !!role && ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);

const isStaticAsset = (pathname: string) => /\.[^/]+$/.test(pathname);

const isPublicPath = (pathname: string) =>
    pathname === "/" ||
    publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const isApiPath = pathname.startsWith("/api");

    if (isStaticAsset(pathname) || pathname.startsWith("/_next")) {
        return NextResponse.next();
    }

    // IMPORTANT: Allow auth internal APIs to pass through immediately
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    const session = await getSession(request);

    if (isPublicPath(pathname)) {
        if (session?.user && authPages.includes(pathname)) {
            const passwordVerified = (session.user as { passwordVerified?: boolean }).passwordVerified;

            if (hasAllowedRole(session.user.role) && passwordVerified === false) {
                return NextResponse.redirect(new URL("/reset-password", request.url));
            }

            if (hasAllowedRole(session.user.role)) {
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }
        }
        return NextResponse.next();
    }

    // Protected route logic
    if (!session || !session.user) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(signInUrl);
    }

    if (!hasAllowedRole(session.user.role)) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(signInUrl);
    }

    const passwordVerified = (session.user as { passwordVerified?: boolean }).passwordVerified;
    const isResetPasswordPage = pathname === "/reset-password";
    const isVerifyPasswordApi = pathname === "/api/user/verify-password";

    if (!isApiPath && passwordVerified === false && !isResetPasswordPage && !isVerifyPasswordApi) {
        return NextResponse.redirect(new URL("/reset-password", request.url));
    }

    // CRITICAL: Ensure we return the response with the session context
    return NextResponse.next();
}

async function getSession(request: NextRequest) {
    try {
        const session = await authEdge.api.getSession({
            headers: request.headers,
        });
        return session;
    } catch (error) {
        console.error("Middleware Session Error:", error);
        return null;
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};