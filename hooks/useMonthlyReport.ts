'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useMonthlyReport(year: number, month: number) {
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/monthly-report?year=${year}&month=${month}`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly report');
      }

      const data = await response.json();
      setReport(data.report);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('فشل في تحميل التقرير الشهري');
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const saveReport = async () => {
    try {
      const response = await fetch('/api/monthly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });

      if (!response.ok) {
        throw new Error('Failed to save report');
      }

      toast.success('تم حفظ التقرير بنجاح');
      return true;
    } catch (error) {
      toast.error('فشل في حفظ التقرير');
      return false;
    }
  };

  return {
    report,
    isLoading,
    error,
    fetchReport,
    saveReport,
  };
}