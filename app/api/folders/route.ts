import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { id, name, parentId } = await req.json();

        const folder = await prisma.folder.create({
            data: {
                id: id, // Optional: let Prisma generate UUID if not provided? Frontend typically sends one.
                name,
                parentId: parentId || null
            }
        });

        return NextResponse.json(folder);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        await prisma.folder.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { id, name } = await req.json();

        const updated = await prisma.folder.update({
            where: { id },
            data: { name }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
    }
}
