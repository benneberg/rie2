import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { LanguageDetection, DependencyEdge } from '@/lib/rie-types';
const COLORS = ['#f59e0b', '#00e5ff', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];
export function LanguageDistributionChart({ languages }: { languages: LanguageDetection[] }) {
  const data = languages.slice(0, 6).map(l => ({
    name: l.language,
    value: l.fileCount
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry, index) => (
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
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="#181e30" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#dde4f4', fontSize: 8, fontFamily: 'DM Mono' }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          name="Health"
          dataKey="A"
          stroke="#00e5ff"
          fill="#00e5ff"
          fillOpacity={0.3}
        />
      </RadarChart>
    </ResponsiveContainer>
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
  const data = Array.from(nodeStats.entries())
    .map(([name, stats]) => ({
      name: name.split('/').pop() || name,
      weight: stats.in + stats.out
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical">
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={80} 
          tick={{ fill: '#dde4f4', fontSize: 8, fontFamily: 'DM Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="weight" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}