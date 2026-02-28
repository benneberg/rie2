import React, { useEffect, useRef, useState, useId } from 'react';
import mermaid from 'mermaid';
import { DependencyEdge, GraphType } from '@/lib/rie-types';
import { Button } from '@/components/ui/button';
import { Download, Maximize2, Share2, Filter, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
interface DependencyGraphProps {
  dependencies: DependencyEdge[];
}
export function DependencyGraph({ dependencies }: DependencyGraphProps) {
  const graphId = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [graphType, setGraphType] = useState<GraphType>('module');
  const [isRendering, setIsRendering] = useState(false);
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#f59e0b',
        primaryTextColor: '#000',
        primaryBorderColor: '#f59e0b',
        lineColor: '#3d4a66',
        secondaryColor: '#10b981',
        tertiaryColor: '#00e5ff',
        mainBkg: 'transparent',
        nodeBorder: '#181e30',
        textColor: '#dde4f4'
      },
      securityLevel: 'loose',
      flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
    });
  }, []);
  useEffect(() => {
    const renderGraph = async () => {
      if (!containerRef.current || dependencies.length === 0) return;
      
      setIsRendering(true);
      containerRef.current.innerHTML = '';

      try {
        const sanitizeId = (path: string) => `node_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${graphId}`;
        let displayDeps = dependencies;
        if (graphType === 'package') {
          // Heuristic: aggregate by parent directory
          const map = new Map<string, DependencyEdge>();
          dependencies.forEach(d => {
            const src = d.source.split('/')[0];
            const trg = d.target.split('/')[0];
            if (src !== trg) {
              const key = `${src}->${trg}`;
              if (!map.has(key)) map.set(key, { source: src, target: trg, type: 'workspace' });
            }
          });
          displayDeps = Array.from(map.values());
        }
        const edges = displayDeps.slice(0, 60).map(edge => {
          const sourceId = sanitizeId(edge.source);
          const targetId = sanitizeId(edge.target);
          return `  ${sourceId}["${edge.source}"] --> ${targetId}["${edge.target}"]`;
        }).join('\n');
        const graphDefinition = `graph TD\n${edges}`;
        const { svg } = await mermaid.render(`render_${graphId}`, graphDefinition);
        
        if (containerRef.current) containerRef.current.innerHTML = svg;
        setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid error:', err);
      } finally {
        setIsRendering(false);
      }
    };
    renderGraph();
  }, [dependencies, graphType, graphId]);
  const copyRaw = () => {
    const sanitizeId = (path: string) => `node_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const edges = dependencies.map(edge => `  ${sanitizeId(edge.source)}["${edge.source}"] --> ${sanitizeId(edge.target)}["${edge.target}"]`).join('\n');
    navigator.clipboard.writeText(`graph TD\n${edges}`);
    toast.success('Mermaid code copied to clipboard');
  };
  if (dependencies.length === 0) return (
    <div className="flex flex-col items-center justify-center h-96 opacity-30 font-mono text-[10px] uppercase tracking-widest">
      No significant relationships detected.
    </div>
  );
  return (
    <div className="relative group p-6">
      {isRendering && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-[10px] font-mono uppercase tracking-widest">Generating_Topology...</span>
        </div>
      )}
      <div className="absolute top-4 right-4 flex gap-2 z-20">
        <ToggleGroup type="single" value={graphType} onValueChange={(v) => v && setGraphType(v as GraphType)} className="bg-black/40 border border-white/10 p-1">
          <ToggleGroupItem value="module" className="text-[8px] font-black tracking-widest px-2 h-7 uppercase">Module</ToggleGroupItem>
          <ToggleGroupItem value="package" className="text-[8px] font-black tracking-widest px-2 h-7 uppercase">Package</ToggleGroupItem>
        </ToggleGroup>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={copyRaw} title="Copy Raw Mermaid">
          <Copy className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => {}} title="Fullscreen">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="w-full flex justify-center overflow-x-auto min-h-[400px]">
        <div ref={containerRef} className="w-full flex justify-center" />
      </div>
    </div>
  );
}