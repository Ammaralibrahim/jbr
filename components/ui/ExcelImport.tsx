'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Loader2, FileSpreadsheet, CheckCircle2, AlertTriangle,
  X, Info, Calendar, Languages,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SheetSummary {
  sheet: string;
  unit: string;
  processed: number;
  skipped: number;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
  skippedDates: string[];
  detectedMonths: Record<string, number>;
  sheetSummary: SheetSummary[];
  dateFormatUsed: string;
}

interface ExcelImportProps {
  onSuccess?: () => void;
}

export default function ExcelImport({ onSuccess }: ExcelImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  // Tarih formatı: MDY (Ay/Gün/Yıl - Excel varsayılanı) veya DMY (Gün/Ay/Yıl)
  const [dateFormat, setDateFormat] = useState<'MDY' | 'DMY'>('MDY');

  const [filterByMonth, setFilterByMonth] = useState(false);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.xlsm'];
    const isValidFile = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidFile) {
      toast.error('يرجى اختيار ملف Excel صالح (.xlsx أو .xls)');
      return;
    }

    setIsImporting(true);
    setResult(null);
    setShowResult(false);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('dateFormat', dateFormat);

      if (filterByMonth) {
        formData.append('expectedMonth', String(filterMonth));
        formData.append('expectedYear', String(filterYear));
      }

      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.results);
        setShowResult(true);
        toast.success(data.message || 'تم الاستيراد بنجاح');
        onSuccess?.();
      } else {
        throw new Error(data.error || 'فشل في الاستيراد');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'فشل في الاستيراد');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [dateFormat, filterByMonth, filterMonth, filterYear]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  return (
    <div className="space-y-4">
      {/* Tarih Formatı */}
      <Card className="shadow-sm border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="h-4 w-4 text-purple-600" />
            <Label className="text-sm font-bold">تنسيق التاريخ في الملف</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDateFormat('MDY')}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                dateFormat === 'MDY'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              )}
            >
              <p className="text-sm font-bold">شهر / يوم / سنة</p>
              <p className="text-xs text-muted-foreground mt-1">9/1/2026 = 1 سبتمبر</p>
            </button>
            <button
              onClick={() => setDateFormat('DMY')}
              className={cn(
                'p-3 rounded-lg border-2 text-center transition-all',
                dateFormat === 'DMY'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              )}
            >
              <p className="text-sm font-bold">يوم / شهر / سنة</p>
              <p className="text-xs text-muted-foreground mt-1">1/9/2026 = 1 سبتمبر</p>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <Info className="h-3 w-3 text-purple-500" />
            معظم ملفات Excel العربية/الإنجليزية تستخدم شهر/يوم/سنة
          </p>
        </CardContent>
      </Card>

      {/* Ay Filtresi */}
      <Card className="shadow-sm border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="filterByMonth"
              checked={filterByMonth}
              onChange={(e) => setFilterByMonth(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="filterByMonth" className="text-sm font-medium cursor-pointer flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              تجاهل التواريخ خارج الشهر المحدد
            </Label>
          </div>
          {filterByMonth && (
            <div className="flex gap-2 items-center flex-wrap">
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                className="h-9 px-3 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                className="h-9 px-3 text-sm border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              >
                {monthNames.map((name, i) => (
                  <option key={i + 1} value={i + 1}>{name}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                قبول تواريخ {monthNames[filterMonth - 1]} {filterYear} فقط
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dosya Yükleme */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-blue-500 bg-blue-500 dark:bg-blue-900/20 scale-105'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-500'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelect(f);
            e.target.value = '';
          }}
        />
        {isImporting ? (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
            <p className="font-semibold text-sm">جاري استيراد البيانات...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">اسحب وأفلت ملف Excel هنا</p>
              <p className="text-xs text-muted-foreground mt-1">أو انقر لاختيار ملف (.xlsx أو .xls)</p>
            </div>
            <div className="flex justify-center gap-1 flex-wrap">
              {['ST1', 'ST2', 'ST3', 'GT1', 'GT2', 'GT3', 'GT4'].map(code => (
                <Badge key={code} variant="outline" className="text-[9px] h-4">{code}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sonuç */}
      {showResult && result && (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                نتيجة الاستيراد (تنسيق: {result.dateFormatUsed === 'MDY' ? 'شهر/يوم' : 'يوم/شهر'})
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowResult(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-600">{result.imported}</p>
                <p className="text-[10px] text-muted-foreground">سجلات جديدة</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-[10px] text-muted-foreground">سجلات محدثة</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg p-3 text-center border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
                <p className="text-[10px] text-muted-foreground">تم تجاهلها</p>
              </div>
            </div>

            {result.sheetSummary && result.sheetSummary.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs font-bold mb-2">تفاصيل الأوراق:</p>
                <div className="space-y-1">
                  {result.sheetSummary.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{s.unit}</span>
                      <span className="text-green-600">✓ {s.processed}</span>
                      {s.skipped > 0 && <span className="text-yellow-600">⊘ {s.skipped}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(result.detectedMonths).length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <p className="text-xs font-bold mb-2 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />الأشهر المستوردة:
                </p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(result.detectedMonths).map(([month, count]) => (
                    <Badge key={month} variant="outline" className="text-[10px]">
                      {month}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.skippedDates && result.skippedDates.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="text-xs font-bold text-yellow-700 mb-2">
                  التواريخ المتجاهلة ({result.skippedDates.length}):
                </p>
                <div className="space-y-0.5">
                  {result.skippedDates.slice(0, 20).map((sd, i) => (
                    <div key={i} className="text-[10px] text-yellow-700">• {sd}</div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-xs font-bold text-red-600 mb-2">الأخطاء:</p>
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}