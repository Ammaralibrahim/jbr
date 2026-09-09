import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  trend?: string;
  description?: string;
}

const colorStyles = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500 to-blue-600',
  },
  green: {
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
    gradient: 'from-green-500 to-green-600',
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-900',
    iconColor: 'text-orange-600 dark:text-orange-400',
    gradient: 'from-orange-500 to-orange-600',
  },
  purple: {
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
  },
  red: {
    iconBg: 'bg-red-100 dark:bg-red-900',
    iconColor: 'text-red-600 dark:text-red-400',
    gradient: 'from-red-500 to-red-600',
  },
};

export function StatCard({ title, value, icon: Icon, color = 'blue', trend, description }: StatCardProps) {
  const styles = colorStyles[color];
  const isPositive = trend?.startsWith('+');

  return (
    <Card className="overflow-hidden">
      <div className={cn('h-1 bg-gradient-to-r', styles.gradient)} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                {isPositive ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', styles.iconBg)}>
            <Icon className={cn('h-6 w-6', styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}