import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // 1. Fetch all folders with relations
        const allFolders = await prisma.folder.findMany({
            orderBy: { createdAt: 'asc' }
        });

        // 2. Fetch all requests with relations
        const allRequests = await prisma.request.findMany({
            include: {
                headers: true,
                queryParams: true,
                responseSchema: true,
                examples: true
            },
            orderBy: { createdAt: 'asc' }
        });

        // 3. Assemble tree in memory
        const folderMap = new Map<string, any>();
        const rootFolders: any[] = [];

        // Initialize map with folders
        allFolders.forEach(f => {
            folderMap.set(f.id, {
                ...f,
                requests: [],
                subfolders: []
            });
        });

        // Populate requests into folders
        allRequests.forEach(r => {
            const folder = folderMap.get(r.folderId);
            if (folder) {
                folder.requests.push({
                    id: r.id,
                    name: r.name,
                    method: r.method,
                    url: r.url || "",
                    body: r.body || "",
                    headers: r.headers,
                    queryParams: r.queryParams,
                    responseSchema: r.responseSchema,
                    examples: r.examples.map(e => ({
                        ...e,
                        responseBody: e.responseBody ? JSON.parse(e.responseBody) : null
                    }))
                });
            }
        });

        // Build hierarchy
        allFolders.forEach(f => {
            const folder = folderMap.get(f.id);
            if (f.parentId) {
                const parent = folderMap.get(f.parentId);
                if (parent) {
                    parent.subfolders.push(folder);
                } else {
                    rootFolders.push(folder);
                }
            } else {
                rootFolders.push(folder);
            }
        });

        return NextResponse.json({ folders: rootFolders });
    } catch (error: any) {
        console.error("Failed to fetch data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
