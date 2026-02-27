import React, { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Code } from 'lucide-react';
import { FileEntry } from '@/lib/rie-types';
import { cn } from '@/lib/utils';
interface FileTreeProps {
  structure: FileEntry[];
}
export function FileTree({ structure }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'root': true });
  const toggle = (path: string) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };
  // Basic flat-to-tree conversion for the preview
  // In a full RIE we'd have a recursive structure
  return (
    <div className="font-mono text-sm space-y-1">
      {structure.slice(0, 50).map((file) => (
        <div 
          key={file.path}
          className={cn(
            "flex items-center gap-2 p-1 rounded-md transition-colors hover:bg-accent group",
            file.type === 'directory' ? "cursor-pointer" : "cursor-default"
          )}
        >
          {file.type === 'directory' ? (
            <div className="flex items-center gap-1">
              <Folder className="w-4 h-4 text-blue-400" />
              <span className="font-medium">{file.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 pl-4">
              <File className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
              <span className="text-foreground/90">{file.name}</span>
              {file.language && (
                <span className="text-2xs bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase">
                  {file.language}
                </span>
              )}
            </div>
          )}
        </div>
      ))}
      {structure.length > 50 && (
        <p className="text-xs text-muted-foreground pl-4 py-2 italic">
          + {structure.length - 50} more files...
        </p>
      )}
    </div>
  );
}