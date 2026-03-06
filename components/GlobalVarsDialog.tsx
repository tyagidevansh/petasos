"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export interface GlobalVar {
  id: string;
  key: string;
  value: string;
}

interface GlobalVarsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vars: GlobalVar[];
  onUpdate: (vars: GlobalVar[]) => void;
}

export function GlobalVarsDialog({
  open,
  onOpenChange,
  vars,
  onUpdate,
}: GlobalVarsDialogProps) {
  const [localVars, setLocalVars] = React.useState<GlobalVar[]>(vars);

  React.useEffect(() => {
    if (open) setLocalVars(vars);
  }, [open]);

  const handleAdd = () => {
    setLocalVars((v) => [
      ...v,
      { id: crypto.randomUUID(), key: "", value: "" },
    ]);
  };

  const handleChange = (id: string, field: "key" | "value", value: string) => {
    setLocalVars((v) =>
      v.map((x) => (x.id === id ? { ...x, [field]: value } : x)),
    );
  };

  const handleDelete = (id: string) => {
    setLocalVars((v) => v.filter((x) => x.id !== id));
  };

  const handleSave = () => {
    onUpdate(localVars.filter((v) => v.key.trim()));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Global Variables</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1 mb-3">
          Always-on variables merged with any active environment. Use as{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
            {"{{KEY}}"}
          </code>
          . Active environment values take priority on conflicts.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {localVars.map((v) => (
            <div key={v.id} className="flex gap-2 items-center">
              <Input
                placeholder="KEY"
                value={v.key}
                onChange={(e) => handleChange(v.id, "key", e.target.value)}
                className="flex-1 h-8 text-sm font-mono uppercase"
              />
              <Input
                placeholder="value"
                value={v.value}
                onChange={(e) => handleChange(v.id, "value", e.target.value)}
                className="flex-1 h-8 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 text-destructive/70 hover:text-destructive"
                onClick={() => handleDelete(v.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {localVars.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              No global variables yet
            </p>
          )}
        </div>
        <div className="flex justify-between pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Variable
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
