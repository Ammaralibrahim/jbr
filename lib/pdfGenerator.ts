import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PDFReportOptions {
  companyName?: string;
  reportTitle?: string;
  period?: string;
  generatedBy?: string;
  includeCharts?: boolean;
}

export async function generateMonthlyReportPDF(
  report: any,
  options: PDFReportOptions = {}
): Promise<jsPDF> {
  const {
    companyName = 'محطة تشرين الكهربائية',
    reportTitle = 'التقرير الشهري',
    period = '',
    generatedBy = '',
  } = options;

  // RTL desteği için A4 dikey
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const marginY = 15;

  // ===== ÜST BANT =====
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Logo alanı
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth / 2, 17.5, 8, 'F');
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('⚡', pageWidth / 2 - 3, 18);

  // Başlık
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(reportTitle, pageWidth / 2, 20, { align: 'center' });

  // ===== DÖNEM BİLGİSİ =====
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`الفترة: ${period}`, marginX, 45);
  doc.text(`تاريخ الإصدار: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - marginX, 45, { align: 'right' });

  if (generatedBy) {
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`أُعد بواسطة: ${generatedBy}`, marginX, 52);
  }

  // ===== AYIRICI ÇİZGİ =====
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(marginX, 56, pageWidth - marginX, 56);

  // ===== KPI ÖZET KARTLARI =====
  const totalStats = report.totalStats || {};
  const kpiData = [
    { label: 'إجمالي الإنتاج', value: `${totalStats.totalGeneration?.toFixed(0) || 0}`, unit: 'MWh', color: [37, 99, 235] },
    { label: 'صافي الإنتاج', value: `${totalStats.totalNetGeneration?.toFixed(0) || 0}`, unit: 'MWh', color: [16, 185, 129] },
    { label: 'عامل السعة', value: `${totalStats.plantCapacityFactor?.toFixed(1) || 0}`, unit: '%', color: [245, 158, 11] },
    { label: 'نسبة الصافي', value: `${totalStats.plantNetGenerationRate?.toFixed(1) || 0}`, unit: '%', color: [139, 92, 246] },
  ];

  const cardWidth = (pageWidth - marginX * 2 - 6) / 4;
  const cardY = 62;
  const cardHeight = 28;

  kpiData.forEach((kpi, index) => {
    const x = marginX + index * (cardWidth + 2);
    
    // Kart arka planı
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 3, 3, 'F');
    
    // Etiket
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(kpi.label, x + cardWidth / 2, cardY + 10, { align: 'center' });
    
    // Değer
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${kpi.value} ${kpi.unit}`, x + cardWidth / 2, cardY + 20, { align: 'center' });
  });

  // ===== ÜNİTE TABLOSU =====
  const tableStartY = cardY + cardHeight + 12;

  doc.setTextColor(30, 58, 138);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('أداء الوحدات', marginX, tableStartY);

  const tableColumns = [
    'الوحدة',
    'النوع',
    'السعة (MW)',
    'ساعات',
    'الإنتاج (MWh)',
    'الاستهلاك (MWh)',
    'الصافي (MWh)',
    'نسبة الصافي',
    'عامل السعة',
    'عامل التوفر',
    'معدل الحمل',
  ];

  const tableRows = (report.units || []).map((unit: any) => [
    unit.unitCode,
    unit.unitType === 'Steam' ? 'بخارية' : 'غازية',
    unit.capacityMW.toString(),
    unit.totalOperatingHours.toString(),
    unit.totalGeneration.toFixed(1),
    unit.totalConsumption.toFixed(1),
    unit.netGeneration.toFixed(1),
    `${unit.netGenerationRate.toFixed(1)}%`,
    `${unit.capacityFactor.toFixed(1)}%`,
    `${unit.availabilityFactor.toFixed(1)}%`,
    `${unit.loadFactor.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: tableStartY + 5,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [240, 245, 255],
    },
    margin: { left: marginX, right: marginX },
  });

  // ===== ÖNE ÇIKANLAR =====
  const afterTableY = (doc as any).lastAutoTable?.finalY || tableStartY + 40;

  const bestUnit = [...(report.units || [])].sort((a: any, b: any) => b.netGenerationRate - a.netGenerationRate)[0];
  const worstUnit = [...(report.units || [])].sort((a: any, b: any) => a.netGenerationRate - b.netGenerationRate)[0];
  const topProducer = [...(report.units || [])].sort((a: any, b: any) => b.totalGeneration - a.totalGeneration)[0];

  const highlightsY = afterTableY + 12;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('ملخص الأداء', marginX, highlightsY);

  const highlightData = [
    { label: 'الأفضل كفاءة', value: bestUnit ? `${bestUnit.unitCode} (${bestUnit.netGenerationRate.toFixed(1)}%)` : '—', color: [16, 185, 129] },
    { label: 'الأعلى إنتاج', value: topProducer ? `${topProducer.unitCode} (${topProducer.totalGeneration.toFixed(0)} MWh)` : '—', color: [245, 158, 11] },
    { label: 'يحتاج اهتمام', value: worstUnit ? `${worstUnit.unitCode} (${worstUnit.netGenerationRate.toFixed(1)}%)` : '—', color: [239, 68, 68] },
  ];

  const highlightCardWidth = (pageWidth - marginX * 2 - 8) / 3;

  highlightData.forEach((item, index) => {
    const x = marginX + index * (highlightCardWidth + 4);
    const y = highlightsY + 5;
    
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.roundedRect(x, y, highlightCardWidth, 20, 2, 2, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, x + highlightCardWidth / 2, y + 8, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + highlightCardWidth / 2, y + 15, { align: 'center' });
  });

  // ===== GÜNLÜK ÖZET =====
  const dailyY = highlightsY + 40;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('الإنتاج اليومي', marginX, dailyY);

  const dailyColumns = ['التاريخ', 'الإنتاج (MWh)', 'الصافي (MWh)', 'الاستهلاك (MWh)', 'الوحدات العاملة'];
  const dailyRows = (report.dailyTotals || []).slice(-15).map((day: any) => [
    format(new Date(day.date), 'dd/MM/yyyy'),
    day.totalGeneration.toFixed(1),
    day.netGeneration.toFixed(1),
    day.totalConsumption.toFixed(1),
    day.operatingUnits.toString(),
  ]);

  autoTable(doc, {
    startY: dailyY + 5,
    head: [dailyColumns],
    body: dailyRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      halign: 'center',
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    margin: { left: marginX, right: marginX },
  });

  // ===== İMZA ALANI =====
  const signY = pageHeight - 35;
  
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.3);
  
  // Sol imza
  doc.line(marginX + 10, signY + 15, marginX + 60, signY + 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('توقيع مدير المحطة', marginX + 35, signY + 20, { align: 'center' });

  // Orta imza
  doc.line(pageWidth / 2 - 25, signY + 15, pageWidth / 2 + 25, signY + 15);
  doc.text('توقيع المهندس المسؤول', pageWidth / 2, signY + 20, { align: 'center' });

  // Sağ imza
  doc.line(pageWidth - marginX - 60, signY + 15, pageWidth - marginX - 10, signY + 15);
  doc.text('ختم المحطة', pageWidth - marginX - 35, signY + 20, { align: 'center' });

  // ===== ALT BİLGİ =====
  doc.setFillColor(240, 240, 240);
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة محطة تشرين الكهربائية',
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  return doc;
}