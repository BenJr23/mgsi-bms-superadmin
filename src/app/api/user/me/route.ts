import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const { session, errorResponse } = await requireApiSession({ requirePasswordVerified: false });
        if (!session) {
            return errorResponse;
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                passwordVerified: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
