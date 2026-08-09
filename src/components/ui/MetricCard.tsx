import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import GridLineCard from './GridLineCard';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'indigo' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';
  suffix?: string;
}

const colorMap = {
  indigo: {
    iconBg: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    trendUp: 'text-emerald-600 bg-emerald-50',
    trendDown: 'text-rose-600 bg-rose-50',
    trendNeutral: 'text-slate-500 bg-slate-50',
  },
  emerald: {
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    trendUp: 'text-emerald-600 bg-emerald-50',
    trendDown: 'text-rose-600 bg-rose-50',
    trendNeutral: 'text-slate-500 bg-slate-50',
  },
  sky: {
    iconBg: 'bg-sky-50',
    iconText: 'text-sky-600',
    trendUp: 'text-emerald-600 bg-emerald-50',
    trendDown: 'text-rose-600 bg-rose-50',
    trendNeutral: 'text-slate-500 bg-slate-50',
  },
  amber: {
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    trendUp: 'text-emerald-600 bg-emerald-50',
    trendDown: 'text-rose-600 bg-rose-50',
    trendNeutral: 'text-slate-500 bg-slate-50',
  },
  rose: {
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    trendUp: 'text-emerald-600 bg-emerald-50',
    trendDown: 'text-rose-600 bg-rose-50',
    trendNeutral: 'text-slate-500 bg-slate-50',
  },
  violet: {
    iconBg: 'bg-violet-50',
    iconText: 'text-violet-600',
    trendUp: 'text-emerald-600 bg-emerald-50',
    trendDown: 'text-rose-600 bg-rose-50',
    trendNeutral: 'text-slate-500 bg-slate-50',
  },
};

function TrendBadge({ trend, colors }: { trend: MetricCardProps['trend']; colors: typeof colorMap.indigo }) {
  if (!trend) return null;

  const TrendIcon = trend.value > 0 ? TrendingUp : trend.value < 0 ? TrendingDown : Minus;
  const trendColor = trend.value > 0 ? colors.trendUp : trend.value < 0 ? colors.trendDown : colors.trendNeutral;

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${trendColor}`}>
      <TrendIcon className="w-3 h-3" />
      <span>{Math.abs(trend.value)}%</span>
      {trend.label && <span className="ml-0.5 opacity-70">{trend.label}</span>}
    </div>
  );
}

export default function MetricCard({ label, value, icon: Icon, trend, color = 'indigo', suffix }: MetricCardProps) {
  const colors = colorMap[color];

  return (
    <GridLineCard hover glow padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">{value}</p>
            {suffix && <span className="text-sm font-medium text-slate-400">{suffix}</span>}
          </div>
          {trend && (
            <div className="mt-2">
              <TrendBadge trend={trend} colors={colors} />
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.iconBg}`}>
          <Icon className={`w-5 h-5 ${colors.iconText}`} />
        </div>
      </div>
    </GridLineCard>
  );
}
