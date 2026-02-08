"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toCurl, toCodeSnippet } from "@/lib/curl";
import { RequestItem } from "@/types";
import { Copy, Check, Terminal, Code2, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: RequestItem;
  envVars?: Record<string, string>;
}

type SnippetType = 'curl' | 'typescript' | 'python';

const SNIPPET_OPTIONS: { value: SnippetType; label: string; icon: React.ReactNode }[] = [
  { value: 'curl', label: 'cURL', icon: <Terminal className="h-4 w-4" /> },
  { value: 'typescript', label: 'TypeScript', icon: <Code2 className="h-4 w-4" /> },
  { value: 'python', label: 'Python', icon: <Code2 className="h-4 w-4" /> },
];

export function ShareDialog({ open, onOpenChange, request, envVars }: ShareDialogProps) {
  const [snippetType, setSnippetType] = React.useState<SnippetType>('curl');
  const [copied, setCopied] = React.useState(false);

  const snippet = React.useMemo(() => {
    if (snippetType === 'curl') {
      return toCurl(request, envVars);
    }
    return toCodeSnippet(request, snippetType, envVars);
  }, [request, snippetType, envVars]);

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" />
            Share Request
          </DialogTitle>
          <DialogDescription>
            Copy this request as code to share with your team or use in your application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Language Selector */}
          <div className="flex gap-2">
            {SNIPPET_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={snippetType === option.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSnippetType(option.value)}
                className={cn(
                  "gap-2",
                  snippetType === option.value && "shadow-glow"
                )}
              >
                {option.icon}
                {option.label}
              </Button>
            ))}
          </div>

          {/* Code Preview */}
          <div className="relative">
            <Textarea
              value={snippet}
              readOnly
              className="font-mono text-xs min-h-[300px] bg-input/30 border-border/50 resize-none"
            />
            <Button
              size="sm"
              variant="secondary"
              className="absolute top-3 right-3 gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Environment variables are automatically interpolated in the generated code.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
