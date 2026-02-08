"use client";

import * as React from "react";
import { RequestItem, Header, Param, ResponseField, SavedExample } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Play, Save, Loader2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestEditorProps {
  request: RequestItem;
  onChange: (updatedRequest: RequestItem) => void;
  onRun: () => void;
  onSave: () => void;
}

export function RequestEditor({ request, onChange, onRun, onSave }: RequestEditorProps) {
  const [response, setResponse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("params");

  const updateField = (field: keyof RequestItem, value: any) => {
    onChange({ ...request, [field]: value });
  };

  const handleRun = async () => {
      setLoading(true);
      setResponse(null);
      try {
          const headersObj = request.headers.reduce((acc, h) => {
              if (h.enabled && h.key) acc[h.key] = h.value;
              return acc;
          }, {} as Record<string, string>);

          // Query params logic if needed (proxy handles url, but usually client builds query string)
          // For MVP assuming user puts query params in URL or we append them here.
          // Let's append them.
          let url = request.url;
          const queryParts = request.queryParams
              .filter(p => p.enabled && p.key)
              .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
              .join('&');
          
          if (queryParts) {
              url += (url.includes('?') ? '&' : '?') + queryParts;
          }

          const res = await fetch('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: url,
                method: request.method,
                headers: headersObj,
                body: request.body
            })
        });
        const data = await res.json();
        setResponse(data);
        setActiveTab("response_view"); // Switch to response tab
      } catch (e) {
          console.error(e);
          setResponse({ error: "Failed to execute request" });
          setActiveTab("response_view");
      } finally {
          setLoading(false);
      }
  };

  const saveExample = () => {
      if (!response) return;
      const newExample: SavedExample = {
          id: crypto.randomUUID(),
          name: `Example ${request.examples?.length ? request.examples.length + 1 : 1} - ${response.status || 'Error'}`,
          status: response.status || 0,
          responseBody: response.body || response,
          requestParams: {} 
      };
      updateField('examples', [...(request.examples || []), newExample]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar: Method, URL, Send, Save */}
      <div className="flex items-center gap-2 p-4 border-b bg-background sticky top-0 z-10">
        <Select value={request.method} onValueChange={(v) => updateField('method', v)}>
          <SelectTrigger className="w-[100px] font-bold">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
          </SelectContent>
        </Select>
        <Input 
            value={request.url} 
            onChange={(e) => updateField('url', e.target.value)} 
            placeholder="https://api.example.com/v1/resource" 
            className="flex-1 font-mono"
        />
        <Button onClick={handleRun} disabled={loading} variant="secondary">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run
        </Button>
        <Button onClick={onSave}>
            <Save className="mr-2 h-4 w-4" /> Save
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b px-4">
                <TabsList className="bg-transparent h-12">
                    <TabsTrigger value="params" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent">Params</TabsTrigger>
                    <TabsTrigger value="headers" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent">Headers</TabsTrigger>
                    <TabsTrigger value="body" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent">Body</TabsTrigger>
                    <TabsTrigger value="response_struct" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent">Response Structure</TabsTrigger>
                    <TabsTrigger value="response_view" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent">
                        Response {response ? <span className="ml-2 w-2 h-2 rounded-full bg-green-500 block" /> : null}
                    </TabsTrigger>
                    <TabsTrigger value="examples" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full bg-transparent">Examples ({request.examples?.length || 0})</TabsTrigger>
                </TabsList>
            </div>
            
            <div className="p-4">
                <TabsContent value="params">
                    <ParamsEditor 
                        params={request.queryParams} 
                        onChange={(p) => updateField('queryParams', p)} 
                    />
                </TabsContent>
                <TabsContent value="headers">
                    <ParamsEditor 
                        params={request.headers} 
                        onChange={(h) => updateField('headers', h)} 
                        type="header"
                    />
                </TabsContent>
                <TabsContent value="body">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Request Body (JSON)</p>
                        <Textarea 
                            value={request.body || ''} 
                            onChange={(e) => updateField('body', e.target.value)} 
                            className="font-mono min-h-[300px]"
                            placeholder='{ "key": "value" }'
                        />
                    </div>
                </TabsContent>
                <TabsContent value="response_struct">
                    <ResponseShapeEditor 
                        schema={request.responseSchema || []} 
                        onChange={(s) => updateField('responseSchema', s)} 
                    />
                </TabsContent>
                <TabsContent value="response_view">
                    {response ? (
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={cn("font-bold", response.status >= 200 && response.status < 300 ? "text-green-600" : "text-red-600")}>
                                        {response.status} {response.statusText}
                                    </span>
                                    <span className="text-sm text-muted-foreground">Time: {new Date().toLocaleTimeString()}</span>
                                </div>
                                <Button onClick={saveExample} size="sm" variant="outline">
                                    <Plus className="mr-2 h-4 w-4" /> Save as Example
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="border rounded-md">
                                    <div className="bg-muted px-4 py-2 text-xs font-semibold border-b flex justify-between items-center">
                                        <span>Body</span>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6" 
                                            onClick={() => navigator.clipboard.writeText(typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body)}
                                            title="Copy to clipboard"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <pre className="p-4 text-xs font-mono overflow-auto max-h-[500px]">
                                        {typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body}
                                    </pre>
                                </div>
                                <div className="border rounded-md">
                                    <div className="bg-muted px-4 py-2 text-xs font-semibold border-b">Headers</div>
                                    <pre className="p-4 text-xs font-mono overflow-auto max-h-[200px]">
                                        {JSON.stringify(response.headers, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-muted-foreground">
                            Hit "Run" to executes the request and see the response here.
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="examples">
                    <div className="grid grid-cols-1 gap-4">
                        {request.examples?.map((ex) => (
                            <div key={ex.id} className="border rounded p-3">
                                <div className="font-bold flex justify-between items-center mb-2">
                                    <span>{ex.name}</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => updateField('examples', request.examples.filter(e => e.id !== ex.id))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="bg-muted p-2 rounded max-h-[300px] overflow-auto">
                                    <pre className="text-xs font-mono">
                                        {JSON.stringify(ex.responseBody, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        ))}
                        {(!request.examples || request.examples.length === 0) && (
                            <div className="text-center text-muted-foreground py-10">
                                No examples saved. Run a request and click "Save as Example".
                            </div>
                        )}
                    </div>
                </TabsContent>
            </div>
        </Tabs>
      </div>
    </div>
  );
}

function ParamsEditor({ params, onChange, type = 'param' }: { params: Param[] | Header[], onChange: (p: any[]) => void, type?: 'param' | 'header' }) {
    const handleUpdate = (id: string, field: keyof Param, value: any) => {
        const newParams = params.map(p => p.id === id ? { ...p, [field]: value } : p);
        onChange(newParams);
    };

    const handleDelete = (id: string) => {
        onChange(params.filter(p => p.id !== id));
    };

    const handleAdd = () => {
        onChange([...params, { id: crypto.randomUUID(), key: '', value: '', enabled: true, description: '' }]);
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[30px_1fr_1fr_1fr_40px] gap-2 font-medium text-xs text-muted-foreground mb-2">
                <div></div>
                <div>Key</div>
                <div>Value</div>
                <div>Description</div>
                <div></div>
            </div>
            {params.map(p => (
                <div key={p.id} className="grid grid-cols-[30px_1fr_1fr_1fr_40px] gap-2 items-center">
                    <Checkbox checked={p.enabled} onCheckedChange={(c: boolean | 'indeterminate') => handleUpdate(p.id, 'enabled', c === true)} />
                    <Input value={p.key} onChange={(e) => handleUpdate(p.id, 'key', e.target.value)} placeholder="Key" className="h-8 text-sm" />
                    <Input value={p.value} onChange={(e) => handleUpdate(p.id, 'value', e.target.value)} placeholder="Value" className="h-8 text-sm" />
                    <Input value={p.description || ''} onChange={(e) => handleUpdate(p.id, 'description', e.target.value)} placeholder="Description" className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAdd} className="mt-2 text-xs">
                <Plus className="mr-2 h-3 w-3" /> Add {type === 'header' ? 'Header' : 'Param'}
            </Button>
        </div>
    );
}

function ResponseShapeEditor({ schema, onChange }: { schema: ResponseField[], onChange: (s: ResponseField[]) => void }) {
    const handleAdd = () => {
        onChange([...schema, { id: crypto.randomUUID(), name: '', type: 'string', required: true, description: '' }]);
    };
    
    const handleUpdate = (id: string, field: keyof ResponseField, value: any) => {
        onChange(schema.map(s => s.id === id ? { ...s, [field]: value } : s));
    };
    
    const handleDelete = (id: string) => {
        onChange(schema.filter(s => s.id !== id));
    };

    return (
        <div className="space-y-4">
             <div className="grid grid-cols-[1fr_100px_80px_1fr_40px] gap-2 font-medium text-xs text-muted-foreground">
                <div>Field Name</div>
                <div>Type</div>
                <div>Required</div>
                <div>Description</div>
                <div></div>
            </div>
            {schema.map(field => (
                <div key={field.id} className="grid grid-cols-[1fr_100px_80px_1fr_40px] gap-2 items-start">
                    <Input value={field.name} onChange={(e) => handleUpdate(field.id, 'name', e.target.value)} placeholder="field_name" className="h-8 text-sm font-mono" />
                    <Select value={field.type} onValueChange={(v) => handleUpdate(field.id, 'type', v)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="string">String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="object">Object</SelectItem>
                            <SelectItem value="array">Array</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex items-center justify-center h-8">
                         <Checkbox checked={field.required} onCheckedChange={(c: boolean | 'indeterminate') => handleUpdate(field.id, 'required', c === true)} />
                    </div>
                    <Input value={field.description || ''} onChange={(e) => handleUpdate(field.id, 'description', e.target.value)} placeholder="Description" className="h-8 text-sm" />
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(field.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAdd} className="mt-2 text-xs">
                <Plus className="mr-2 h-3 w-3" /> Add Field
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
                * Nested object support not implemented in MVP editor UI, but structure supports it.
            </p>
        </div>
    );
}
