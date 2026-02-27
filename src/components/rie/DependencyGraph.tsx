import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { DependencyEdge } from '@/lib/rie-types';
import { Button } from '@/components/ui/button';
import { Download, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
interface DependencyGraphProps {
  dependencies: DependencyEdge[];
}
export function DependencyGraph({ dependencies }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#4f46e5',
        primaryTextColor: '#fff',
        primaryBorderColor: '#4f46e5',
        lineColor: '#94a3b8',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
        mainBkg: 'transparent',
        nodeBorder: '#e2e8f0',
        textColor: 'inherit'
      },
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);
  useEffect(() => {
    const renderGraph = async () => {
      if (containerRef.current && dependencies.length > 0) {
        const edges = dependencies.slice(0, 30).map(edge => {
          const source = edge.source.replace(/\//g, '_').replace(/\./g, '_');
          const target = edge.target.replace(/\//g, '_').replace(/\./g, '_');
          return `  ${source}["${edge.source}"] --> ${target}["${edge.target}"]`;
        }).join('\n');
        const graphDefinition = `graph TD\n${edges}`;
        const id = `mermaid-${Date.now()}`;
        try {
          const { svg } = await mermaid.render(id, graphDefinition);
          containerRef.current.innerHTML = svg;
          setSvgContent(svg);
        } catch (err) {
          console.error('Mermaid render error:', err);
        }
      }
    };
    renderGraph();
  }, [dependencies]);
  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'archlens-architecture.svg';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Architecture SVG downloaded');
  };
  if (dependencies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-muted/20 rounded-xl border-2 border-dashed">
        <p className="text-muted-foreground font-medium">No significant file dependencies detected.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Try uploading a project with multiple modules.</p>
      </div>
    );
  }
  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={handleDownload} title="Download SVG">
          <Download className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" title="Expand View">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="w-full overflow-hidden rounded-xl bg-card/20 p-6 min-h-[400px]">
        <div 
          ref={containerRef} 
          className="w-full flex justify-center overflow-x-auto" 
        />
        <div className="mt-8 border-t border-border/40 pt-4 flex items-center justify-between text-2xs text-muted-foreground">
          <span className="font-medium uppercase tracking-widest">Architectural Graph v1.0</span>
          <span>Showing {Math.min(30, dependencies.length)} top relationships</span>
        </div>
      </div>
    </div>
  );
}