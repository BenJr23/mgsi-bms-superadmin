import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server";
import prisma from "@/lib/prisma";

export async function POST() {
    try {
        const session = await getServerSession();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: { passwordVerified: true },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
