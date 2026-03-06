import { NextRequest, NextResponse } from "next/server";
import { stripJsonComments } from "@/lib/curl";

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
            const strippedBody = stripJsonComments(body);
            options.body = strippedBody;
            // Ensure Content-Type is application/json when sending a body;
            // the user may not have it in their Headers tab explicitly
            if (!fetchHeaders.has('content-type')) {
                fetchHeaders.set('content-type', 'application/json');
            }
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
