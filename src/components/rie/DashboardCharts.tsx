import React from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { LanguageDetection, DependencyEdge, HeatmapNode } from '@/lib/rie-types';
import { cn } from '@/lib/utils';
const COLORS = ['#f59e0b', '#00e5ff', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];
export function LanguageDistributionChart({ languages }: { languages: LanguageDetection[] }) {
  const data = languages.slice(0, 6).map(l => ({
    name: l.language,
    value: l.fileCount
  }));
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" stroke="none">
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: '#0b0e18', border: '1px solid #181e30', fontSize: '10px', fontFamily: 'DM Mono' }}
          itemStyle={{ color: '#dde4f4' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
export function RiskRadarChart({ categories }: { categories: Record<string, number> }) {
  const data = Object.entries(categories).map(([key, value]) => ({
    subject: key.toUpperCase(),
    A: value,
    fullMark: 100
  }));
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
        <PolarGrid stroke="#181e30" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#dde4f4', fontSize: 7, fontFamily: 'DM Mono' }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar name="Health" dataKey="A" stroke="#00e5ff" fill="#00e5ff" fillOpacity={0.3} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
export function RiskHeatmap({ nodes }: { nodes: HeatmapNode[] }) {
  if (!nodes?.length) return <div className="flex items-center justify-center h-full opacity-20 text-[10px] uppercase font-mono">No risk nodes mapping...</div>;
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 p-2 w-full h-full content-start overflow-y-auto">
      {nodes.map((node, i) => (
        <div key={i} className="group relative aspect-square">
          <div 
            className={cn(
              "w-full h-full rounded-sm border border-white/5 transition-all cursor-crosshair",
              node.riskLevel === 'critical' ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.4)]' :
              node.riskLevel === 'high' ? 'bg-orange-500' :
              node.riskLevel === 'medium' ? 'bg-amber-400' : 'bg-emerald-500/40'
            )}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 glass border-primary/20 rounded hidden group-hover:block z-50 pointer-events-none">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary truncate mb-1">{node.path}</p>
            <div className="flex justify-between items-center text-[8px] font-mono uppercase opacity-60">
              <span>Risk: {node.riskScore}%</span>
              <span>Files: {node.fileCount}</span>
            </div>
            <div className="h-1 w-full bg-white/5 mt-2 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${node.riskScore}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export function FanInFanOutChart({ dependencies }: { dependencies: DependencyEdge[] }) {
  const nodeStats = new Map<string, { in: number; out: number }>();
  dependencies.forEach(d => {
    const s = nodeStats.get(d.source) || { in: 0, out: 0 };
    s.out++;
    nodeStats.set(d.source, s);
    const t = nodeStats.get(d.target) || { in: 0, out: 0 };
    t.in++;
    nodeStats.set(d.target, t);
  });
  const chartData = Array.from(nodeStats.entries())
    .map(([name, stats]) => ({
      name: name.split('/').pop() || name,
      weight: stats.in + stats.out
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  if (chartData.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" width={70} tick={{ fill: '#dde4f4', fontSize: 8, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
        <Bar dataKey="weight" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  );
}