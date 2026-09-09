'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DailyDataForm from '@/components/ui/DailyDataForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function NewDailyLogPage() {
  const router = useRouter();
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units');
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units);
      }
    } catch (error) {
      toast.error('فشل في تحميل الوحدات');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إضافة سجل يومي جديد</h1>
        <p className="text-muted-foreground mt-1">
          أدخل بيانات الوحدة والعدادات
        </p>
      </div>
      <DailyDataForm
        units={units}
        onSuccess={() => {
          router.push('/daily-logs');
        }}
      />
    </div>
  );
}