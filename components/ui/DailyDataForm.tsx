'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator, Calendar, Clock, Gauge, Info, Loader2, Save,
  Thermometer, TrendingUp, Zap, FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Isı alanı kaldırıldı
const dailyLogSchema = z.object({
  unitId: z.string().min(1, 'الوحدة مطلوبة'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  operatingHours: z.number().min(0).max(24),
  pMax: z.number().min(0),
  pMin: z.number().min(0),
  qMax: z.number().min(0),
  qMin: z.number().min(0),
  generatorStart: z.number().min(0),
  generatorEnd: z.number().min(0),
  bt01Start: z.number().min(0).default(0),
  bt01End: z.number().min(0).default(0),
  bt02Start: z.number().min(0).default(0),
  bt02End: z.number().min(0).default(0),
  bl01Start: z.number().min(0).default(0),
  bl01End: z.number().min(0).default(0),
  bm01Start: z.number().min(0).default(0),
  bm01End: z.number().min(0).default(0),
  excitationStart: z.number().min(0).default(0),
  excitationEnd: z.number().min(0).default(0),
  reactiveStart: z.number().min(0).default(0),
  reactiveEnd: z.number().min(0).default(0),
  ambientTemperature: z.number(),
  notes: z.string().optional(),
});

type DailyLogFormData = z.infer<typeof dailyLogSchema>;

interface Unit {
  _id: string;
  unitCode: string;
  unitNameAr: string;
  unitType: 'Steam' | 'Gas';
  capacityMW: number;
  multiplier: number;
}

interface DailyDataFormProps {
  units: Unit[];
  onSuccess?: () => void;
  initialData?: DailyLogFormData & { _id?: string };
  isEditing?: boolean;
}

export default function DailyDataForm({ 
  units, onSuccess, initialData, isEditing = false 
}: DailyDataFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [totalGeneration, setTotalGeneration] = useState<number | null>(null);
  const [netGeneration, setNetGeneration] = useState<number | null>(null);
  const [bt01Consumption, setBT01Consumption] = useState<number | null>(null);
  const [bt02Consumption, setBT02Consumption] = useState<number | null>(null);
  const [bl01Consumption, setBL01Consumption] = useState<number | null>(null);
  const [bm01Consumption, setBM01Consumption] = useState<number | null>(null);
  const [excitationConsumption, setExcitationConsumption] = useState<number | null>(null);
  const [totalConsumption, setTotalConsumption] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register, handleSubmit, control, watch,
    formState: { errors, isDirty },
  } = useForm<DailyLogFormData>({
    resolver: zodResolver(dailyLogSchema),
    defaultValues: initialData || {
      date: new Date().toISOString().split('T')[0],
      operatingHours: 24,
      pMax: 0, pMin: 0, qMax: 0, qMin: 0,
      generatorStart: 0, generatorEnd: 0,
      bt01Start: 0, bt01End: 0,
      bt02Start: 0, bt02End: 0,
      bl01Start: 0, bl01End: 0,
      bm01Start: 0, bm01End: 0,
      excitationStart: 0, excitationEnd: 0,
      reactiveStart: 0, reactiveEnd: 0,
      ambientTemperature: 25,
    },
  });

  const watchFields = watch();

  useEffect(() => {
    const unit = units.find(u => u._id === watchFields.unitId);
    setSelectedUnit(unit || null);
  }, [watchFields.unitId, units]);

  useEffect(() => {
    if (!selectedUnit) return;
    const totalGen = Math.max(0, (watchFields.generatorEnd - watchFields.generatorStart) * selectedUnit.multiplier);
    const bt01Cons = Math.max(0, watchFields.bt01End - watchFields.bt01Start);
    const bt02Cons = Math.max(0, watchFields.bt02End - watchFields.bt02Start);
    const bl01Cons = Math.max(0, watchFields.bl01End - watchFields.bl01Start);
    const bm01Cons = Math.max(0, watchFields.bm01End - watchFields.bm01Start);
    const excCons = Math.max(0, watchFields.excitationEnd - watchFields.excitationStart);
    const totalCons = bt01Cons + bt02Cons + bl01Cons + bm01Cons + excCons;
    const netGen = Math.max(0, totalGen - totalCons);

    setTotalGeneration(totalGen);
    setBT01Consumption(bt01Cons);
    setBT02Consumption(bt02Cons);
    setBL01Consumption(bl01Cons);
    setBM01Consumption(bm01Cons);
    setExcitationConsumption(excCons);
    setTotalConsumption(totalCons);
    setNetGeneration(netGen);
  }, [watchFields, selectedUnit]);

  const onSubmit = async (data: DailyLogFormData) => {
    setIsSubmitting(true);
    try {
      const url = isEditing && initialData?._id 
        ? `/api/daily-logs/${initialData._id}` 
        : '/api/daily-logs';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const text = await response.text();
      let result;
      try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }

      if (!response.ok) {
        throw new Error(result.error || 'فشل في حفظ السجل');
      }

      toast.success(isEditing ? 'تم تحديث السجل بنجاح' : 'تم إنشاء السجل بنجاح');
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في حفظ السجل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClassName = "mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all";
  const labelClassName = "text-sm font-semibold text-gray-700 dark:text-gray-300";
  const sectionClassName = "bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="border-2 shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-l from-blue-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-7 w-7" />
            <div>
              <CardTitle className="text-xl font-bold">
                {isEditing ? 'تعديل التقرير اليومي' : 'التقرير اليومي'}
              </CardTitle>
              <CardDescription className="text-blue-100">
                {isEditing ? 'قم بتعديل البيانات ثم احفظ' : 'نموذج إدخال البيانات اليومية'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 space-y-4">
          {/* Temel Bilgiler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className={labelClassName}>الوحدة *</Label>
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(inputClassName, errors.unitId && "border-red-500")}>
                      <SelectValue placeholder="اختر الوحدة" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit._id} value={unit._id}>
                          <span className="flex items-center gap-2">
                            <Badge variant={unit.unitType === 'Steam' ? 'default' : 'secondary'}>
                              {unit.unitCode}
                            </Badge>
                            {unit.unitNameAr}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div>
              <Label className={labelClassName}><Calendar className="h-3.5 w-3.5 inline ml-1" />اليوم *</Label>
              <Input type="date" className={inputClassName} {...register('date')} />
            </div>

            <div>
              <Label className={labelClassName}><Clock className="h-3.5 w-3.5 inline ml-1" />ساعات العمل *</Label>
              <Input type="number" step="0.5" min="0" max="24" className={inputClassName} {...register('operatingHours', { valueAsNumber: true })} />
            </div>

            <div>
              <Label className={labelClassName}><Thermometer className="h-3.5 w-3.5 inline ml-1" />درجة الحرارة °C</Label>
              <Input type="number" step="0.1" className={inputClassName} {...register('ambientTemperature', { valueAsNumber: true })} />
            </div>
          </div>

          {selectedUnit && (
            <Alert className="bg-blue-50 dark:bg-blue-900/30 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-sm">{selectedUnit.unitCode} - {selectedUnit.unitNameAr}</AlertTitle>
              <AlertDescription className="text-xs">
                السعة: {selectedUnit.capacityMW} MW | المعامل: {selectedUnit.multiplier}
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Sekmeler */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <TabsTrigger value="basic" className="text-xs rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <Gauge className="h-3.5 w-3.5 ml-1" />القدرة
              </TabsTrigger>
              <TabsTrigger value="generator" className="text-xs rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <Zap className="h-3.5 w-3.5 ml-1" />المولد
              </TabsTrigger>
              <TabsTrigger value="transformers" className="text-xs rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">
                <Calculator className="h-3.5 w-3.5 ml-1" />المحولات
              </TabsTrigger>
            </TabsList>

            {/* Güç Değerleri */}
            <TabsContent value="basic" className="space-y-3 mt-3">
              <div className={sectionClassName}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1"><Gauge className="h-4 w-4 text-blue-600" />قيم القدرة</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs font-semibold">P max (MW)</Label><Input type="number" step="0.1" className={inputClassName} {...register('pMax', { valueAsNumber: true })} /></div>
                  <div><Label className="text-xs font-semibold">P min (MW)</Label><Input type="number" step="0.1" className={inputClassName} {...register('pMin', { valueAsNumber: true })} /></div>
                  <div><Label className="text-xs font-semibold">Q max (MVAr)</Label><Input type="number" step="0.1" className={inputClassName} {...register('qMax', { valueAsNumber: true })} /></div>
                  <div><Label className="text-xs font-semibold">Q min (MVAr)</Label><Input type="number" step="0.1" className={inputClassName} {...register('qMin', { valueAsNumber: true })} /></div>
                </div>
              </div>
            </TabsContent>

            {/* Jeneratör */}
            <TabsContent value="generator" className="space-y-3 mt-3">
              <div className={sectionClassName}>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1"><Zap className="h-4 w-4 text-yellow-600" />عداد خرج المنوبة</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold">بداية اليوم</Label><Input type="number" step="0.1" className={inputClassName} {...register('generatorStart', { valueAsNumber: true })} /></div>
                  <div><Label className="text-xs font-semibold">نهاية اليوم</Label><Input type="number" step="0.1" className={inputClassName} {...register('generatorEnd', { valueAsNumber: true })} /></div>
                </div>
                {totalGeneration !== null && (
                  <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">الإنتاج الكهربائي الكلي</span>
                      <span className="text-lg font-bold text-yellow-600">{totalGeneration.toFixed(2)} م.و.سا</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Transformatörler */}
            <TabsContent value="transformers" className="space-y-3 mt-3">
              <div className={sectionClassName}>
                <h3 className="text-sm font-bold mb-3">محولة الاستهلاك الذاتي</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200">
                    <Label className="text-xs font-bold text-blue-600 block mb-2">BT01</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">بداية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bt01Start', { valueAsNumber: true })} /></div>
                      <div><Label className="text-[10px] text-muted-foreground">نهاية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bt01End', { valueAsNumber: true })} /></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200">
                    <Label className="text-xs font-bold text-blue-600 block mb-2">BT02</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">بداية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bt02Start', { valueAsNumber: true })} /></div>
                      <div><Label className="text-[10px] text-muted-foreground">نهاية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bt02End', { valueAsNumber: true })} /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={sectionClassName}>
                <h3 className="text-sm font-bold mb-3">محولة اقلاعية</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200">
                    <Label className="text-xs font-bold text-orange-600 block mb-2">BL01</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">بداية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bl01Start', { valueAsNumber: true })} /></div>
                      <div><Label className="text-[10px] text-muted-foreground">نهاية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bl01End', { valueAsNumber: true })} /></div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-orange-200">
                    <Label className="text-xs font-bold text-orange-600 block mb-2">BM01</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label className="text-[10px] text-muted-foreground">بداية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bm01Start', { valueAsNumber: true })} /></div>
                      <div><Label className="text-[10px] text-muted-foreground">نهاية</Label><Input type="number" step="0.1" className={inputClassName} {...register('bm01End', { valueAsNumber: true })} /></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={sectionClassName}>
                <h3 className="text-sm font-bold mb-3">استهلاك محولة التهييج</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold">بداية اليوم</Label><Input type="number" step="0.1" className={inputClassName} {...register('excitationStart', { valueAsNumber: true })} /></div>
                  <div><Label className="text-xs font-semibold">نهاية اليوم</Label><Input type="number" step="0.1" className={inputClassName} {...register('excitationEnd', { valueAsNumber: true })} /></div>
                </div>
              </div>

              <div className={sectionClassName}>
                <h3 className="text-sm font-bold mb-3">الإنتاج الردي</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs font-semibold">بداية (م.فار.سا)</Label><Input type="number" step="0.1" className={inputClassName} {...register('reactiveStart', { valueAsNumber: true })} /></div>
                  <div><Label className="text-xs font-semibold">نهاية (م.فار.سا)</Label><Input type="number" step="0.1" className={inputClassName} {...register('reactiveEnd', { valueAsNumber: true })} /></div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Özet */}
          {selectedUnit && totalGeneration !== null && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl p-3 border border-blue-200">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ملخص الحسابات
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-[9px] text-muted-foreground">الإنتاج</p>
                  <p className="text-sm font-bold text-blue-600">{totalGeneration.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-[9px] text-muted-foreground">الاستهلاك</p>
                  <p className="text-sm font-bold text-orange-600">{totalConsumption?.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-[9px] text-muted-foreground">الصافي</p>
                  <p className="text-sm font-bold text-green-600">{netGeneration?.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <p className="text-[9px] text-muted-foreground">نسبة الصافي</p>
                  <p className="text-sm font-bold text-purple-600">
                    {totalGeneration > 0 ? ((netGeneration! / totalGeneration) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notlar */}
          <div>
            <Label className={labelClassName}>ملاحظات</Label>
            <Textarea placeholder="أي ملاحظات إضافية..." className={inputClassName} rows={2} {...register('notes')} />
          </div>
        </CardContent>
      </Card>

      {/* Kaydet */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin ml-2" />جاري الحفظ...</>
          ) : (
            <><Save className="h-4 w-4 ml-2" />{isEditing ? 'تحديث' : 'حفظ'}</>
          )}
        </Button>
      </div>
    </form>
  );
}