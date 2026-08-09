import React from 'react';
import { LucideIcon } from 'lucide-react';
import GridLineCard from './GridLineCard';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function ChartCard({ title, subtitle, icon: Icon, action, children, className = '' }: ChartCardProps) {
  return (
    <GridLineCard padding="none" className={className}>
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-600" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
              {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      </div>
      <div className="p-5 pt-3">
        {children}
      </div>
    </GridLineCard>
  );
}
