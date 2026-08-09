import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card } from '../ui';

interface ChartDataPoint {
  data: string;
  horas: number;
  ganho: number;
}

interface WorkerChartAreaProps {
  data: ChartDataPoint[];
  height?: number;
  showGanho?: boolean;
  className?: string;
}

export function WorkerChartArea({ data, height = 200, showGanho = false, className = '' }: WorkerChartAreaProps) {
  const formattedData = data.map(d => ({
    ...d,
    dataLabel: new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
  }));

  return (
    <Card className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorGanho" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="dataLabel" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number, name: string) => [
              name === 'horas' ? `${value.toFixed(1)}h` : `R$ ${value.toFixed(2)}`,
              name === 'horas' ? 'Horas' : 'Ganho',
            ]}
            labelFormatter={(label) => label}
          />
          <Area
            type="monotone"
            dataKey="horas"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorHoras)"
          />
          {showGanho && (
            <Area
              type="monotone"
              dataKey="ganho"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorGanho)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface WorkerChartBarProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  className?: string;
  horizontal?: boolean;
}

export function WorkerChartBar({ data, height = 200, color = '#6366f1', className = '', horizontal = false }: WorkerChartBarProps) {
  if (horizontal) {
    return (
      <Card className={className}>
        <ResponsiveContainer width="100%" height={Math.max(height, data.length * 35)}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={140} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

interface WorkerChartPieProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  className?: string;
}

export function WorkerChartPie({ data, height = 200, className = '' }: WorkerChartPieProps) {
  const defaultColors = ['#10b981', '#6366f1', '#f59e0b', '#06b6d4', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

  return (
    <Card className={className}>
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={data[index].color || defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || defaultColors[index % defaultColors.length] }} />
            <span className="text-xs text-slate-500">{item.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface WorkerChartLineProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  className?: string;
}

export function WorkerChartLine({ data, height = 200, color = '#6366f1', className = '' }: WorkerChartLineProps) {
  return (
    <Card className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
            formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Ganho']}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}