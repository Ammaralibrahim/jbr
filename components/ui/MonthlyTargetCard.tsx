'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Target, Loader2, Save, Edit, Trash2, X, TrendingUp,
  TrendingDown, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MonthlyTargetCardProps {
  year: number;
  month: number;
  actualGeneration?: number;
  onTargetSaved?: () => void;
}

export default function MonthlyTargetCard({ year, month, actualGeneration = 0, onTargetSaved }: MonthlyTargetCardProps) {
  const [target, setTarget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const [notes, setNotes] = useState('');

  const fetchTarget = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monthly-target?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setTarget(data.target);
        if (data.target) {
          setTargetValue(data.target.targetGeneration.toString());
          setNotes(data.target.notes || '');
        }
      }
    } catch {
      // Sessiz hata
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchTarget();
  }, [fetchTarget]);

  const handleSave = async () => {
    const value = Number(targetValue);
    if (!value || value <= 0) {
      toast.error('يرجى إدخال هدف صحيح');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/monthly-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, targetGeneration: value, notes }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTarget(data.target);
        setIsEditing(false);
        toast.success(data.message || 'تم حفظ الهدف');
        onTargetSaved?.();
      } else {
        throw new Error(data.error || 'فشل في الحفظ');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في الحفظ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/monthly-target?year=${year}&month=${month}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTarget(null);
        setShowDeleteConfirm(false);
        setTargetValue('');
        setNotes('');
        toast.success('تم حذف الهدف');
        onTargetSaved?.();
      } else {
        throw new Error(data.error || 'فشل في الحذف');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في الحذف');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  const progress = target ? Math.min(100, (actualGeneration / target.targetGeneration) * 100) : 0;
  const isAchieved = target && actualGeneration >= target.targetGeneration;
  const remaining = target ? Math.max(0, target.targetGeneration - actualGeneration) : 0;

  if (isEditing) {
    return (
      <Card className="shadow-sm border-blue-200 dark:border-blue-700">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-1">
              <Target className="h-4 w-4 text-blue-500" />
              تحديد هدف الشهر
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">الهدف (MWh)</label>
            <Input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="مثال: 50000"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">ملاحظات</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات إضافية..."
              className="h-16 text-sm"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Save className="h-3.5 w-3.5 ml-1" />}
              حفظ
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsEditing(false)}>
              إلغاء
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!target) {
    return (
      <Card className="shadow-sm border-dashed border-2">
        <CardContent className="p-4 text-center">
          <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-semibold mb-1">لا يوجد هدف لهذا الشهر</p>
          <p className="text-xs text-muted-foreground mb-3">قم بتحديد هدف للإنتاج الشهري</p>
          <Button size="sm" className="h-7 text-xs" onClick={() => setIsEditing(true)}>
            <Target className="h-3.5 w-3.5 ml-1" />
            تحديد هدف
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'shadow-sm border-2',
      isAchieved ? 'border-green-300 dark:border-green-700' : 'border-blue-200 dark:border-blue-700'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center',
              isAchieved ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
            )}>
              {isAchieved ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Target className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold">هدف الشهر</p>
              <p className="text-xs text-muted-foreground">
                {target.targetGeneration.toLocaleString('en')} MWh
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* İlerleme */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">الإنجاز</span>
            <span className={cn('font-bold', isAchieved ? 'text-green-600' : 'text-blue-600')}>
              {progress.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress} className={cn('h-2.5', isAchieved && '[&>div]:bg-green-500')} />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              الفعلي: <strong className="text-foreground">{actualGeneration.toLocaleString('en')} MWh</strong>
            </span>
            {isAchieved ? (
              <span className="text-green-600 font-semibold flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                تم تحقيق الهدف
              </span>
            ) : (
              <span className="text-orange-600 font-semibold">
                متبقي: {remaining.toLocaleString('en')} MWh
              </span>
            )}
          </div>
        </div>

        {target.notes && (
          <p className="text-xs text-muted-foreground mt-2 border-t pt-2">{target.notes}</p>
        )}
      </CardContent>

      {/* Silme Onayı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-5 max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
            <p className="text-sm text-center mb-4">حذف هدف هذا الشهر؟</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setShowDeleteConfirm(false)}>إلغاء</Button>
              <Button variant="destructive" size="sm" className="flex-1 h-7 text-xs" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin ml-1" /> : <Trash2 className="h-3 w-3 ml-1" />}
                حذف
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}