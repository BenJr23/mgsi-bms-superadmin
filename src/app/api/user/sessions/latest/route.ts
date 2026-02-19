import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const latestSession = await prisma.session.findFirst({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            select: {
                createdAt: true,
                ipAddress: true,
                userAgent: true
            }
        });

        if (!latestSession) {
            return NextResponse.json({ lastLogin: null });
        }

        return NextResponse.json({ lastLogin: latestSession.createdAt });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
