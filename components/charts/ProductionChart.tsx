'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ProductionChartProps {
  data: Array<{
    unitCode: string;
    totalGeneration: number;
    totalBT01Consumption: number;
    totalBT02Consumption: number;
    totalBL01Consumption: number;
  }>;
}

export function ProductionChart({ data }: ProductionChartProps) {
  const chartData = data.map((unit) => ({
    name: unit.unitCode,
    الإنتاج: unit.totalGeneration,
    'استهلاك BT01': unit.totalBT01Consumption,
    'استهلاك BT02': unit.totalBT02Consumption,
    'استهلاك BL01': unit.totalBL01Consumption,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="الإنتاج" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        <Bar dataKey="استهلاك BT01" fill="#f59e0b" radius={[8, 8, 0, 0]} />
        <Bar dataKey="استهلاك BT02" fill="#ef4444" radius={[8, 8, 0, 0]} />
        <Bar dataKey="استهلاك BL01" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}