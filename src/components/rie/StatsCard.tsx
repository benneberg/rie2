import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
}
export function StatsCard({ label, value, icon, trend }: StatsCardProps) {
  return (
    <Card className="overflow-hidden bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
            {label}
          </p>
          <div className="p-2 bg-secondary rounded-lg text-primary">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">{value}</h2>
          {trend && (
            <p className="text-xs text-emerald-500 font-medium">
              {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}