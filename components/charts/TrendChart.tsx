'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TrendChartProps {
  data: Array<{
    date: Date;
    totalGeneration: number;
    averageAmbientTemperature: number;
  }>;
}

export function TrendChart({ data }: TrendChartProps) {
  const chartData = data.map((day) => ({
    name: format(new Date(day.date), 'dd MMM', { locale: ar }),
    'التوليد (MWh)': day.totalGeneration,
    'درجة الحرارة (°C)': day.averageAmbientTemperature,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="التوليد (MWh)"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="درجة الحرارة (°C)"
          stroke="#ef4444"
          fill="#ef4444"
          fillOpacity={0.1}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}