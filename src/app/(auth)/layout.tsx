import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server";
import { hasAllowedRole } from "@/lib/auth-utils";
import { AuthShell } from "./components/AuthShell";

type AuthLayoutProps = {
    children: ReactNode;
};

export default async function AuthLayout({ children }: AuthLayoutProps) {
    const session = await getServerSession();

    if (!session?.user) {
        redirect("/sign-in");
    }

    if (!hasAllowedRole(session.user.role)) {
        redirect("/sign-in?error=unauthorized");
    }

    return <AuthShell>{children}</AuthShell>;
}