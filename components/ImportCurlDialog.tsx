"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { parseCurl } from "@/lib/curl";
import { Terminal, AlertCircle, CheckCircle2 } from "lucide-react";
import { RequestItem } from "@/types";

interface ImportCurlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  onImport: (request: Partial<RequestItem>, name: string) => void;
}

export function ImportCurlDialog({ open, onOpenChange, folderId, onImport }: ImportCurlDialogProps) {
  const [curlCommand, setCurlCommand] = React.useState("");
  const [requestName, setRequestName] = React.useState("Imported Request");
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<Partial<RequestItem> | null>(null);

  const handleParse = React.useCallback(() => {
    if (!curlCommand.trim()) {
      setError(null);
      setPreview(null);
      return;
    }

    try {
      const parsed = parseCurl(curlCommand);
      if (!parsed.url) {
        setError("Could not find URL in cURL command");
        setPreview(null);
        return;
      }
      setPreview(parsed);
      setError(null);
      
      // Auto-generate name from URL
      try {
        const url = new URL(parsed.url);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          setRequestName(`${parsed.method} ${pathParts[pathParts.length - 1]}`);
        }
      } catch {
        // Keep default name
      }
    } catch (e: any) {
      setError(e.message || "Failed to parse cURL command");
      setPreview(null);
    }
  }, [curlCommand]);

  // Parse on paste/change with debounce
  React.useEffect(() => {
    const timer = setTimeout(handleParse, 300);
    return () => clearTimeout(timer);
  }, [curlCommand, handleParse]);

  const handleImport = () => {
    if (!preview) return;
    onImport(preview, requestName);
    setCurlCommand("");
    setPreview(null);
    setRequestName("Imported Request");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Import from cURL
          </DialogTitle>
          <DialogDescription>
            Paste a cURL command to create a new request. Supports headers, body, and query parameters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">cURL Command</label>
            <Textarea
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              placeholder={`curl -X POST 'https://api.example.com/users' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer token' \\
  -d '{"name": "John"}'`}
              className="font-mono text-xs min-h-[150px] bg-input/50 border-border/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {preview && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Parsed successfully
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Request Name</label>
                <Input
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="bg-input/50"
                  placeholder="Request name"
                />
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{preview.method}</span>
                  <span className="font-mono text-xs text-muted-foreground truncate">{preview.url}</span>
                </div>
                
                {preview.headers && preview.headers.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {preview.headers.length} header{preview.headers.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {preview.queryParams && preview.queryParams.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {preview.queryParams.length} query param{preview.queryParams.length !== 1 ? 's' : ''}
                  </div>
                )}
                
                {preview.body && (
                  <div className="text-xs text-muted-foreground">
                    Has request body
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!preview}>
            Import Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
