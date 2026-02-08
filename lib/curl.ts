import { RequestItem, Header, Param, Folder } from "@/types";

/**
 * Convert a RequestItem to a cURL command string
 */
export function toCurl(request: RequestItem, envVars?: Record<string, string>): string {
    let url = interpolateEnvVars(request.url, envVars);

    // Add query params
    const enabledParams = request.queryParams.filter(p => p.enabled && p.key);
    if (enabledParams.length > 0) {
        const queryString = enabledParams
            .map(p => `${encodeURIComponent(interpolateEnvVars(p.key, envVars))}=${encodeURIComponent(interpolateEnvVars(p.value, envVars))}`)
            .join('&');
        url += (url.includes('?') ? '&' : '?') + queryString;
    }

    const parts: string[] = ['curl'];

    // Method (GET is default, so only add if different)
    if (request.method !== 'GET') {
        parts.push(`-X ${request.method}`);
    }

    // URL (quoted)
    parts.push(`'${url}'`);

    // Headers
    const enabledHeaders = request.headers.filter(h => h.enabled && h.key);
    for (const header of enabledHeaders) {
        const key = interpolateEnvVars(header.key, envVars);
        const value = interpolateEnvVars(header.value, envVars);
        parts.push(`-H '${key}: ${value}'`);
    }

    // Body (for POST, PUT, PATCH)
    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const body = interpolateEnvVars(request.body, envVars);
        // Escape single quotes in body
        const escapedBody = body.replace(/'/g, "'\\''");
        parts.push(`-d '${escapedBody}'`);

        // Add Content-Type if not already present
        const hasContentType = enabledHeaders.some(h => h.key.toLowerCase() === 'content-type');
        if (!hasContentType) {
            parts.push("-H 'Content-Type: application/json'");
        }
    }

    return parts.join(' \\\n  ');
}

/**
 * Parse a cURL command into a RequestItem
 */
export function parseCurl(curlCommand: string): Partial<RequestItem> {
    const result: Partial<RequestItem> = {
        method: 'GET',
        url: '',
        headers: [],
        queryParams: [],
        body: undefined,
    };

    // Normalize the command (remove line continuations)
    const normalized = curlCommand
        .replace(/\\\s*\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Remove 'curl' prefix
    let cmd = normalized.replace(/^curl\s+/i, '');

    // Parse method
    const methodMatch = cmd.match(/-X\s+([A-Z]+)/i);
    if (methodMatch) {
        result.method = methodMatch[1].toUpperCase() as any;
        cmd = cmd.replace(/-X\s+[A-Z]+/i, '');
    }

    // Parse headers
    const headers: Header[] = [];
    const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(cmd)) !== null) {
        const [key, ...valueParts] = headerMatch[1].split(':');
        const value = valueParts.join(':').trim();
        headers.push({
            id: crypto.randomUUID(),
            key: key.trim(),
            value,
            enabled: true,
        });
    }
    result.headers = headers;
    cmd = cmd.replace(/-H\s+['"][^'"]+['"]/gi, '');

    // Parse body (--data, -d, --data-raw)
    const bodyMatch = cmd.match(/(?:--data-raw|--data|-d)\s+['"](.+?)['"]/i) ||
        cmd.match(/(?:--data-raw|--data|-d)\s+(\S+)/i);
    if (bodyMatch) {
        result.body = bodyMatch[1];
        // If method is still GET but we have a body, probably POST
        if (result.method === 'GET') {
            result.method = 'POST';
        }
    }
    cmd = cmd.replace(/(?:--data-raw|--data|-d)\s+['"][^'"]*['"]/gi, '');
    cmd = cmd.replace(/(?:--data-raw|--data|-d)\s+\S+/gi, '');

    // Parse URL (what's left, possibly quoted)
    const urlMatch = cmd.match(/['"]?(https?:\/\/[^'">\s]+)['"]?/i);
    if (urlMatch) {
        let url = urlMatch[1];

        // Extract query params from URL
        const queryParams: Param[] = [];
        const urlObj = new URL(url);
        urlObj.searchParams.forEach((value, key) => {
            queryParams.push({
                id: crypto.randomUUID(),
                key,
                value,
                enabled: true,
            });
        });

        // Store URL without query string if we extracted params
        if (queryParams.length > 0) {
            result.url = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
            result.queryParams = queryParams;
        } else {
            result.url = url;
        }
    }

    return result;
}

/**
 * Replace {{VAR}} placeholders with environment variable values
 */
export function interpolateEnvVars(text: string, envVars?: Record<string, string>): string {
    if (!envVars || !text) return text;

    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return envVars[varName] ?? match;
    });
}

