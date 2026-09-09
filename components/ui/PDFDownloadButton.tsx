'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PDFDownloadButtonProps {
  year: number;
  month: number;
  report: any;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  label?: string;
}

export default function PDFDownloadButton({
  year,
  month,
  report,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'تحميل PDF',
}: PDFDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownload = async () => {
    if (!report || !report.units || !report.totalStats) {
      toast.error('لا توجد بيانات لإنشاء التقرير');
      return;
    }

    setIsDownloading(true);
    setIsDownloaded(false);

    try {
      const { totalStats, units } = report;

      const bestUnit = [...units].sort((a: any, b: any) => b.netGenerationRate - a.netGenerationRate)[0];
      const topProducer = [...units].sort((a: any, b: any) => b.totalGeneration - a.totalGeneration)[0];
      const worstUnit = [...units].sort((a: any, b: any) => a.netGenerationRate - b.netGenerationRate)[0];

      // HTML şablonu oluştur
      const templateHTML = `
        <div dir="rtl" style="width:1120px;min-height:800px;background:#fff;font-family:Arial,sans-serif;padding:30px;direction:rtl;font-size:14px;color:#333;">
          <!-- Üst Bant -->
          <div style="background:#1e3a8a;color:#fff;padding:25px;text-align:center;border-radius:10px;">
            <h1 style="font-size:26px;margin:0;font-weight:bold;">محطة تشرين الكهربائية</h1>
            <p style="font-size:16px;margin:10px 0 0;">التقرير الشهري - ${format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ar })}</p>
          </div>

          <!-- Dönem Bilgisi -->
          <div style="display:flex;justify-content:space-between;margin:20px 10px;font-size:13px;">
            <span>الفترة: ${format(new Date(year, month - 1, 1), 'dd/MM/yyyy')} - ${format(new Date(year, month, 0), 'dd/MM/yyyy')}</span>
            <span>تاريخ الإصدار: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          </div>

          <!-- KPI Kartları -->
          <div style="display:flex;gap:12px;margin-bottom:20px;">
            <div style="flex:1;background:#2563eb;color:#fff;border-radius:10px;padding:20px;text-align:center;">
              <div style="font-size:13px;opacity:0.9;">إجمالي الإنتاج</div>
              <div style="font-size:22px;font-weight:bold;margin-top:8px;">${(totalStats.totalGeneration || 0).toFixed(0)} <span style="font-size:14px;">MWh</span></div>
            </div>
            <div style="flex:1;background:#10b981;color:#fff;border-radius:10px;padding:20px;text-align:center;">
              <div style="font-size:13px;opacity:0.9;">صافي الإنتاج</div>
              <div style="font-size:22px;font-weight:bold;margin-top:8px;">${(totalStats.totalNetGeneration || 0).toFixed(0)} <span style="font-size:14px;">MWh</span></div>
            </div>
            <div style="flex:1;background:#f59e0b;color:#fff;border-radius:10px;padding:20px;text-align:center;">
              <div style="font-size:13px;opacity:0.9;">عامل السعة</div>
              <div style="font-size:22px;font-weight:bold;margin-top:8px;">${(totalStats.plantCapacityFactor || 0).toFixed(1)}%</div>
            </div>
            <div style="flex:1;background:#8b5cf6;color:#fff;border-radius:10px;padding:20px;text-align:center;">
              <div style="font-size:13px;opacity:0.9;">نسبة الصافي</div>
              <div style="font-size:22px;font-weight:bold;margin-top:8px;">${(totalStats.plantNetGenerationRate || 0).toFixed(1)}%</div>
            </div>
          </div>

          <!-- Ünite Tablosu -->
          <h2 style="font-size:18px;color:#1e3a8a;margin:25px 0 10px;font-weight:bold;">أداء الوحدات</h2>
          <table style="width:100%;border-collapse:collapse;font-size:12px;direction:rtl;">
            <thead>
              <tr style="background:#1e3a8a;color:#fff;">
                <th style="padding:10px;border:1px solid #ddd;">الوحدة</th>
                <th style="padding:10px;border:1px solid #ddd;">النوع</th>
                <th style="padding:10px;border:1px solid #ddd;">السعة</th>
                <th style="padding:10px;border:1px solid #ddd;">ساعات</th>
                <th style="padding:10px;border:1px solid #ddd;">الإنتاج</th>
                <th style="padding:10px;border:1px solid #ddd;">الاستهلاك</th>
                <th style="padding:10px;border:1px solid #ddd;">الصافي</th>
                <th style="padding:10px;border:1px solid #ddd;">نسبة الصافي</th>
                <th style="padding:10px;border:1px solid #ddd;">عامل السعة</th>
                <th style="padding:10px;border:1px solid #ddd;">عامل التوفر</th>
                <th style="padding:10px;border:1px solid #ddd;">معدل الحمل</th>
              </tr>
            </thead>
            <tbody>
              ${units.map((unit: any, idx: number) => `
                <tr style="background:${idx % 2 === 0 ? '#f0f5ff' : '#fff'};">
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${unit.unitCode}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${unit.unitType === 'Steam' ? 'بخارية' : 'غازية'}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${unit.capacityMW}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${unit.totalOperatingHours}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(unit.totalGeneration || 0).toFixed(1)}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(unit.totalConsumption || 0).toFixed(1)}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;font-weight:bold;color:#10b981;">${(unit.netGeneration || 0).toFixed(1)}</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(unit.netGenerationRate || 0).toFixed(1)}%</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(unit.capacityFactor || 0).toFixed(1)}%</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(unit.availabilityFactor || 0).toFixed(1)}%</td>
                  <td style="padding:8px;border:1px solid #ddd;text-align:center;">${(unit.loadFactor || 0).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Öne Çıkanlar -->
          <div style="display:flex;gap:12px;margin:25px 0;">
            <div style="flex:1;background:#10b981;color:#fff;border-radius:10px;padding:15px;text-align:center;">
              <strong style="font-size:14px;">الأفضل كفاءة</strong><br/>
              <span style="font-size:16px;font-weight:bold;">${bestUnit?.unitCode || '—'} (${(bestUnit?.netGenerationRate || 0).toFixed(1)}%)</span>
            </div>
            <div style="flex:1;background:#f59e0b;color:#fff;border-radius:10px;padding:15px;text-align:center;">
              <strong style="font-size:14px;">الأعلى إنتاج</strong><br/>
              <span style="font-size:16px;font-weight:bold;">${topProducer?.unitCode || '—'} (${(topProducer?.totalGeneration || 0).toFixed(0)} MWh)</span>
            </div>
            <div style="flex:1;background:#ef4444;color:#fff;border-radius:10px;padding:15px;text-align:center;">
              <strong style="font-size:14px;">يحتاج اهتمام</strong><br/>
              <span style="font-size:16px;font-weight:bold;">${worstUnit?.unitCode || '—'} (${(worstUnit?.netGenerationRate || 0).toFixed(1)}%)</span>
            </div>
          </div>

          <!-- İmza Alanları -->
          <div style="display:flex;justify-content:space-between;margin-top:40px;padding-top:30px;">
            <div style="text-align:center;width:30%;">
              <div style="border-top:1px solid #999;padding-top:8px;font-size:13px;">توقيع مدير المحطة</div>
            </div>
            <div style="text-align:center;width:30%;">
              <div style="border-top:1px solid #999;padding-top:8px;font-size:13px;">توقيع المهندس المسؤول</div>
            </div>
            <div style="text-align:center;width:30%;">
              <div style="border-top:1px solid #999;padding-top:8px;font-size:13px;">ختم المحطة</div>
            </div>
          </div>

          <!-- Alt Bilgi -->
          <div style="text-align:center;font-size:11px;color:#999;margin-top:30px;border-top:1px solid #eee;padding-top:15px;">
            تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة محطة تشرين الكهربائية
          </div>
        </div>
      `;

      // Geçici DOM elementi oluştur
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.zIndex = '-1';
      container.innerHTML = templateHTML;
      document.body.appendChild(container);

      // html2canvas ile yakala
      const element = container.firstElementChild as HTMLElement;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Geçici elementi kaldır
      document.body.removeChild(container);

      // Canvas boyutlarını al
      const imgWidth = 297; // A4 landscape genişlik (mm)
      const pageHeight = 210; // A4 landscape yükseklik (mm)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // PDF oluştur
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // İndir
      pdf.save(`monthly-report-${year}-${month}.pdf`);

      setIsDownloaded(true);
      toast.success('تم تحميل التقرير بنجاح');
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('فشل في إنشاء PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      disabled={isDownloading}
      className={cn(className)}
    >
      {isDownloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin ml-1" />
          جاري الإنشاء...
        </>
      ) : isDownloaded ? (
        <>
          <CheckCircle2 className="h-4 w-4 ml-1 text-green-500" />
          تم التحميل
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 ml-1" />
          {label}
        </>
      )}
    </Button>
  );
}