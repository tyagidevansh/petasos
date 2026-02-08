"use client";

import * as React from "react";
import { Sidebar } from "@/components/Sidebar";
import { RequestEditor } from "@/components/RequestEditor";
import { DB, Folder, RequestItem } from "@/types";
import { Loader2 } from "lucide-react";

export function AppContent() {
  const [data, setData] = React.useState<DB | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<'folder' | 'request' | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Load data
  React.useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => console.error("Failed to load data", err));
  }, []);

  const findRequest = (folders: Folder[], id: string): RequestItem | null => {
      for (const f of folders) {
          const req = (f.requests || []).find(r => r.id === id);
          if (req) return req;
          const sub = findRequest(f.subfolders || [], id);
          if (sub) return sub;
      }
      return null;
  };

  const selectedRequest = (selectedId && selectedType === 'request' && data) 
    ? findRequest(data.folders || [], selectedId) 
    : null;

  // Save request changes
  const handleSaveRequest = async (request: RequestItem) => {
      setSaving(true);
      try {
          const res = await fetch('/api/requests', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(request)
          });
          if (!res.ok) throw new Error("Failed to save");
          
          // No need to reload everything, local state is already updated via onChange
      } catch (e) {
          console.error("Save failed", e);
          alert("Failed to save request");
      } finally {
          setSaving(false);
      }
  };

  const handleUpdateRequest = (updated: RequestItem) => {
      // Optimistic update
      setData(d => {
          if (!d) return null;
          const updateInFolders = (folders: Folder[]): Folder[] => {
              return (folders || []).map(f => ({
                  ...f,
                  requests: (f.requests || []).map(r => r.id === updated.id ? updated : r),
                  subfolders: updateInFolders(f.subfolders || [])
              }));
          };
          return { ...d, folders: updateInFolders(d.folders || []) };
      });
  };

  const handleAddFolder = async (parentId: string | null) => {
      const id = crypto.randomUUID();
      const name = "New Folder";
      
      try {
          const res = await fetch('/api/folders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, name, parentId })
          });
          if (!res.ok) throw new Error("Failed to create folder");

          // Update local state
          const newFolder: Folder = { id, name, requests: [], subfolders: [] };
          setData(d => {
            if (!d) return { folders: [newFolder] };
            if (!parentId) {
                return { ...d, folders: [...(d.folders || []), newFolder] };
            }
            const addToParent = (folders: Folder[]): Folder[] => {
                return (folders || []).map(f => {
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
          const res = await fetch('/api/requests', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id, name, folderId, method, url: "" })
          });
          if (!res.ok) throw new Error("Failed to create request");

          const newRequest: RequestItem = {
            id, name, method, url: "", headers: [], queryParams: [], examples: []
          };
          
          setData(d => {
              if (!d) return null;
              const addToFolder = (folders: Folder[]): Folder[] => {
                  return (folders || []).map(f => {
                      if (f.id === folderId) {
                          return { ...f, requests: [...(f.requests || []), newRequest] };
                      }
                      return { ...f, subfolders: addToFolder(f.subfolders || []) };
                  });
              };
              return { ...d, folders: addToFolder(d.folders || []) };
          });
          setSelectedId(newRequest.id);
          setSelectedType('request');
      } catch (e) {
          console.error(e);
          alert("Failed to create request");
      }
  };

  const handleDelete = async (id: string, type: 'folder' | 'request') => {
      if (!confirm("Are you sure?")) return;
      
      try {
          const res = await fetch(type === 'folder' ? '/api/folders' : '/api/requests', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
          });
          if (!res.ok) throw new Error("Failed to delete");

          setData(d => {
              if (!d) return null;
              const deleteFromFolders = (folders: Folder[]): Folder[] => {
                  return (folders || []).reduce((acc: Folder[], f) => {
                      if (type === 'folder' && f.id === id) return acc;
                      
                      const newRequests = type === 'request' 
                          ? (f.requests || []).filter(r => r.id !== id)
                          : (f.requests || []);
                      
                      const newSubfolders = deleteFromFolders(f.subfolders || []);
                      
                      acc.push({
                          ...f,
                          requests: newRequests,
                          subfolders: newSubfolders
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

  const handleUpdateName = async (id: string, type: 'folder' | 'request', name: string) => {
      try {
          const res = await fetch(type === 'folder' ? '/api/folders' : '/api/requests', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(
                  type === 'folder' 
                      ? { id, name } 
                      : { ...findRequest(data?.folders || [], id), name } 
               )
          });

          if (!res.ok) throw new Error("Failed to update name");
          
          setData(d => {
            if (!d) return null;
            const updateName = (folders: Folder[]): Folder[] => {
                return (folders || []).map(f => {
                    let newFolder = { ...f };
                    
                    if (type === 'folder' && f.id === id) {
                        newFolder.name = name;
                    }
                    
                    if (type === 'request') {
                        newFolder.requests = (f.requests || []).map(r => 
                            r.id === id ? { ...r, name } : r
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

  if (loading || !data) {
      return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        folders={data.folders || []} 
        selectedId={selectedId}
        onSelect={(id, type) => { setSelectedId(id); setSelectedType(type); }}
        onAddFolder={handleAddFolder}
        onAddRequest={handleAddRequest}
        onDelete={handleDelete}
        onUpdateName={handleUpdateName}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
         {selectedType === 'request' && selectedRequest ? (
             <RequestEditor 
                request={selectedRequest} 
                onChange={handleUpdateRequest}
                onRun={() => {}} 
                onSave={() => handleSaveRequest(selectedRequest)}
             />
         ) : (
             <div className="flex h-full items-center justify-center text-muted-foreground">
                 Select a request to view details
             </div>
         )}
      </div>
    </div>
  );
}
