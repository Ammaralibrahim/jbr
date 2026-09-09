'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useUnits() {
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/units');
      if (!response.ok) {
        throw new Error('Failed to fetch units');
      }

      const data = await response.json();
      setUnits(data.units);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('فشل في تحميل الوحدات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  return {
    units,
    isLoading,
    error,
    fetchUnits,
  };
}