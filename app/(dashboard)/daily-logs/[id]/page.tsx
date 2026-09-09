'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DailyDataForm from '@/components/ui/DailyDataForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowRight, Trash2, AlertTriangle, X, Calendar, Clock, Zap, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export default function EditDailyLogPage() {
  const params = useParams();
  const router = useRouter();
  const [log, setLog] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [logResponse, unitsResponse] = await Promise.all([
        fetch(`/api/daily-logs/${params.id}`),
        fetch('/api/units'),
      ]);

      if (logResponse.ok && unitsResponse.ok) {
        const logData = await logResponse.json();
        const unitsData = await unitsResponse.json();
        setLog(logData.dailyLog);
        setUnits(unitsData.units);
      } else {
        toast.error('فشل في تحميل البيانات');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('فشل في تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/daily-logs/${params.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('تم حذف السجل بنجاح');
        router.push('/daily-logs');
        router.refresh();
      } else {
        throw new Error(data.error || 'فشل في الحذف');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في حذف السجل');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-bold">السجل غير موجود</h2>
          <p className="text-muted-foreground">لم يتم العثور على هذا السجل</p>
          <Button onClick={() => router.push('/daily-logs')}>
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة للسجلات
          </Button>
        </div>
      </div>
    );
  }

  // Form için başlangıç verilerini hazırla
  const initialData = {
    _id: log._id,
    unitId: log.unitId?._id || log.unitId,
    date: new Date(log.date).toISOString().split('T')[0],
    operatingHours: log.operatingHours || 0,
    pMax: log.pMax || 0,
    pMin: log.pMin || 0,
    qMax: log.qMax || 0,
    qMin: log.qMin || 0,
    generatorStart: log.generatorStart || 0,
    generatorEnd: log.generatorEnd || 0,
    bt01Start: log.bt01Start || 0,
    bt01End: log.bt01End || 0,
    bt02Start: log.bt02Start || 0,
    bt02End: log.bt02End || 0,
    bl01Start: log.bl01Start || 0,
    bl01End: log.bl01End || 0,
    bm01Start: log.bm01Start || 0,
    bm01End: log.bm01End || 0,
    excitationStart: log.excitationStart || 0,
    excitationEnd: log.excitationEnd || 0,
    reactiveStart: log.reactiveStart || 0,
    reactiveEnd: log.reactiveEnd || 0,
    ambientTemperature: log.ambientTemperature || 25,
    heatConsumption: log.heatConsumption || 0,
    notes: log.notes || '',
  };

  return (
    <div className="space-y-5 max-w-full">
      {/* Üst Bilgi Barı */}
      <Card className="shadow-sm border-0 bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/daily-logs')}
                className="h-9 w-9 rounded-full hover:bg-white/50 dark:hover:bg-gray-700"
                title="رجوع"
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <h1 className="text-xl font-bold">تعديل السجل اليومي</h1>
                  <Badge variant="outline" className="text-xs">
                    {log.unitId?.unitCode || 'غير معروف'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(log.date), 'dd MMMM yyyy', { locale: ar })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {log.operatingHours} ساعة
                  </span>
                  <span className="flex items-center gap-1 text-blue-600">
                    <Zap className="h-3 w-3" />
                    {log.totalGeneration?.toFixed(2)} م.و.سا
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-9"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              حذف السجل
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Form - New sayfası ile aynı DailyDataForm kullanılır */}
      <DailyDataForm
        units={units}
        initialData={initialData}
        isEditing={true}
        onSuccess={() => {
          toast.success('تم تحديث السجل بنجاح');
          router.push('/daily-logs');
          router.refresh();
        }}
      />

      {/* Silme Onay Modalı */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">حذف السجل</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                هل أنت متأكد من حذف هذا السجل؟
                <br />
                <span className="font-semibold text-foreground">
                  {log.unitId?.unitCode} - {format(new Date(log.date), 'dd/MM/yyyy', { locale: ar })}
                </span>
                <br />
                لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      جاري الحذف...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 ml-2" />
                      تأكيد الحذف
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}