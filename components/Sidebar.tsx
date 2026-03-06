"use client";

import * as React from "react";
import { Folder, RequestItem, Environment } from "@/types";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileText,
  Plus,
  Trash2,
  GripVertical,
  Folder as FolderIcon,
  Terminal,
  Download,
  Upload,
  Globe,
  Search,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";

interface SidebarProps {
  folders: Folder[];
  selectedId: string | null;
  onSelect: (id: string, type: "folder" | "request") => void;
  onAddFolder: (parentId: string | null) => void;
  onAddRequest: (folderId: string) => void;
  onDelete: (id: string, type: "folder" | "request") => void;
  onUpdateName: (id: string, type: "folder" | "request", name: string) => void;
  onMoveRequest: (requestId: string, targetFolderId: string) => void;
  onImportCurl: (folderId: string) => void;
  onExport: () => void;
  onImport: () => void;
  onImportIntoFolder: (folderId: string) => void;
  onOpenEnvironments: () => void;
  onOpenGlobalVars: () => void;
  onPrefetchRequest?: (requestId: string) => void;
  activeEnvironmentName?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400",
  POST: "text-blue-400",
  PUT: "text-amber-400",
  PATCH: "text-purple-400",
  DELETE: "text-red-400",
};

export function Sidebar({
  folders,
  selectedId,
  onSelect,
  onAddFolder,
  onAddRequest,
  onDelete,
  onUpdateName,
  onMoveRequest,
  onImportCurl,
  onExport,
  onImport,
  onImportIntoFolder,
  onOpenEnvironments,
  onOpenGlobalVars,
  onPrefetchRequest,
  activeEnvironmentName,
}: SidebarProps) {
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [searchInput, setSearchInput] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openFolderIds = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const result = new Set<string>();
    const check = (folder: Folder): boolean => {
      let match = folder.name.toLowerCase().includes(q);
      for (const req of folder.requests || []) {
        if (
          req.name.toLowerCase().includes(q) ||
          (req.url || "").toLowerCase().includes(q)
        )
          match = true;
      }
      for (const sub of folder.subfolders || []) {
        if (check(sub)) match = true;
      }
      if (match) result.add(folder.id);
      return match;
    };
    for (const folder of folders) check(folder);
    return result;
  }, [searchQuery, folders]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onMoveRequest(active.id as string, over.id as string);
    }
  };

  // Get first folder ID for import curl (defaults to first folder)
  const defaultFolderId = folders[0]?.id;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="w-72 border-r border-border/50 h-full flex flex-col bg-card/50">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/80 to-emerald-600 flex items-center justify-center shadow-glow">
                <span className="text-sm font-bold text-primary-foreground">
                  P
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-sm">Petasos</h2>
                <p className="text-[10px] text-muted-foreground">
                  API Collection
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onAddFolder(null)}
              title="Add Root Folder"
              className="h-8 w-8 hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-border/50 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => defaultFolderId && onImportCurl(defaultFolderId)}
            disabled={!defaultFolderId}
            title="Import from cURL"
            className="h-7 px-2 text-xs gap-1.5"
          >
            <Terminal className="h-3.5 w-3.5" />
            Import cURL
          </Button>
          <div className="flex-1" />
          <Button
            size="icon"
            variant="ghost"
            onClick={onExport}
            title="Export Collection"
            className="h-7 w-7"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onImport}
            title="Import Collection"
            className="h-7 w-7"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenEnvironments}
            title="Environment Variables"
            className={cn(
              "h-7 w-7",
              activeEnvironmentName && "text-emerald-400",
            )}
          >
            <Globe className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onOpenGlobalVars}
            title="Global Variables"
            className="h-7 w-7"
          >
            <Key className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-border/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search requests..."
              className="w-full h-7 pl-8 pr-2 text-sm bg-muted/50 border border-border/50 rounded-md placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Active Environment Indicator */}
        {activeEnvironmentName && (
          <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {activeEnvironmentName}
            </div>
          </div>
        )}

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {(openFolderIds
            ? folders.filter((f) => openFolderIds.has(f.id))
            : folders
          ).map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddFolder={onAddFolder}
              onAddRequest={onAddRequest}
              onDelete={onDelete}
              onUpdateName={onUpdateName}
              onImportIntoFolder={onImportIntoFolder}
              depth={0}
              openFolderIds={openFolderIds}
              searchQuery={searchQuery}
              onPrefetchRequest={onPrefetchRequest}
            />
          ))}
          {folders.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted/50 mb-3">
                <FolderIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No folders yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Click + to create your first folder
              </p>
            </div>
          )}
        </div>
      </div>

      {mounted &&
        createPortal(
          <DragOverlay>
            {activeDragId ? (
              <div className="bg-card border border-border/50 rounded-lg px-3 py-2 shadow-xl shadow-black/20 text-sm">
                Moving request...
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

interface FolderItemProps {
  folder: Folder;
  selectedId: string | null;
  onSelect: (id: string, type: "folder" | "request") => void;
  onAddFolder: (parentId: string | null) => void;
  onAddRequest: (folderId: string) => void;
  onDelete: (id: string, type: "folder" | "request") => void;
  onUpdateName: (id: string, type: "folder" | "request", name: string) => void;
  onImportIntoFolder: (folderId: string) => void;
  depth: number;
  openFolderIds?: Set<string> | null;
  searchQuery?: string;
  onPrefetchRequest?: (requestId: string) => void;
}

function FolderItem({
  folder,
  selectedId,
  onSelect,
  onAddFolder,
  onAddRequest,
  onDelete,
  onUpdateName,
  onImportIntoFolder,
  depth,
  openFolderIds,
  searchQuery,
  onPrefetchRequest,
}: FolderItemProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const searching = !!searchQuery?.trim();
  const effectiveIsOpen = searching
    ? (openFolderIds?.has(folder.id) ?? false)
    : isOpen;
  const q = searchQuery?.trim().toLowerCase() ?? "";
  const visibleSubfolders =
    searching && openFolderIds
      ? (folder.subfolders || []).filter((s) => openFolderIds.has(s.id))
      : folder.subfolders || [];
  const visibleRequests = searching
    ? (folder.requests || []).filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.url || "").toLowerCase().includes(q),
      )
    : folder.requests || [];
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(folder.name);

  // Drop target
  const { setNodeRef, isOver } = useDroppable({
    id: folder.id,
    data: { type: "folder" },
  });

  const handleNameSubmit = () => {
    setIsEditing(false);
    if (name.trim() !== folder.name) {
      onUpdateName(folder.id, "folder", name);
    }
  };

  return (
    <div className="animate-fade-in">
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center group rounded-lg px-2 py-1.5 transition-all duration-150",
          "hover:bg-accent/50",
          selectedId === folder.id && "bg-accent",
          isOver && "ring-2 ring-primary ring-inset bg-primary/5",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="mr-1.5 p-0.5 hover:bg-background/50 rounded transition-colors"
        >
          {effectiveIsOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>

        <FolderIcon className="h-4 w-4 mr-2 text-amber-500/80" />

        {isEditing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            className="h-6 text-sm px-2 py-0 mr-2 bg-background"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium cursor-pointer truncate"
            onDoubleClick={() => setIsEditing(true)}
            onClick={() => onSelect(folder.id, "folder")}
          >
            {folder.name}
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-background/50"
            onClick={(e) => {
              e.stopPropagation();
              onImportIntoFolder(folder.id);
            }}
            title="Import into Folder"
          >
            <Upload className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-background/50"
            onClick={(e) => {
              e.stopPropagation();
              onAddRequest(folder.id);
            }}
            title="Add Request"
          >
            <FileText className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 hover:bg-background/50"
            onClick={(e) => {
              e.stopPropagation();
              onAddFolder(folder.id);
            }}
            title="Add Subfolder"
          >
            <FolderOpen className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(folder.id, "folder");
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {effectiveIsOpen && (
        <div className="ml-2 border-l border-border/30 pl-1">
          {visibleSubfolders.map((sub) => (
            <FolderItem
              key={sub.id}
              folder={sub}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddFolder={onAddFolder}
              onAddRequest={onAddRequest}
              onDelete={onDelete}
              onUpdateName={onUpdateName}
              onImportIntoFolder={onImportIntoFolder}
              depth={depth + 1}
              openFolderIds={openFolderIds}
              searchQuery={searchQuery}
              onPrefetchRequest={onPrefetchRequest}
            />
          ))}
          {visibleRequests.map((req) => (
            <RequestLink
              key={req.id}
              request={req}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
              onUpdateName={onUpdateName}
              onPrefetchRequest={onPrefetchRequest}
              depth={depth + 1}
            />
          ))}
          {visibleSubfolders.length === 0 && visibleRequests.length === 0 && (
            <div
              className="text-xs text-muted-foreground/60 py-2 italic"
              style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}
            >
              Empty folder
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RequestLink({
  request,
  selectedId,
  onSelect,
  onDelete,
  onUpdateName,
  onPrefetchRequest,
  depth,
}: {
  request: RequestItem;
  selectedId: string | null;
  onSelect: any;
  onDelete: any;
  onUpdateName: any;
  onPrefetchRequest?: (requestId: string) => void;
  depth: number;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [name, setName] = React.useState(request.name);

  // Draggable
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: request.id,
    data: { type: "request" },
  });

  const handleNameSubmit = () => {
    setIsEditing(false);
    if (name.trim() !== request.name) {
      onUpdateName(request.id, "request", name);
    }
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={{ paddingLeft: `${depth * 12 + 20}px` }}
        className="opacity-30 bg-muted/30 rounded-lg py-1.5 px-2 mb-0.5"
      >
        {request.name}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className={cn(
        "flex items-center group rounded-lg px-2 py-1.5 cursor-pointer select-none transition-all duration-150",
        "hover:bg-accent/50",
        selectedId === request.id && "bg-primary/10 ring-1 ring-primary/30",
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onMouseEnter={() => onPrefetchRequest?.(request.id)}
      onClick={() => onSelect(request.id, "request")}
    >
      <div
        {...listeners}
        className="mr-1.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground" />
      </div>

      <span
        className={cn(
          "text-[10px] font-bold mr-2 w-10 uppercase tracking-wide",
          METHOD_COLORS[request.method] || "text-muted-foreground",
        )}
      >
        {request.method}
      </span>

      {isEditing ? (
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
          className="h-6 text-sm px-2 py-0 mr-2 flex-1 bg-background"
          autoFocus
        />
      ) : (
        <span
          className="flex-1 text-sm truncate"
          onDoubleClick={() => setIsEditing(true)}
        >
          {request.name}
        </span>
      )}

      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(request.id, "request");
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}
