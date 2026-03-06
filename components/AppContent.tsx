"use client";

import * as React from "react";
import { Sidebar } from "@/components/Sidebar";
import { RequestEditor } from "@/components/RequestEditor";
import { ImportCurlDialog } from "@/components/ImportCurlDialog";
import { EnvironmentManager } from "@/components/EnvironmentManager";
import { GlobalVarsDialog, GlobalVar } from "@/components/GlobalVarsDialog";
import { DB, Folder, RequestItem, Environment } from "@/types";
import { Loader2, Zap } from "lucide-react";
import { exportCollection, importCollection } from "@/lib/curl";

export function AppContent() {
  const [data, setData] = React.useState<DB | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<
    "folder" | "request" | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Track dirty state - stores the last saved version of the selected request
  const [savedRequest, setSavedRequest] = React.useState<RequestItem | null>(
    null,
  );

  // Pending navigation (for save/discard prompt)
  const [pendingNavigation, setPendingNavigation] = React.useState<{
    id: string;
    type: "folder" | "request";
  } | null>(null);

  // Dialog states
  const [importCurlOpen, setImportCurlOpen] = React.useState(false);
  const [importCurlFolderId, setImportCurlFolderId] =
    React.useState<string>("");
  const [envManagerOpen, setEnvManagerOpen] = React.useState(false);
  const [globalVarsOpen, setGlobalVarsOpen] = React.useState(false);
  const [globalVars, setGlobalVars] = React.useState<GlobalVar[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("petasos-global-vars") || "[]");
    } catch {
      return [];
    }
  });

  const handleUpdateGlobalVars = (vars: GlobalVar[]) => {
    setGlobalVars(vars);
    if (typeof window !== "undefined")
      localStorage.setItem("petasos-global-vars", JSON.stringify(vars));
  };

  // In-memory cache for fully-loaded requests (avoids re-fetching on revisit)
  const requestCache = React.useRef<Map<string, RequestItem>>(new Map());

  // Load data
  React.useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then((d) => {
        // Ensure environments array exists
        if (!d.environments) {
          d.environments = [];
        }
        setData(d);
        setLoading(false);
      })
      .catch((err) => console.error("Failed to load data", err));
  }, []);

  const findRequest = (folders: Folder[], id: string): RequestItem | null => {
    for (const f of folders) {
      const req = (f.requests || []).find((r) => r.id === id);
      if (req) return req;
      const sub = findRequest(f.subfolders || [], id);
      if (sub) return sub;
    }
    return null;
  };

  const selectedRequest =
    selectedId && selectedType === "request" && data
      ? findRequest(data.folders || [], selectedId)
      : null;

  const activeEnvironment = data?.environments?.find(
    (e) => e.id === data.activeEnvironmentId,
  );

  // Get env vars as key-value object for interpolation
  const envVars = React.useMemo(() => {
    const base = globalVars.reduce(
      (acc, v) => {
        if (v.key) acc[v.key] = v.value;
        return acc;
      },
      {} as Record<string, string>,
    );
    if (!activeEnvironment) return base;
    return activeEnvironment.variables.reduce((acc, v) => {
      if (v.key) acc[v.key] = v.value;
      return acc;
    }, base);
  }, [activeEnvironment, globalVars]);

  // Compute dirty state by comparing current request with saved version
  const isDirty = React.useMemo(() => {
    if (!selectedRequest || !savedRequest) return false;
    return JSON.stringify(selectedRequest) !== JSON.stringify(savedRequest);
  }, [selectedRequest, savedRequest]);

  // Update savedRequest when selection changes
  React.useEffect(() => {
    if (selectedRequest) {
      setSavedRequest(JSON.parse(JSON.stringify(selectedRequest)));
    } else {
      setSavedRequest(null);
    }
  }, [selectedId]); // Only on ID change, not on every update

  // Save request changes
  const handleSaveRequest = async (request: RequestItem) => {
    setSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (!res.ok) throw new Error("Failed to save");
      // Update saved state and cache on successful save
      setSavedRequest(JSON.parse(JSON.stringify(request)));
      requestCache.current.set(request.id, JSON.parse(JSON.stringify(request)));
    } catch (e) {
      console.error("Save failed", e);
      alert("Failed to save request");
    } finally {
      setSaving(false);
    }
  };

  // Prefetch a request into cache on hover (silent, no-op if already cached)
  const handlePrefetchRequest = React.useCallback((requestId: string) => {
    if (requestCache.current.has(requestId)) return;
    fetch(`/api/requests/${requestId}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((fullReq) => {
        if (fullReq) requestCache.current.set(requestId, fullReq);
      })
      .catch(() => {});
  }, []);

  // Handle navigation with dirty check
  const handleSelect = (id: string, type: "folder" | "request") => {
    if (isDirty && selectedRequest) {
      setPendingNavigation({ id, type });
      // Show confirmation dialog
      const confirmLeave = confirm(
        "You have unsaved changes. Do you want to save before leaving?",
      );
      if (confirmLeave) {
        handleSaveRequest(selectedRequest).then(() => {
          setSelectedId(id);
          setSelectedType(type);
        });
      } else {
        // Discard changes - proceed anyway
        setSelectedId(id);
        setSelectedType(type);
      }
      setPendingNavigation(null);
    } else {
      setSelectedId(id);
      setSelectedType(type);
    }
  };

  const handleUpdateRequest = (updated: RequestItem) => {
    setData((d) => {
      if (!d) return null;
      const updateInFolders = (folders: Folder[]): Folder[] => {
        return (folders || []).map((f) => ({
          ...f,
          requests: (f.requests || []).map((r) =>
            r.id === updated.id ? updated : r,
          ),
          subfolders: updateInFolders(f.subfolders || []),
        }));
      };
      return { ...d, folders: updateInFolders(d.folders || []) };
    });
  };

  const handleAddFolder = async (parentId: string | null) => {
    const id = crypto.randomUUID();
    const name = "New Folder";

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, parentId }),
      });
      if (!res.ok) throw new Error("Failed to create folder");

      const newFolder: Folder = { id, name, requests: [], subfolders: [] };
      setData((d) => {
        if (!d) return { folders: [newFolder] };
        if (!parentId) {
          return { ...d, folders: [...(d.folders || []), newFolder] };
        }
        const addToParent = (folders: Folder[]): Folder[] => {
          return (folders || []).map((f) => {
            if (f.id === parentId) {
              return { ...f, subfolders: [...(f.subfolders || []), newFolder] };
            }
            return { ...f, subfolders: addToParent(f.subfolders || []) };
          });
        };
        return { ...d, folders: addToParent(d.folders || []) };
      });
    } catch (e) {
      console.error(e);
      alert("Failed to create folder");
    }
  };

  const handleAddRequest = async (folderId: string) => {
    const id = crypto.randomUUID();
    const name = "New Request";
    const method = "GET";

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, folderId, method, url: "" }),
      });
      if (!res.ok) throw new Error("Failed to create request");

      const newRequest: RequestItem = {
        id,
        name,
        method,
        url: "",
        headers: [],
        queryParams: [],
        examples: [],
      };

      setData((d) => {
        if (!d) return null;
        const addToFolder = (folders: Folder[]): Folder[] => {
          return (folders || []).map((f) => {
            if (f.id === folderId) {
              return { ...f, requests: [...(f.requests || []), newRequest] };
            }
            return { ...f, subfolders: addToFolder(f.subfolders || []) };
          });
        };
        return { ...d, folders: addToFolder(d.folders || []) };
      });
      setSelectedId(newRequest.id);
      setSelectedType("request");
    } catch (e) {
      console.error(e);
      alert("Failed to create request");
    }
  };

  const handleDelete = async (id: string, type: "folder" | "request") => {
    if (!confirm("Are you sure?")) return;

    try {
      const res = await fetch(
        type === "folder" ? "/api/folders" : "/api/requests",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        },
      );
      if (!res.ok) throw new Error("Failed to delete");

      setData((d) => {
        if (!d) return null;
        const deleteFromFolders = (folders: Folder[]): Folder[] => {
          return (folders || []).reduce((acc: Folder[], f) => {
            if (type === "folder" && f.id === id) return acc;

            const newRequests =
              type === "request"
                ? (f.requests || []).filter((r) => r.id !== id)
                : f.requests || [];

            const newSubfolders = deleteFromFolders(f.subfolders || []);

            acc.push({
              ...f,
              requests: newRequests,
              subfolders: newSubfolders,
            });
            return acc;
          }, []);
        };
        return { ...d, folders: deleteFromFolders(d.folders || []) };
      });

      if (selectedId === id) {
        setSelectedId(null);
        setSelectedType(null);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to delete");
    }
  };

  const handleUpdateName = async (
    id: string,
    type: "folder" | "request",
    name: string,
  ) => {
    try {
      const res = await fetch(
        type === "folder" ? "/api/folders" : "/api/requests",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            type === "folder"
              ? { id, name }
              : { ...findRequest(data?.folders || [], id), name },
          ),
        },
      );

      if (!res.ok) throw new Error("Failed to update name");

      setData((d) => {
        if (!d) return null;
        const updateName = (folders: Folder[]): Folder[] => {
          return (folders || []).map((f) => {
            let newFolder = { ...f };

            if (type === "folder" && f.id === id) {
              newFolder.name = name;
            }

            if (type === "request") {
              newFolder.requests = (f.requests || []).map((r) =>
                r.id === id ? { ...r, name } : r,
              );
            }

            newFolder.subfolders = updateName(f.subfolders || []);
            return newFolder;
          });
        };
        return { ...d, folders: updateName(d.folders || []) };
      });
    } catch (e) {
      console.error(e);
      alert("Failed to update name");
    }
  };

  const handleMoveRequest = async (
    requestId: string,
    targetFolderId: string,
  ) => {
    const request = findRequest(data?.folders || [], requestId);
    if (!request) return;

    setData((prev) => {
      if (!prev) return null;

      let movedRequest: RequestItem | null = null;

      const removeReq = (folders: Folder[]): Folder[] => {
        return folders.map((f) => {
          const found = f.requests.find((r) => r.id === requestId);
          if (found) {
            movedRequest = found;
            return {
              ...f,
              requests: f.requests.filter((r) => r.id !== requestId),
              subfolders: removeReq(f.subfolders),
            };
          }
          return { ...f, subfolders: removeReq(f.subfolders) };
        });
      };

      const foldersAfterRemove = removeReq(prev.folders);

      if (!movedRequest) return prev;

      const addReq = (folders: Folder[]): Folder[] => {
        return folders.map((f) => {
          if (f.id === targetFolderId) {
            return {
              ...f,
              requests: [...f.requests, movedRequest!],
              subfolders: addReq(f.subfolders),
            };
          }
          return { ...f, subfolders: addReq(f.subfolders) };
        });
      };

      return { ...prev, folders: addReq(foldersAfterRemove) };
    });

    try {
      const res = await fetch("/api/requests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, folderId: targetFolderId }),
      });

      if (!res.ok) throw new Error("Move failed");
    } catch (e) {
      console.error("Move failed", e);
      alert("Failed to move request");
      window.location.reload();
    }
  };

  // Import cURL handler
  const handleImportCurl = (folderId: string) => {
    setImportCurlFolderId(folderId);
    setImportCurlOpen(true);
  };

  const handleCurlImported = async (
    parsedRequest: Partial<RequestItem>,
    name: string,
  ) => {
    const id = crypto.randomUUID();
    const newRequest: RequestItem = {
      id,
      name,
      method: parsedRequest.method || "GET",
      url: parsedRequest.url || "",
      headers: parsedRequest.headers || [],
      queryParams: parsedRequest.queryParams || [],
      body: parsedRequest.body,
      examples: [],
    };

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newRequest, folderId: importCurlFolderId }),
      });
      if (!res.ok) throw new Error("Failed to create request");

      setData((d) => {
        if (!d) return null;
        const addToFolder = (folders: Folder[]): Folder[] => {
          return (folders || []).map((f) => {
            if (f.id === importCurlFolderId) {
              return { ...f, requests: [...(f.requests || []), newRequest] };
            }
            return { ...f, subfolders: addToFolder(f.subfolders || []) };
          });
        };
        return { ...d, folders: addToFolder(d.folders || []) };
      });
      setSelectedId(newRequest.id);
      setSelectedType("request");
    } catch (e) {
      console.error(e);
      alert("Failed to import request");
    }
  };

  // Export collection
  const handleExport = () => {
    if (!data) return;
    const json = exportCollection(data.folders);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `petasos-collection-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import collection (root or into folder)
  const handleImport = (targetFolderId: string | null = null) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const importedFolders = importCollection(text);

        // Recursively persist folders and their requests/subfolders to backend
        const persistFolder = async (
          folder: Folder,
          parentId: string | null,
        ) => {
          const res = await fetch("/api/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: folder.id,
              name: folder.name,
              parentId,
            }),
          });
          if (!res.ok)
            throw new Error(`Failed to create folder "${folder.name}"`);

          for (const req of folder.requests) {
            const rRes = await fetch("/api/requests", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: req.id,
                name: req.name,
                folderId: folder.id,
                method: req.method,
                url: req.url,
                body: req.body,
                headers: req.headers,
                queryParams: req.queryParams,
              }),
            });
            if (!rRes.ok)
              throw new Error(`Failed to create request "${req.name}"`);
          }

          for (const sub of folder.subfolders || []) {
            await persistFolder(sub, folder.id);
          }
        };

        for (const folder of importedFolders) {
          await persistFolder(folder, targetFolderId);
        }

        // Add to state
        setData((d) => {
          if (!d) return { folders: importedFolders };
          if (!targetFolderId) {
            return { ...d, folders: [...d.folders, ...importedFolders] };
          }
          // Add to selected folder
          const addToParent = (folders: Folder[]): Folder[] => {
            return (folders || []).map((f) => {
              if (f.id === targetFolderId) {
                return {
                  ...f,
                  subfolders: [...(f.subfolders || []), ...importedFolders],
                };
              }
              return { ...f, subfolders: addToParent(f.subfolders || []) };
            });
          };
          return { ...d, folders: addToParent(d.folders || []) };
        });
        alert(`Successfully imported ${importedFolders.length} folder(s)!`);
      } catch (e: any) {
        alert(e.message || "Failed to import collection");
      }
    };
    input.click();
  };

  // Environment handlers
  const handleUpdateEnvironments = (environments: Environment[]) => {
    setData((d) => (d ? { ...d, environments } : null));
    // TODO: Persist to backend
  };

  const handleSetActiveEnvironment = (id: string | null) => {
    setData((d) => (d ? { ...d, activeEnvironmentId: id || undefined } : null));
    // TODO: Persist to backend
  };

  // Lazy load request details
  const isRequestLoaded = React.useMemo(() => {
    return selectedRequest && selectedRequest.headers !== undefined;
  }, [selectedRequest]);

  React.useEffect(() => {
    if (
      selectedType === "request" &&
      selectedId &&
      selectedRequest &&
      !isRequestLoaded
    ) {
      // Serve from in-memory cache if available (instant, no network round-trip)
      const cached = requestCache.current.get(selectedId);
      if (cached) {
        handleUpdateRequest(cached);
        setSavedRequest(JSON.parse(JSON.stringify(cached)));
        return;
      }

      const controller = new AbortController();

      fetch(`/api/requests/${selectedId}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load request");
          return res.json();
        })
        .then((fullReq) => {
          requestCache.current.set(selectedId, fullReq);
          handleUpdateRequest(fullReq);
          // Update saved state to match fetched data, preventing false "dirty" state
          setSavedRequest(JSON.parse(JSON.stringify(fullReq)));
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Failed to load request details", err);
          }
        });

      return () => controller.abort();
    }
  }, [selectedId, selectedType, isRequestLoaded, selectedRequest]);

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
          </div>
          <p className="text-muted-foreground text-sm">
            Loading your collection...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        folders={data.folders || []}
        selectedId={selectedId}
        onSelect={handleSelect}
        onAddFolder={handleAddFolder}
        onAddRequest={handleAddRequest}
        onDelete={handleDelete}
        onUpdateName={handleUpdateName}
        onMoveRequest={handleMoveRequest}
        onImportCurl={handleImportCurl}
        onExport={handleExport}
        onImport={() => handleImport(null)}
        onImportIntoFolder={(folderId) => handleImport(folderId)}
        onOpenEnvironments={() => setEnvManagerOpen(true)}
        onOpenGlobalVars={() => setGlobalVarsOpen(true)}
        onPrefetchRequest={handlePrefetchRequest}
        activeEnvironmentName={activeEnvironment?.name}
      />
      <div className="flex-1 flex flex-col min-w-0">
        {selectedType === "request" && selectedRequest ? (
          !isRequestLoaded ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <RequestEditor
              request={selectedRequest}
              onChange={handleUpdateRequest}
              onRun={() => {}}
              onSave={() => handleSaveRequest(selectedRequest)}
              onSaveExample={(req) => handleSaveRequest(req)}
              isDirty={isDirty}
            />
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative mx-auto w-16 h-16">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 blur-xl" />
                <div className="relative flex items-center justify-center h-full">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">
                  Select a request
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Choose a request from the sidebar to view and edit its details
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import cURL Dialog */}
      <ImportCurlDialog
        open={importCurlOpen}
        onOpenChange={setImportCurlOpen}
        folderId={importCurlFolderId}
        onImport={handleCurlImported}
      />

      {/* Environment Manager */}
      <EnvironmentManager
        open={envManagerOpen}
        onOpenChange={setEnvManagerOpen}
        environments={data.environments || []}
        activeEnvironmentId={data.activeEnvironmentId || null}
        onUpdateEnvironments={handleUpdateEnvironments}
        onSetActiveEnvironment={handleSetActiveEnvironment}
      />

      {/* Global Variables */}
      <GlobalVarsDialog
        open={globalVarsOpen}
        onOpenChange={setGlobalVarsOpen}
        vars={globalVars}
        onUpdate={handleUpdateGlobalVars}
      />
    </div>
  );
}
