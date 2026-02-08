export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

export interface Param {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export interface Header {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export interface ResponseField {
    id: string;
    name: string;
    type: string;
    required: boolean;
    description?: string;
    children?: ResponseField[]; // for nested objects
}

export interface SavedExample {
    id: string;
    name: string;
    status: number;
    responseBody: any;
    requestParams: Record<string, string>;
}

export interface RequestItem {
    id: string;
    name: string;
    method: HttpMethod;
    url: string;
    headers?: Header[];
    queryParams?: Param[];
    body?: string;
    responseSchema?: ResponseField[];
    responseModel?: string; // TS interface
    examples?: SavedExample[];
}

export interface Folder {
    id: string;
    name: string;
    requests: RequestItem[];
    subfolders: Folder[]; // Support infinite nesting
}

export interface EnvVariable {
    id: string;
    key: string;
    value: string;
    description?: string;
}

export interface Environment {
    id: string;
    name: string;
    variables: EnvVariable[];
}

export interface DB {
    folders: Folder[];
    environments?: Environment[];
    activeEnvironmentId?: string;
}
