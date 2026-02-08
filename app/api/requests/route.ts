import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const { id, name, folderId, method, url } = await req.json();

        const request = await prisma.request.create({
            data: {
                id,
                name,
                folderId,
                method,
                url: url || "",
                body: ""
            }
        });

        return NextResponse.json(request);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        await prisma.request.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to delete request" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const {
            id, name, method, url, body,
            headers, queryParams, responseSchema, examples
        } = await req.json();

        // Use Prisma's nested update/create/deleteMany capability
        const updated = await prisma.request.update({
            where: { id },
            data: {
                name,
                method,
                url,
                body,
                headers: {
                    deleteMany: {},
                    create: (headers || []).map((h: any) => ({
                        key: h.key,
                        value: h.value,
                        enabled: h.enabled,
                        description: h.description
                    }))
                },
                queryParams: {
                    deleteMany: {},
                    create: (queryParams || []).map((p: any) => ({
                        key: p.key,
                        value: p.value,
                        enabled: p.enabled,
                        description: p.description
                    }))
                },
                responseSchema: {
                    deleteMany: {},
                    create: (responseSchema || []).map((s: any) => ({
                        name: s.name,
                        type: s.type,
                        required: s.required,
                        description: s.description
                    }))
                },
                examples: {
                    deleteMany: {},
                    create: (examples || []).map((e: any) => ({
                        name: e.name,
                        status: e.status,
                        responseBody: typeof e.responseBody === 'string' ? e.responseBody : JSON.stringify(e.responseBody)
                    }))
                }
            }
        });

        return NextResponse.json(updated);
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
    }
}
