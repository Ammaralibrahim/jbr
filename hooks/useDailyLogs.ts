'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useDailyLogs(params?: {
  unitId?: string;
  date?: string;
  year?: number;
  month?: number;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.unitId) queryParams.append('unitId', params.unitId);
      if (params?.date) queryParams.append('date', params.date);
      if (params?.year) queryParams.append('year', params.year.toString());
      if (params?.month) queryParams.append('month', params.month.toString());

      const response = await fetch(`/api/daily-logs?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch daily logs');
      }

      const data = await response.json();
      setLogs(data.dailyLogs);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('فشل في تحميل السجلات');
    } finally {
      setIsLoading(false);
    }
  }, [params?.unitId, params?.date, params?.year, params?.month]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const createLog = async (data: any) => {
    try {
      const response = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create daily log');
      }

      toast.success('تم إنشاء السجل بنجاح');
      await fetchLogs();
      return true;
    } catch (error) {
      toast.error('فشل في إنشاء السجل');
      return false;
    }
  };

  const updateLog = async (id: string, data: any) => {
    try {
      const response = await fetch(`/api/daily-logs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update daily log');
      }

      toast.success('تم تحديث السجل بنجاح');
      await fetchLogs();
      return true;
    } catch (error) {
      toast.error('فشل في تحديث السجل');
      return false;
    }
  };

  const deleteLog = async (id: string) => {
    try {
      const response = await fetch(`/api/daily-logs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete daily log');
      }

      toast.success('تم حذف السجل بنجاح');
      await fetchLogs();
      return true;
    } catch (error) {
      toast.error('فشل في حذف السجل');
      return false;
    }
  };

  return {
    logs,
    isLoading,
    error,
    fetchLogs,
    createLog,
    updateLog,
    deleteLog,
  };
}