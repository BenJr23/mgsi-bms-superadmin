import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/get-server";
import { hasAllowedRole } from "@/lib/auth-utils";

type PublicLayoutProps = {
    children: ReactNode;
};

export default async function PublicLayout({ children }: PublicLayoutProps) {
    const session = await getServerSession();

    if (session?.user) {
        if (hasAllowedRole(session.user.role)) {
            redirect("/dashboard");
        }

        redirect("/api/auth/sign-out?next=/sign-in");
    }

    return <>{children}</>;
}
