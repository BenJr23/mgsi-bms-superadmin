import { NextResponse, type NextRequest } from "next/server";
import { authEdge } from "@/lib/auth-edge";

const authPages = ["/sign-in"];
const publicPrefixes = ["/api/auth", "/sign-in"];
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN"] as const;
const changePasswordPath = "/reset-password";

const hasAllowedRole = (role?: string | null) =>
    !!role && ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);

const isStaticAsset = (pathname: string) => /\.[^/]+$/.test(pathname);

const isPublicPath = (pathname: string) =>
    publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export default async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (isStaticAsset(pathname) || pathname.startsWith("/_next")) {
        return NextResponse.next();
    }

    if (pathname === "/") {
        return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // IMPORTANT: Allow auth internal APIs to pass through immediately
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    const session = await getSession(request);

    if (isPublicPath(pathname)) {
        if (session?.user && authPages.includes(pathname)) {
            if (hasAllowedRole(session.user.role)) {
                return NextResponse.redirect(new URL("/dashboard", request.url));
            }

            const signOutUrl = new URL("/api/auth/sign-out", request.url);
            signOutUrl.searchParams.set("next", pathname);
            return NextResponse.redirect(signOutUrl);
        }

        return NextResponse.next();
    }

    if (!session || !session.user) {
        const signInUrl = new URL("/sign-in", request.url);
        signInUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(signInUrl);
    }

    if (!hasAllowedRole(session.user.role)) {
        const signOutUrl = new URL("/api/auth/sign-out", request.url);
        signOutUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(signOutUrl);
    }

    const passwordVerified = Boolean((session.user as { passwordVerified?: boolean }).passwordVerified);

    if (pathname === changePasswordPath) {
        if (passwordVerified) {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.next();
    }

    if (!passwordVerified) {
        return NextResponse.redirect(new URL(changePasswordPath, request.url));
    }

    return NextResponse.next();
}

async function getSession(request: NextRequest) {
    try {
        const session = await authEdge.api.getSession({
            headers: request.headers,
        });
        return session;
    } catch (error) {
        return null;
    }
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};