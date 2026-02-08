import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { url, method, headers, body } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Prepare headers
        const fetchHeaders = new Headers();
        if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
                if (value) fetchHeaders.append(key, value as string);
            });
        }

        const options: RequestInit = {
            method: method || "GET",
            headers: fetchHeaders,
        };

        if (body && method !== 'GET' && method !== 'HEAD') {
            options.body = body;
        }

        const response = await fetch(url, options);

        // Get response body
        const responseText = await response.text();
        let responseBody;
        try {
            responseBody = JSON.parse(responseText);
        } catch {
            // If not JSON, return text
            responseBody = responseText;
        }

        // Get response headers
        const resHeaders: Record<string, string> = {};
        response.headers.forEach((val, key) => {
            resHeaders[key] = val;
        });

        return NextResponse.json({
            status: response.status,
            statusText: response.statusText,
            headers: resHeaders,
            body: responseBody
        });

    } catch (error: any) {
        console.error("Proxy error:", error);
        return NextResponse.json({
            error: error.message || "Failed to fetch"
        }, { status: 500 });
    }
}
