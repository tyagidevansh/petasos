import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // 1. Fetch all folders with relations
        const allFolders = await prisma.folder.findMany({
            orderBy: { createdAt: 'asc' }
        });

        // 2. Fetch all requests (without heavy relations)
        const allRequests = await prisma.request.findMany({
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
                    // Omit heavy fields: body, headers, queryParams, responseSchema, examples
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

        return NextResponse.json({ folders: rootFolders }, {
            headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=300' }
        });
    } catch (error: any) {
        console.error("Failed to fetch data:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
