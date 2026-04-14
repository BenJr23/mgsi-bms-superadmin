import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server";
import { hasAllowedRole } from "@/lib/auth-utils";
import { AuthShell } from "./components/AuthShell";
import { logUnauthorizedAccessAttempt } from "@/app/_actions/audit-log";

export const dynamic = "force-dynamic";

type AuthLayoutProps = {
    children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
    const session = await getServerSession();

    if (!session?.user) {
        redirect("/sign-in");
    }

    if (!hasAllowedRole(session.user.role)) {
        await logUnauthorizedAccessAttempt({
            actorId: session.user.id,
            role: session.user.role,
            route: "/(auth)",
            module: "Authentication",
            reason: "Authenticated user attempted to access a protected route without required role",
        });

        redirect("/sign-in?error=unauthorized");
    }

    return <AuthShell>{children}</AuthShell>;
}