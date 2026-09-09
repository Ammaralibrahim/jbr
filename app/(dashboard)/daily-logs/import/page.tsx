'use client';

import { useRouter } from 'next/navigation';
import ExcelImport from '@/components/ui/ExcelImport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileSpreadsheet } from 'lucide-react';

export default function ImportExcelPage() {
  const router = useRouter();

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-green-600" />
            استيراد من Excel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            استيراد البيانات اليومية من ملف Excel
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowRight className="h-4 w-4 ml-2" />
          رجوع
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">رفع الملف</CardTitle>
        </CardHeader>
        <CardContent>
          <ExcelImport
            onSuccess={() => {
              setTimeout(() => router.push('/daily-logs'), 2000);
            }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm">تعليمات</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>• يجب أن يحتوي الملف على صفحات بأسماء: ST1, ST2, ST3, GT1, GT2, GT3, GT4</li>
            <li>• التاريخ يجب أن يكون بصيغة DD/MM/YYYY</li>
            <li>• الأعمدة يجب أن تكون بالترتيب الصحيح</li>
            <li>• السجلات الموجودة سيتم تحديثها تلقائياً</li>
            <li>• السجلات الجديدة سيتم إنشاؤها تلقائياً</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}