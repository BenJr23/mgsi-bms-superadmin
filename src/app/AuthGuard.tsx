"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";

type AuthGuardProps = {
    children: ReactNode;
};

const PUBLIC_PATHS = ["/", "/sign-in"];
const ALLOWED_ROLES = ["ADMIN", "SUPERADMIN"] as const;

const isPublicPath = (pathname: string) =>
    PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`));

const hasAllowedRole = (role?: string | null) =>
    !!role && ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number]);

export default function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();

    const isPublic = isPublicPath(pathname);

    useEffect(() => {
        if (isPublic && session?.user) {
            if (hasAllowedRole(session.user.role)) {
                router.replace("/dashboard");
                return;
            }

            window.location.href = `/api/auth/sign-out?next=${encodeURIComponent(pathname)}`;
            return;
        }

        if (isPublic) {
            return;
        }

        if (session === undefined) {
            return;
        }

        if (!session?.user) {
            router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
            return;
        }

        if (!hasAllowedRole(session.user.role)) {
            router.replace("/sign-in?error=unauthorized");
        }
    }, [isPublic, pathname, router, session]);

    if (!isPublic && session === undefined) {
        return null;
    }

    return <>{children}</>;
}