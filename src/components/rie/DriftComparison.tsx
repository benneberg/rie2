import React from 'react';
import { motion } from 'framer-motion';
import { RepositoryMetadata } from '@/lib/rie-types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, ArrowRight, TrendingUp, TrendingDown, Minus, Plus, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
interface DriftComparisonProps {
  current: RepositoryMetadata;
  baseline?: RepositoryMetadata;
  onClose: () => void;
}
export function DriftComparison({ current, baseline, onClose }: DriftComparisonProps) {
  if (!baseline) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 glass border-dashed border-primary/20 text-center space-y-4">
        <h3 className="font-display font-black uppercase text-xl">Baseline_Required</h3>
        <p className="text-xs text-muted-foreground uppercase tracking-widest max-w-md mx-auto">
          No comparison baseline has been set for this repository. Mark the current state as a baseline to track future architectural drift.
        </p>
      </motion.div>
    );
  }
  const drift = current.drift;
  const categories = ['security', 'structure', 'consistency', 'completeness'];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="space-y-8 p-8 glass border-primary shadow-brutal-dark relative overflow-hidden"
    >
      <div className="absolute top-4 right-4">
        <button onClick={onClose} className="hover:text-primary transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <header className="flex items-center gap-4 mb-8">
        <div className="p-2 bg-primary/20 rounded">
          <TrendingUp className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-black uppercase tracking-tighter">Architectural_Drift_Analysis</h2>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Delta: {drift?.delta ?? 0}% • Snapshot Comparison</p>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50">Score_Variance</h3>
          <div className="grid grid-cols-1 gap-4">
            {categories.map(cat => {
              const currentVal = (current.validation?.categories as any)?.[cat] || 0;
              const baselineVal = (baseline.validation?.categories as any)?.[cat] || 0;
              const delta = currentVal - baselineVal;
              return (
                <div key={cat} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-lg">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{cat}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs opacity-30">{baselineVal}%</span>
                    <ArrowRight className="w-3 h-3 opacity-20" />
                    <span className="text-xs font-bold">{currentVal}%</span>
                    {delta !== 0 && (
                      <Badge className={cn("text-[9px]", delta > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400")}>
                        {delta > 0 ? '+' : ''}{delta}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/50">Structural_Changes</h3>
          <Card className="bg-black/40 border-white/5 shadow-inner">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase">Added</span>
                </div>
                <span className="font-stats text-xl text-emerald-500">{drift?.addedFiles || 0}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Minus className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-[10px] font-bold uppercase">Removed</span>
                </div>
                <span className="font-stats text-xl text-red-500">{drift?.removedFiles || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileCode className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[10px] font-bold uppercase">New_Deps</span>
                </div>
                <span className="font-stats text-xl text-cyan-500">{drift?.newDependencies || 0}</span>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <h4 className="text-[9px] font-black uppercase opacity-40">Regressions_Detected</h4>
            {drift?.regressions?.map((reg, i) => (
              <div key={i} className="text-[10px] font-mono text-red-400 bg-red-400/5 p-2 border-l border-red-500">
                ⚠️ {reg}
              </div>
            )) || <p className="text-[10px] opacity-20 italic">No regressions found.</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}