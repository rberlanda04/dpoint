import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface WorkerStatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; label: string };
  loading?: boolean;
}

export default function WorkerStatsCard({ label, value, icon: Icon, color, trend, loading }: WorkerStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 hover:shadow-md hover:border-slate-300 transition-all duration-200"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
          {loading ? (
            <div className="h-8 bg-slate-100 rounded w-24 mt-1 animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          )}
          {trend && !loading && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`text-xs font-semibold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );
}