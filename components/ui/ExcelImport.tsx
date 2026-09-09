'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Download,
  Info,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
  details: Array<{
    sheet: string;
    date: string;
    action: string;
  }>;
}

interface ExcelImportProps {
  onSuccess?: () => void;
}

export default function ExcelImport({ onSuccess }: ExcelImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showResult, setShowResult] = useState(false);
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
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const downloadTemplate = () => {
    const templateData = [
      ['اليوم', 'عدد ساعات العمل', 'P max', 'P min', 'Q max', 'Q min', 'عداد بداية', 'عداد نهاية', 'الإنتاج', 'BT01 بداية', 'BT01 نهاية', 'BT02 بداية', 'BT02 نهاية', 'BL01 بداية', 'BL01 نهاية', 'BM01 بداية', 'BM01 نهاية', 'تهييج بداية', 'تهييج نهاية', 'ردي بداية', 'ردي نهاية'],
      ['01/08/2026', 24, 150, 50, 80, 20, 12500, 12815, '', 450, 455.5, 320, 324.8, 580, 585.2, 400, 403.5, 100, 102.5, 200, 205],
      ['02/08/2026', 24, 148, 52, 78, 22, 12815, 13130, '', 455.5, 461, 324.8, 329.5, 585.2, 590.5, 403.5, 407, 102.5, 105, 205, 210],
      ['03/08/2026', 24, 150, 50, 80, 20, 13130, 13445, '', 461, 466.5, 329.5, 334.2, 590.5, 595.8, 407, 410.5, 105, 107.5, 210, 215],
    ];

    const csv = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('تم تحميل القالب');
  };

  return (
    <div className="space-y-3">
      {/* Yükleme Alanı */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300',
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 scale-105'
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            e.target.value = '';
          }}
        />

        {isImporting ? (
          <div className="space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
            <div>
              <p className="font-semibold text-sm">جاري استيراد البيانات...</p>
              <p className="text-xs text-muted-foreground mt-1">
                يرجى الانتظار، قد يستغرق هذا بعض الوقت
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">اسحب وأفلت ملف Excel هنا</p>
              <p className="text-xs text-muted-foreground mt-1">
                أو انقر لاختيار ملف (.xlsx أو .xls)
              </p>
            </div>
            <div className="flex justify-center gap-1 flex-wrap">
              {['ST1', 'ST2', 'ST3', 'GT1', 'GT2', 'GT3', 'GT4'].map(code => (
                <Badge key={code} variant="outline" className="text-[9px] h-4">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Şablon */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-xs" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 ml-1" />
          تحميل قالب
        </Button>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Info className="h-3 w-3" />
          التاريخ: DD/MM/YYYY
        </div>
      </div>

      {/* Sonuç */}
      {showResult && result && (
        <Card className="shadow-sm border-0 bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                نتيجة الاستيراد
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowResult(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center border border-green-200 dark:border-green-700">
                <p className="text-xl font-bold text-green-600">{result.imported}</p>
                <p className="text-[9px] text-muted-foreground">سجلات جديدة</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-700">
                <p className="text-xl font-bold text-blue-600">{result.updated}</p>
                <p className="text-[9px] text-muted-foreground">سجلات محدثة</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/30 rounded-lg p-3 text-center border border-red-200 dark:border-red-700">
                <p className="text-xl font-bold text-red-600">{result.errors.length}</p>
                <p className="text-[9px] text-muted-foreground">أخطاء</p>
              </div>
            </div>

            {result.details.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                <p className="text-[10px] font-bold text-muted-foreground">التفاصيل:</p>
                {result.details.map((detail, index) => (
                  <div key={index} className="flex items-center gap-1.5 text-[10px]">
                    {detail.action === 'created' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    ) : detail.action === 'updated' ? (
                      <RefreshCw className="h-3 w-3 text-blue-500 shrink-0" />
                    ) : (
                      <Info className="h-3 w-3 text-gray-400 shrink-0" />
                    )}
                    <span className="font-semibold">{detail.sheet}</span>
                    {detail.date && <span className="text-muted-foreground">{detail.date}</span>}
                    <span className="text-muted-foreground">
                      {detail.action === 'created' ? 'تم الإنشاء' : detail.action === 'updated' ? 'تم التحديث' : detail.action}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="max-h-32 overflow-y-auto space-y-1">
                <p className="text-[10px] font-bold text-red-600">الأخطاء:</p>
                {result.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-1.5 text-[10px] text-red-600">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{error}</span>
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