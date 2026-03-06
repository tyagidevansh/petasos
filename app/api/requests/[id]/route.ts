
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const r = await prisma.request.findUnique({
            where: { id },
            include: {
                headers: true,
                queryParams: true,
                responseSchema: true,
                examples: true
            }
        });

        if (!r) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        // Map to match frontend RequestItem structure
        const requestItem = {
            id: r.id,
            name: r.name,
            method: r.method,
            url: r.url || "",
            body: r.body || "",
            responseModel: (r as any).responseModel || "",
            headers: r.headers.map(h => ({
                id: h.id,
                key: h.key,
                value: h.value,
                enabled: h.enabled,
                description: h.description
            })),
            queryParams: r.queryParams.map(p => ({
                id: p.id,
                key: p.key,
                value: p.value,
                enabled: p.enabled,
                description: p.description
            })),
            responseSchema: r.responseSchema,
            examples: r.examples.map(e => {
                let responseBody = e.responseBody || {};
                // Try to parse if it's a string
                if (typeof responseBody === 'string') {
                    try {
                        responseBody = JSON.parse(responseBody);
                    } catch {
                        // Keep as string if not valid JSON
                    }
                }
                return {
                    id: e.id,
                    name: e.name,
                    status: e.status,
                    responseBody,
                    requestParams: {}
                };
            })
        };

        return NextResponse.json(requestItem, {
            headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=3600' }
        });

    } catch (error: any) {
        console.error("Failed to fetch request:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
