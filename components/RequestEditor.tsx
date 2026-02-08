"use client";

import * as React from "react";
import { RequestItem, Header, Param, ResponseField, SavedExample } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Play, Save, Loader2, Copy, CheckCircle2, XCircle, Sparkles, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareDialog } from "@/components/ShareDialog";
import { toCurl } from "@/lib/curl";

interface RequestEditorProps {
  request: RequestItem;
  onChange: (updatedRequest: RequestItem) => void;
  onRun: () => void;
  onSave: () => void;
  onSaveExample?: (request: RequestItem) => void; // Auto-save when example is added
  isDirty?: boolean;
}

const METHOD_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  POST: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  PUT: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  PATCH: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  DELETE: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
};

export function RequestEditor({ request, onChange, onRun, onSave, onSaveExample, isDirty }: RequestEditorProps) {
  const [response, setResponse] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("params");
  const [copied, setCopied] = React.useState(false);
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [curlCopied, setCurlCopied] = React.useState(false);

  const methodStyle = METHOD_STYLES[request.method] || METHOD_STYLES.GET;

  const updateField = (field: keyof RequestItem, value: any) => {
    onChange({ ...request, [field]: value });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = async () => {
      setLoading(true);
      setResponse(null);
      try {
          const headersObj = request.headers.reduce((acc, h) => {
              if (h.enabled && h.key) acc[h.key] = h.value;
              return acc;
          }, {} as Record<string, string>);

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
        setActiveTab("response_view");
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
      const updatedRequest = { ...request, examples: [...(request.examples || []), newExample] };
      onChange(updatedRequest);
      // Auto-save the example immediately
      if (onSaveExample) {
        onSaveExample(updatedRequest);
      }
  };

  const addManualExample = () => {
      const newExample: SavedExample = {
          id: crypto.randomUUID(),
          name: `New Example`,
          status: 200,
          responseBody: {},
          requestParams: {}
      };
      const updatedRequest = { ...request, examples: [...(request.examples || []), newExample] };
      onChange(updatedRequest);
      // Auto-save the example immediately
      if (onSaveExample) {
        onSaveExample(updatedRequest);
      }
  };

  const updateExample = (id: string, field: keyof SavedExample, value: any) => {
      const newExamples = (request.examples || []).map(ex => 
          ex.id === id ? { ...ex, [field]: value } : ex
      );
      updateField('examples', newExamples);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Bar: Method, URL, Send, Save */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <Select value={request.method} onValueChange={(v) => updateField('method', v)}>
          <SelectTrigger className={cn(
            "w-[110px] font-bold border",
            methodStyle.bg,
            methodStyle.text,
            methodStyle.border
          )}>
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET" className="text-emerald-400">GET</SelectItem>
            <SelectItem value="POST" className="text-blue-400">POST</SelectItem>
            <SelectItem value="PUT" className="text-amber-400">PUT</SelectItem>
            <SelectItem value="DELETE" className="text-red-400">DELETE</SelectItem>
            <SelectItem value="PATCH" className="text-purple-400">PATCH</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 relative">
          <Input 
              value={request.url} 
              onChange={(e) => updateField('url', e.target.value)} 
              placeholder="https://api.example.com/v1/resource" 
              className="font-mono text-sm bg-input/50 border-border/50 focus:border-primary/50 pl-3 pr-3"
          />
        </div>
        <Button 
          onClick={handleRun} 
          disabled={loading} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow transition-all"
        >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Send
        </Button>
        <Button 
          onClick={onSave} 
          variant={isDirty ? "default" : "outline"} 
          className={cn(
            "border-border/50 hover:bg-accent transition-all",
            isDirty && "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
          )}
        >
            <Save className="mr-2 h-4 w-4" />
            Save
            {isDirty && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
        </Button>
        <Button 
          onClick={() => setShareDialogOpen(true)} 
          variant="outline" 
          className="border-border/50 hover:bg-accent"
        >
            <Share2 className="mr-2 h-4 w-4" />
            Share
        </Button>
      </div>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        request={request}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border/50 px-4 bg-card/20">
                <TabsList className="bg-transparent h-11 gap-1">
                    <TabsTrigger 
                      value="params" 
                      className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 text-sm"
                    >
                      Params
                    </TabsTrigger>
                    <TabsTrigger 
                      value="headers" 
                      className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 text-sm"
                    >
                      Headers
                    </TabsTrigger>
                    <TabsTrigger 
                      value="body" 
                      className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 text-sm"
                    >
                      Body
                    </TabsTrigger>
                    <TabsTrigger 
                      value="response_struct" 
                      className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 text-sm"
                    >
                      Response Schema
                    </TabsTrigger>
                    <TabsTrigger 
                      value="response_view" 
                      className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 text-sm flex items-center gap-2"
                    >
                        Response 
                        {response && (
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            response.status >= 200 && response.status < 300 ? "bg-emerald-500" : "bg-red-500"
                          )} />
                        )}
                    </TabsTrigger>
                    <TabsTrigger 
                      value="examples" 
                      className="data-[state=active]:bg-accent data-[state=active]:text-foreground rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-4 text-sm"
                    >
                      Examples 
                      <span className="ml-1.5 text-xs text-muted-foreground">({request.examples?.length || 0})</span>
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <div className="p-5">
                <TabsContent value="params" className="mt-0 animate-fade-in">
                    <ParamsEditor 
                        params={request.queryParams} 
                        onChange={(p) => updateField('queryParams', p)} 
                    />
                </TabsContent>
                <TabsContent value="headers" className="mt-0 animate-fade-in">
                    <ParamsEditor 
                        params={request.headers} 
                        onChange={(h) => updateField('headers', h)} 
                        type="header"
                    />
                </TabsContent>
                <TabsContent value="body" className="mt-0 animate-fade-in">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Request Body</p>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">JSON</span>
                        </div>
                        <Textarea 
                            value={request.body || ''} 
                            onChange={(e) => updateField('body', e.target.value)} 
                            className="font-mono text-sm min-h-[400px] bg-input/30 border-border/50 focus:border-primary/50"
                            placeholder='{ "key": "value" }'
                        />
                    </div>
                </TabsContent>
                <TabsContent value="response_struct" className="mt-0 animate-fade-in">
                    <div className="space-y-3 h-full flex flex-col">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">Response Interface</p>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">TypeScript</span>
                        </div>
                        <Textarea 
                            value={request.responseModel || ''} 
                            onChange={(e) => updateField('responseModel', e.target.value)} 
                            className="font-mono text-sm flex-1 min-h-[400px] bg-input/30 border-border/50 focus:border-primary/50"
                            placeholder={`interface Response {\n  id: string;\n  name: string;\n  createdAt: Date;\n}`}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="response_view" className="mt-0 animate-fade-in">
                    {response ? (
                        <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                                      response.status >= 200 && response.status < 300 
                                        ? "bg-emerald-500/10 text-emerald-400" 
                                        : "bg-red-500/10 text-red-400"
                                    )}>
                                      {response.status >= 200 && response.status < 300 ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                      ) : (
                                        <XCircle className="h-4 w-4" />
                                      )}
                                      <span className="font-bold">{response.status}</span>
                                      <span className="text-sm opacity-80">{response.statusText}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date().toLocaleTimeString()}
                                    </span>
                                </div>
                                <Button onClick={saveExample} size="sm" variant="outline" className="border-border/50">
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Save as Example
                                </Button>
                            </div>
                            
                            {/* Response Body */}
                            <div className="border border-border/50 rounded-xl overflow-hidden bg-card/30">
                                <div className="bg-muted/50 px-4 py-2.5 text-xs font-medium border-b border-border/50 flex justify-between items-center">
                                    <span>Response Body</span>
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7" 
                                        onClick={() => copyToClipboard(typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body)}
                                        title="Copy to clipboard"
                                    >
                                        {copied ? (
                                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <pre className="p-4 text-xs font-mono overflow-auto max-h-[500px] text-foreground/90">
                                    {typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body}
                                </pre>
                            </div>
                            
                            {/* Response Headers */}
                            <div className="border border-border/50 rounded-xl overflow-hidden bg-card/30">
                                <div className="bg-muted/50 px-4 py-2.5 text-xs font-medium border-b border-border/50">
                                  Response Headers
                                </div>
                                <pre className="p-4 text-xs font-mono overflow-auto max-h-[200px] text-muted-foreground">
                                    {JSON.stringify(response.headers, null, 2)}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted/30 mb-4">
                            <Play className="h-7 w-7 text-muted-foreground" />
                          </div>
                          <p className="text-muted-foreground">Hit <span className="text-primary font-medium">"Send"</span> to execute the request</p>
                          <p className="text-xs text-muted-foreground/60 mt-2">Response will appear here</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="examples" className="mt-0 animate-fade-in">
                    <div className="space-y-4">
                        <Button onClick={addManualExample} variant="outline" size="sm" className="border-border/50">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Manual Example
                        </Button>
                        <div className="grid grid-cols-1 gap-4">
                            {request.examples?.map((ex, idx) => (
                                <div key={ex.id} className="border border-border/50 rounded-xl p-4 space-y-4 bg-card/30">
                                    <div className="flex justify-between items-center gap-3">
                                        <Input 
                                            value={ex.name} 
                                            onChange={(e) => updateExample(ex.id, 'name', e.target.value)}
                                            className="h-9 font-medium w-[220px] bg-input/50"
                                            placeholder="Example Name"
                                        />
                                        <Input 
                                            type="number"
                                            value={ex.status} 
                                            onChange={(e) => updateExample(ex.id, 'status', parseInt(e.target.value))}
                                            className={cn(
                                              "h-9 w-[90px] font-mono text-center",
                                              ex.status >= 200 && ex.status < 300 ? "text-emerald-400" : "text-red-400"
                                            )}
                                            placeholder="200"
                                        />
                                        <div className="flex-1"></div>
                                        <Button 
                                          size="icon" 
                                          variant="ghost" 
                                          className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10" 
                                          onClick={() => updateField('examples', request.examples.filter(e => e.id !== ex.id))}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground">Response Body (JSON)</label>
                                        <Textarea 
                                            value={typeof ex.responseBody === 'object' ? JSON.stringify(ex.responseBody, null, 2) : ex.responseBody || ''}
                                            onChange={(e) => {
                                                let val: any = e.target.value;
                                                try { val = JSON.parse(val); } catch {}
                                                updateExample(ex.id, 'responseBody', val);
                                            }}
                                            className="font-mono text-xs min-h-[150px] bg-input/30"
                                        />
                                    </div>
                                </div>
                            ))}
                            {(!request.examples || request.examples.length === 0) && (
                                <div className="text-center py-16 border border-dashed border-border/50 rounded-xl">
                                  <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                                  <p className="text-muted-foreground">No examples saved yet</p>
                                  <p className="text-xs text-muted-foreground/60 mt-1">Save responses to document your API</p>
                                </div>
                            )}
                        </div>
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
            <div className="grid grid-cols-[32px_1fr_1fr_1fr_40px] gap-3 font-medium text-xs text-muted-foreground mb-3 px-1">
                <div></div>
                <div>Key</div>
                <div>Value</div>
                <div>Description</div>
                <div></div>
            </div>
            {params.map(p => (
                <div key={p.id} className="grid grid-cols-[32px_1fr_1fr_1fr_40px] gap-3 items-center group">
                    <div className="flex justify-center">
                      <Checkbox 
                        checked={p.enabled} 
                        onCheckedChange={(c: boolean | 'indeterminate') => handleUpdate(p.id, 'enabled', c === true)} 
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                    </div>
                    <Input 
                      value={p.key} 
                      onChange={(e) => handleUpdate(p.id, 'key', e.target.value)} 
                      placeholder="Key" 
                      className={cn("h-9 text-sm font-mono bg-input/50", !p.enabled && "opacity-50")} 
                    />
                    <Input 
                      value={p.value} 
                      onChange={(e) => handleUpdate(p.id, 'value', e.target.value)} 
                      placeholder="Value" 
                      className={cn("h-9 text-sm bg-input/50", !p.enabled && "opacity-50")} 
                    />
                    <Input 
                      value={p.description || ''} 
                      onChange={(e) => handleUpdate(p.id, 'description', e.target.value)} 
                      placeholder="Description" 
                      className={cn("h-9 text-sm bg-input/50", !p.enabled && "opacity-50")} 
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => handleDelete(p.id)} 
                      className="h-9 w-9 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-opacity"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAdd} className="mt-3 border-dashed border-border/50 text-muted-foreground hover:text-foreground">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add {type === 'header' ? 'Header' : 'Param'}
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
                <Plus className="mr-2 h-3 w-3" />
                Add Field
            </Button>
            
            <p className="text-xs text-muted-foreground mt-4">
                * Nested object support not implemented in MVP editor UI, but structure supports it.
            </p>
        </div>
    );
}
