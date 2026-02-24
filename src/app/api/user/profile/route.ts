import { NextResponse, NextRequest } from "next/server";
import { requireApiSession } from "@/lib/api-auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
	try {
		const { session, errorResponse } = await requireApiSession();

		if (!session?.user?.id) {
			return errorResponse ?? NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		const body = await req.json();
		const { name, phoneNumber } = body;

		// Validate input
		if (!name || name.trim().length === 0) {
			return NextResponse.json({ error: "Name is required" }, { status: 400 });
		}

		if (!phoneNumber || phoneNumber.trim().length === 0) {
			return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
		}

		// Update user in database
		const updatedUser = await prisma.user.update({
			where: { id: session.user.id },
			data: {
				name: name.trim(),
				phoneNumber: phoneNumber.trim(),
			},
			select: {
				id: true,
				name: true,
				phoneNumber: true,
				email: true,
			},
		});

		return NextResponse.json({ success: true, user: updatedUser });
	} catch (err) {
		console.error("Profile update error:", err);
		return NextResponse.json({ error: "Server error" }, { status: 500 });
	}
}
