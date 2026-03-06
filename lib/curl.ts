import { RequestItem, Header, Param, Folder } from "@/types";

/**
 * Strip line comments (//) and block comments from a JSON string,
 * and remove trailing commas. Correctly ignores // inside quoted strings.
 */
export function stripJsonComments(jsonStr: string): string {
  let result = '';
  let inString = false;
  let i = 0;
  while (i < jsonStr.length) {
    const ch = jsonStr[i];
    const next = jsonStr[i + 1];

    if (inString) {
      if (ch === '\\') {
        // Escaped character — include both chars verbatim
        result += ch + (jsonStr[i + 1] || '');
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      result += ch;
      i++;
      continue;
    }

    // Not in a string
    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // Line comment
    if (ch === '/' && next === '/') {
      while (i < jsonStr.length && jsonStr[i] !== '\n') i++;
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < jsonStr.length && !(jsonStr[i] === '*' && jsonStr[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  // Remove trailing commas before } or ]
  return result.replace(/,\s*([}\]])/g, '$1').trim();
}

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
        const rawBody = interpolateEnvVars(request.body, envVars);
        const body = stripJsonComments(rawBody);
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

        // If it's a Petasos export, import as before
        if (data.type === "petasos-collection" && Array.isArray(data.folders)) {
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
        }

        // If it's a Postman collection, convert it
        if (data.info && data.item && Array.isArray(data.item)) {
            // Recursively convert Postman items to Folder[]
            const convertItemsToFolders = (items: any[]): Folder[] => {
                return items.map(item => {
                    if (item.item && Array.isArray(item.item)) {
                        // This is a folder
                        return {
                            id: crypto.randomUUID(),
                            name: item.name || "Imported Folder",
                            requests: convertItemsToRequests(item.item),
                            subfolders: convertItemsToFolders(item.item.filter((i: any) => i.item && Array.isArray(i.item))),
                        };
                    } else {
                        // This is a request, wrap in a folder
                        return {
                            id: crypto.randomUUID(),
                            name: item.name || "Imported Request",
                            requests: [convertPostmanRequest(item)],
                            subfolders: [],
                        };
                    }
                });
            };

            // Convert Postman items to RequestItem[]
            const convertItemsToRequests = (items: any[]): RequestItem[] => {
                return items
                    .filter(i => i.request)
                    .map(convertPostmanRequest);
            };

            // Convert a single Postman item to RequestItem
            function convertPostmanRequest(item: any): RequestItem {
                const req = item.request;
                // Headers
                const headers: Header[] = (req.header || []).map((h: any) => ({
                    id: crypto.randomUUID(),
                    key: h.key ?? "",
                    value: h.value ?? "",
                    enabled: h.disabled !== true,
                    description: h.description || undefined,
                }));
                // Query params
                let queryParams: Param[] = [];
                if (req.url && req.url.query) {
                    queryParams = req.url.query.map((q: any) => ({
                        id: crypto.randomUUID(),
                        key: q.key ?? "",
                        value: q.value ?? "",
                        enabled: q.disabled !== true,
                        description: q.description || undefined,
                    }));
                }
                // URL
                let url = "";
                if (typeof req.url === "string") {
                    url = req.url;
                } else if (req.url && req.url.raw) {
                    url = req.url.raw;
                }
                // Body
                let body = undefined;
                if (req.body && req.body.mode === "raw" && typeof req.body.raw === "string") {
                    body = req.body.raw;
                }
                // Method
                const method = req.method || "GET";
                return {
                    id: crypto.randomUUID(),
                    name: item.name || "Imported Request",
                    method,
                    url,
                    headers,
                    queryParams,
                    body,
                    responseSchema: undefined,
                    responseModel: undefined,
                    examples: [],
                };
            }

            // Only top-level folders (items with sub-items) are treated as folders
            const folders = convertItemsToFolders(data.item.filter((i: any) => i.item && Array.isArray(i.item)));
            // Top-level requests (items without sub-items) are wrapped in a folder
            const topLevelRequests = data.item.filter((i: any) => i.request);
            if (topLevelRequests.length > 0) {
                folders.push({
                    id: crypto.randomUUID(),
                    name: "Imported Requests",
                    requests: topLevelRequests.map(convertPostmanRequest),
                    subfolders: [],
                });
            }
            return folders;
        }

        throw new Error("Unrecognized collection format. Only Petasos or Postman v2.1 collections are supported.");
    } catch (e) {
        console.error("Import failed:", e);
        throw new Error("Failed to parse collection JSON. Only Petasos or Postman v2.1 collections are supported.");
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
