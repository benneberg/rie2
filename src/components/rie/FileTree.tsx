import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Code, FileJson, FileText, Globe } from 'lucide-react';
import { FileEntry } from '@/lib/rie-types';
import { cn } from '@/lib/utils';
interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: TreeNode[];
  language?: string;
  extension?: string;
}
interface FileTreeProps {
  structure: FileEntry[];
}
function getIcon(file: TreeNode) {
  if (file.type === 'directory') return <Folder className="w-4 h-4 text-blue-500 fill-blue-500/20" />;
  const ext = file.extension?.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return <Code className="w-4 h-4 text-amber-500" />;
  if (ext === 'json') return <FileJson className="w-4 h-4 text-emerald-500" />;
  if (ext === 'md') return <FileText className="w-4 h-4 text-muted-foreground" />;
  if (['html', 'css'].includes(ext || '')) return <Globe className="w-4 h-4 text-sky-500" />;
  return <File className="w-4 h-4 text-muted-foreground" />;
}
const FileNode = ({ node, level = 0 }: { node: TreeNode; level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const hasChildren = node.children.length > 0;
  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded-md transition-colors hover:bg-accent group cursor-pointer",
          level > 0 && "ml-4"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1 min-w-[20px]">
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <div className="w-3.5" />
          )}
          {getIcon(node)}
        </div>
        <span className={cn(
          "text-sm truncate",
          node.type === 'directory' ? "font-bold text-foreground/90" : "font-medium text-foreground/80"
        )}>
          {node.name}
        </span>
        {node.language && !hasChildren && (
          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
            {node.language}
          </span>
        )}
      </div>
      {isExpanded && hasChildren && (
        <div className="border-l border-border/60 ml-[18px]">
          {node.children
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <FileNode key={child.path} node={child} level={level + 1} />
            ))}
        </div>
      )}
    </div>
  );
};
export function FileTree({ structure }: FileTreeProps) {
  const tree = useMemo(() => {
    const root: TreeNode = { name: 'root', path: 'root', type: 'directory', children: [] };
    const nodesByPath: Record<string, TreeNode> = { '': root };
    structure.forEach((file) => {
      const parts = file.path.split('/');
      let currentPath = '';
      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        if (!nodesByPath[currentPath]) {
          const newNode: TreeNode = {
            name: part,
            path: currentPath,
            type: isLast ? file.type : 'directory',
            children: [],
            language: isLast ? file.language : undefined,
            extension: isLast ? file.extension : undefined,
          };
          nodesByPath[currentPath] = newNode;
          nodesByPath[parentPath].children.push(newNode);
        }
      });
    });
    return root.children;
  }, [structure]);
  return (
    <div className="font-sans py-2">
      {tree.length > 0 ? (
        tree.map((node) => <FileNode key={node.path} node={node} />)
      ) : (
        <div className="p-4 text-center text-sm text-muted-foreground italic">
          No files to display.
        </div>
      )}
    </div>
  );
}