/**
 * Export folders as JSON (for sharing)
 */
export function exportCollection(folders: Folder[]): string {
    const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        type: "petasos-collection",
        folders,
    };
    return JSON.stringify(exportData, null, 2);
}

/**
 * Import collection from JSON
 */
export function importCollection(jsonString: string): Folder[] {
    try {
        const data = JSON.parse(jsonString);

        // Validate structure
        if (data.type !== "petasos-collection" || !Array.isArray(data.folders)) {
            throw new Error("Invalid collection format");
        }

        // Regenerate IDs to avoid conflicts
        const regenerateIds = (folders: Folder[]): Folder[] => {
            return folders.map(folder => ({
                ...folder,
                id: crypto.randomUUID(),
                requests: folder.requests.map(req => ({
                    ...req,
                    id: crypto.randomUUID(),
                    headers: req.headers?.map(h => ({ ...h, id: crypto.randomUUID() })) || [],
                    queryParams: req.queryParams?.map(p => ({ ...p, id: crypto.randomUUID() })) || [],
                    examples: req.examples?.map(e => ({ ...e, id: crypto.randomUUID() })) || [],
                })),
                subfolders: regenerateIds(folder.subfolders || []),
            }));
        };

        return regenerateIds(data.folders);
    } catch (e) {
        console.error("Import failed:", e);
        throw new Error("Failed to parse collection JSON. Make sure it's a valid Petasos export.");
    }
}

/**
 * Generate code snippets for different languages
 */
export function toCodeSnippet(request: RequestItem, language: 'typescript' | 'python', envVars?: Record<string, string>): string {
    const url = interpolateEnvVars(request.url, envVars);
    const headers = request.headers
        .filter(h => h.enabled && h.key)
        .reduce((acc, h) => ({ ...acc, [h.key]: interpolateEnvVars(h.value, envVars) }), {} as Record<string, string>);
    const body = request.body ? interpolateEnvVars(request.body, envVars) : undefined;

    switch (language) {
        case 'typescript':
            return generateTypeScript(request.method, url, headers, body);
        case 'python':
            return generatePython(request.method, url, headers, body);
        default:
            return '';
    }
}

function generateTypeScript(method: string, url: string, headers: Record<string, string>, body?: string): string {
    const headersStr = Object.keys(headers).length > 0
        ? `\n    headers: ${JSON.stringify(headers, null, 4).split('\n').join('\n    ')},`
        : '';
    const bodyStr = body ? `\n    body: JSON.stringify(${body}),` : '';

    return `interface ApiResponse {
  // Define your response type here
  [key: string]: unknown;
}

async function makeRequest(): Promise<ApiResponse> {
  const response = await fetch('${url}', {
    method: '${method}',${headersStr}${bodyStr}
  });
  
  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }
  
  return response.json();
}

// Usage
makeRequest()
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`
}

function generatePython(method: string, url: string, headers: Record<string, string>, body?: string): string {
    let code = `import requests\n\n`;
    code += `response = requests.${method.toLowerCase()}(\n`;
    code += `    '${url}'`;

    if (Object.keys(headers).length > 0) {
        code += `,\n    headers=${JSON.stringify(headers, null, 4).replace(/"/g, "'")}`;
    }
    if (body) {
        code += `,\n    json=${body}`;
    }
    code += `\n)\n\nprint(response.json())`;

    return code;
}
