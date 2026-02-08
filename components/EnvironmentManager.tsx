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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Environment, EnvVariable } from "@/types";
import { Plus, Trash2, Globe, Variable, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvironmentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environments: Environment[];
  activeEnvironmentId: string | null;
  onUpdateEnvironments: (environments: Environment[]) => void;
  onSetActiveEnvironment: (id: string | null) => void;
}

export function EnvironmentManager({
  open,
  onOpenChange,
  environments,
  activeEnvironmentId,
  onUpdateEnvironments,
  onSetActiveEnvironment,
}: EnvironmentManagerProps) {
  const [selectedEnvId, setSelectedEnvId] = React.useState<string | null>(
    activeEnvironmentId || environments[0]?.id || null
  );
  const [copiedVar, setCopiedVar] = React.useState<string | null>(null);

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const handleAddEnvironment = () => {
    const newEnv: Environment = {
      id: crypto.randomUUID(),
      name: "New Environment",
      variables: [],
    };
    onUpdateEnvironments([...environments, newEnv]);
    setSelectedEnvId(newEnv.id);
  };

  const handleDeleteEnvironment = (id: string) => {
    if (!confirm("Delete this environment?")) return;
    const newEnvs = environments.filter((e) => e.id !== id);
    onUpdateEnvironments(newEnvs);
    if (selectedEnvId === id) {
      setSelectedEnvId(newEnvs[0]?.id || null);
    }
    if (activeEnvironmentId === id) {
      onSetActiveEnvironment(null);
    }
  };

  const handleUpdateEnvName = (id: string, name: string) => {
    onUpdateEnvironments(
      environments.map((e) => (e.id === id ? { ...e, name } : e))
    );
  };

  const handleAddVariable = () => {
    if (!selectedEnv) return;
    const newVar: EnvVariable = {
      id: crypto.randomUUID(),
      key: "",
      value: "",
    };
    onUpdateEnvironments(
      environments.map((e) =>
        e.id === selectedEnvId
          ? { ...e, variables: [...e.variables, newVar] }
          : e
      )
    );
  };

  const handleUpdateVariable = (
    varId: string,
    field: keyof EnvVariable,
    value: string
  ) => {
    onUpdateEnvironments(
      environments.map((e) =>
        e.id === selectedEnvId
          ? {
              ...e,
              variables: e.variables.map((v) =>
                v.id === varId ? { ...v, [field]: value } : v
              ),
            }
          : e
      )
    );
  };

  const handleDeleteVariable = (varId: string) => {
    onUpdateEnvironments(
      environments.map((e) =>
        e.id === selectedEnvId
          ? { ...e, variables: e.variables.filter((v) => v.id !== varId) }
          : e
      )
    );
  };

  const copyVarSyntax = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedVar(key);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card border-border/50 max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Environment Variables
          </DialogTitle>
          <DialogDescription>
            Define variables like <code className="text-primary bg-muted px-1 rounded">{"{{baseUrl}}"}</code> to use in your requests. Share environments with your team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden py-4">
          {/* Environment List */}
          <div className="w-48 flex-shrink-0 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Environments
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={handleAddEnvironment}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="space-y-1">
              {environments.map((env) => (
                <div
                  key={env.id}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group",
                    selectedEnvId === env.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent"
                  )}
                  onClick={() => setSelectedEnvId(env.id)}
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      activeEnvironmentId === env.id
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm flex-1 truncate">{env.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEnvironment(env.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}

              {environments.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No environments
                </div>
              )}
            </div>
          </div>

          {/* Variables Editor */}
          <div className="flex-1 border-l border-border/50 pl-4 overflow-auto">
            {selectedEnv ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={selectedEnv.name}
                    onChange={(e) =>
                      handleUpdateEnvName(selectedEnv.id, e.target.value)
                    }
                    className="font-medium h-9 w-48 bg-input/50"
                  />
                  <Button
                    size="sm"
                    variant={
                      activeEnvironmentId === selectedEnv.id
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      onSetActiveEnvironment(
                        activeEnvironmentId === selectedEnv.id
                          ? null
                          : selectedEnv.id
                      )
                    }
                    className={cn(
                      activeEnvironmentId === selectedEnv.id &&
                        "bg-emerald-600 hover:bg-emerald-700"
                    )}
                  >
                    {activeEnvironmentId === selectedEnv.id
                      ? "Active"
                      : "Set Active"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_1fr_80px] gap-2 text-xs font-medium text-muted-foreground px-1">
                    <div>Key</div>
                    <div>Value</div>
                    <div></div>
                  </div>

                  {selectedEnv.variables.map((v) => (
                    <div
                      key={v.id}
                      className="grid grid-cols-[1fr_1fr_80px] gap-2 items-center group"
                    >
                      <Input
                        value={v.key}
                        onChange={(e) =>
                          handleUpdateVariable(v.id, "key", e.target.value)
                        }
                        placeholder="baseUrl"
                        className="h-8 text-sm font-mono bg-input/50"
                      />
                      <Input
                        value={v.value}
                        onChange={(e) =>
                          handleUpdateVariable(v.id, "value", e.target.value)
                        }
                        placeholder="https://api.example.com"
                        className="h-8 text-sm bg-input/50"
                      />
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => copyVarSyntax(v.key)}
                          title="Copy variable syntax"
                          disabled={!v.key}
                        >
                          {copiedVar === v.key ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive/70 hover:text-destructive opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteVariable(v.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddVariable}
                    className="mt-2 border-dashed"
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add Variable
                  </Button>
                </div>

                <div className="bg-muted/30 rounded-lg p-3 mt-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Variable className="h-4 w-4" />
                    Use <code className="text-primary bg-muted px-1 rounded">{"{{variableName}}"}</code> in URLs, headers, or body to reference these values.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select or create an environment
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
