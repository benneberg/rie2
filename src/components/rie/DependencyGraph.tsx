import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { DependencyEdge } from '@/lib/rie-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
interface DependencyGraphProps {
  dependencies: DependencyEdge[];
}
export function DependencyGraph({ dependencies }: DependencyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  }, []);
  useEffect(() => {
    if (containerRef.current && dependencies.length > 0) {
      // Create mermaid graph definition
      // Limited to first 30 relationships to prevent browser hang
      const edges = dependencies.slice(0, 30).map(edge => {
        const source = edge.source.replace(/\//g, '_').replace(/\./g, '_');
        const target = edge.target.replace(/\//g, '_').replace(/\./g, '_');
        return `  ${source}["${edge.source}"] --> ${target}["${edge.target}"]`;
      }).join('\n');
      const graphDefinition = `graph TD\n${edges}`;
      try {
        containerRef.current.innerHTML = `<div class="mermaid">${graphDefinition}</div>`;
        mermaid.contentLoaded();
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }
  }, [dependencies]);
  if (dependencies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-secondary/20 rounded-lg border border-dashed">
        <p className="text-muted-foreground">No significant file dependencies detected.</p>
      </div>
    );
  }
  return (
    <div className="w-full overflow-hidden rounded-lg bg-card/50 backdrop-blur-sm border border-border p-4">
      <div ref={containerRef} className="w-full flex justify-center overflow-x-auto min-h-[400px]" />
      <p className="text-2xs text-center text-muted-foreground mt-4">
        Showing top {Math.min(30, dependencies.length)} architectural relationships
      </p>
    </div>
  );
}