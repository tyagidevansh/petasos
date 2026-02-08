"use client";

import * as React from "react";
import { Folder, RequestItem } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, FolderOpen, FolderClosed, FileText, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SidebarProps {
  folders: Folder[];
  selectedId: string | null;
  onSelect: (id: string, type: 'folder' | 'request') => void;
  onAddFolder: (parentId: string | null) => void;
  onAddRequest: (folderId: string) => void;
  onDelete: (id: string, type: 'folder' | 'request') => void;
  onUpdateName: (id: string, type: 'folder' | 'request', name: string) => void;
}

export function Sidebar({ folders, selectedId, onSelect, onAddFolder, onAddRequest, onDelete, onUpdateName }: SidebarProps) {
  return (
    <div className="w-64 border-r h-full flex flex-col bg-muted/10">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg">API Collection</h2>
        <Button size="icon" variant="ghost" onClick={() => onAddFolder(null)} title="Add Root Folder">
            <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {folders.map(folder => (
            <FolderItem 
                key={folder.id} 
                folder={folder} 
                selectedId={selectedId}
                onSelect={onSelect}
                onAddFolder={onAddFolder}
                onAddRequest={onAddRequest}
                onDelete={onDelete}
                onUpdateName={onUpdateName}
                depth={0}
            />
        ))}
        {folders.length === 0 && (
            <div className="text-center text-muted-foreground mt-10 text-sm">
                No folders. create one to start.
            </div>
        )}
      </div>
    </div>
  );
}

interface FolderItemProps {
    folder: Folder;
    selectedId: string | null;
    onSelect: (id: string, type: 'folder' | 'request') => void;
    onAddFolder: (parentId: string | null) => void;
    onAddRequest: (folderId: string) => void;
    onDelete: (id: string, type: 'folder' | 'request') => void;
    onUpdateName: (id: string, type: 'folder' | 'request', name: string) => void;
    depth: number;
}

function FolderItem({ folder, selectedId, onSelect, onAddFolder, onAddRequest, onDelete, onUpdateName, depth }: FolderItemProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [name, setName] = React.useState(folder.name);

    const handleNameSubmit = () => {
        setIsEditing(false);
        if (name.trim() !== folder.name) {
            onUpdateName(folder.id, 'folder', name);
        }
    };

    return (
        <div className="mb-1">
            <div className={cn("flex items-center group rounded-md px-2 py-1 hover:bg-muted/50", selectedId === folder.id && "bg-muted")} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
                <button onClick={() => setIsOpen(!isOpen)} className="mr-1 p-1 hover:bg-background rounded">
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </button>
                
                {isEditing ? (
                    <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        onBlur={handleNameSubmit} 
                        onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                        className="h-6 text-sm px-1 py-0 mr-2"
                        autoFocus
                    />
                ) : (
                    <span 
                        className="flex-1 text-sm font-medium cursor-pointer truncate" 
                        onDoubleClick={() => setIsEditing(true)}
                        onClick={() => onSelect(folder.id, 'folder')}
                    >
                        {folder.name}
                    </span>
                )}

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onAddRequest(folder.id); }} title="Add Request">
                        <FileText className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onAddFolder(folder.id); }} title="Add Subfolder">
                        <FolderOpen className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(folder.id, 'folder'); }}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {isOpen && (
                <div>
                   {folder.subfolders?.map(sub => (
                       <FolderItem 
                           key={sub.id} 
                           folder={sub} 
                           selectedId={selectedId} 
                           onSelect={onSelect}
                           onAddFolder={onAddFolder}
                           onAddRequest={onAddRequest}
                           onDelete={onDelete}
                           onUpdateName={onUpdateName}
                           depth={depth + 1}
                        />
                   ))}
                   {folder.requests?.map(req => (
                       <RequestLink 
                           key={req.id} 
                           request={req} 
                           selectedId={selectedId} 
                           onSelect={onSelect}
                           onDelete={onDelete}
                           onUpdateName={onUpdateName}
                           depth={depth + 1}
                        />
                   ))}
                   {folder.subfolders?.length === 0 && folder.requests?.length === 0 && (
                       <div className="text-xs text-muted-foreground py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}>Empty</div>
                   )}
                </div>
            )}
        </div>
    );
}

function RequestLink({ request, selectedId, onSelect, onDelete, onUpdateName, depth }: { request: RequestItem, selectedId: string | null, onSelect: any, onDelete: any, onUpdateName: any, depth: number }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [name, setName] = React.useState(request.name);

    const handleNameSubmit = () => {
        setIsEditing(false);
        if (name.trim() !== request.name) {
            onUpdateName(request.id, 'request', name);
        }
    };

    return (
        <div 
            className={cn("flex items-center group rounded-md px-2 py-1 cursor-pointer hover:bg-muted/50", selectedId === request.id && "bg-primary/10 text-primary")} 
            style={{ paddingLeft: `${depth * 12 + 20}px` }}
            onClick={() => onSelect(request.id, 'request')}
        >
            <span className={cn("text-[10px] font-bold mr-2 w-8 uppercase text-muted-foreground", {
                "text-green-600": request.method === 'GET',
                "text-blue-600": request.method === 'POST',
                "text-yellow-600": request.method === 'PUT',
                "text-red-600": request.method === 'DELETE',
            })}>{request.method}</span>
            
            {isEditing ? (
                 <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    onBlur={handleNameSubmit} 
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                    className="h-6 text-sm px-1 py-0 mr-2 flex-1"
                    autoFocus
                />
            ) : (
                <span className="flex-1 text-sm truncate" onDoubleClick={() => setIsEditing(true)}>{request.name}</span>
            )}

            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(request.id, 'request'); }}>
                <Trash2 className="h-3 w-3" />
            </Button>
        </div>
    );
}
