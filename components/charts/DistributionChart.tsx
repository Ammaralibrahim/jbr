'use client';

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

interface DistributionChartProps {
  data: Array<{
    unitCode: string;
    totalGeneration: number;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export function DistributionChart({ data }: DistributionChartProps) {
  const chartData = data.map((unit) => ({
    name: unit.unitCode,
    value: unit.totalGeneration,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.name} (${((entry.value / total) * 100).toFixed(1)}%)`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}