import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "@/lib/get-server";
import { hasAllowedRole } from "@/lib/auth-utils";
import { auth } from "@/lib/auth";

type PublicLayoutProps = {
    children: ReactNode;
};

export default async function PublicLayout({ children }: PublicLayoutProps) {
    const session = await getServerSession();

    if (session?.user) {
        if (hasAllowedRole(session.user.role)) {
            redirect("/dashboard");
        }

        await auth.api.signOut({ headers: await headers() });
        redirect("/sign-in");
    }

    return <>{children}</>;
}
