'use client';

import React from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface PdfReportTemplateProps {
  report: any;
  year: number;
  month: number;
}

export default function PdfReportTemplate({ report, year, month }: PdfReportTemplateProps) {
  const { totalStats, units, dailyTotals } = report;
  const bestUnit = [...units].sort((a: any, b: any) => b.netGenerationRate - a.netGenerationRate)[0];
  const topProducer = [...units].sort((a: any, b: any) => b.totalGeneration - a.totalGeneration)[0];
  const worstUnit = [...units].sort((a: any, b: any) => a.netGenerationRate - b.netGenerationRate)[0];

  return (
    <div
      id="pdf-report-template"
      dir="rtl"
      style={{
        width: '1120px',
        minHeight: '800px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
        direction: 'rtl',
      }}
    >
      {/* Üst Bant */}
      <div style={{ backgroundColor: '#1e3a8a', color: '#ffffff', padding: '20px', textAlign: 'center', borderRadius: '8px' }}>
        <h1 style={{ fontSize: '24px', margin: '0', fontWeight: 'bold' }}>
          محطة تشرين الكهربائية
        </h1>
        <p style={{ fontSize: '16px', margin: '8px 0 0' }}>
          التقرير الشهري - {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ar })}
        </p>
      </div>

      {/* Dönem */}
      <div style={{ display: 'flex', justifyContent: 'space-between', margin: '15px 5px', fontSize: '12px', color: '#333' }}>
        <span>الفترة: {format(new Date(year, month - 1, 1), 'dd/MM/yyyy')} - {format(new Date(year, month, 0), 'dd/MM/yyyy')}</span>
        <span>تاريخ الإصدار: {format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
      </div>

      {/* KPI Kartları */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        {[
          { label: 'إجمالي الإنتاج', value: totalStats.totalGeneration?.toFixed(0) || '0', unit: 'MWh', bg: '#2563eb' },
          { label: 'صافي الإنتاج', value: totalStats.totalNetGeneration?.toFixed(0) || '0', unit: 'MWh', bg: '#10b981' },
          { label: 'عامل السعة', value: totalStats.plantCapacityFactor?.toFixed(1) || '0', unit: '%', bg: '#f59e0b' },
          { label: 'نسبة الصافي', value: totalStats.plantNetGenerationRate?.toFixed(1) || '0', unit: '%', bg: '#8b5cf6' },
        ].map((kpi, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: kpi.bg, color: '#fff', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>{kpi.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
              {kpi.value} {kpi.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Ünite Tablosu */}
      <h2 style={{ fontSize: '16px', color: '#1e3a8a', margin: '15px 0 8px', fontWeight: 'bold' }}>
        أداء الوحدات
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', direction: 'rtl' }}>
        <thead>
          <tr style={{ backgroundColor: '#1e3a8a', color: '#fff' }}>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>الوحدة</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>النوع</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>السعة (MW)</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>ساعات</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>الإنتاج (MWh)</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>الاستهلاك (MWh)</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>الصافي (MWh)</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>نسبة الصافي</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>عامل السعة</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>عامل التوفر</th>
            <th style={{ padding: '8px', border: '1px solid #ddd' }}>معدل الحمل</th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit: any, idx: number) => (
            <tr key={unit.unitId} style={{ backgroundColor: idx % 2 === 0 ? '#f0f5ff' : '#fff' }}>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{unit.unitCode}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.unitType === 'Steam' ? 'بخارية' : 'غازية'}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.capacityMW}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.totalOperatingHours}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.totalGeneration.toFixed(1)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.totalConsumption.toFixed(1)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>{unit.netGeneration.toFixed(1)}</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.netGenerationRate.toFixed(1)}%</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.capacityFactor.toFixed(1)}%</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.availabilityFactor.toFixed(1)}%</td>
              <td style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'center' }}>{unit.loadFactor.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Öne Çıkanlar */}
      <div style={{ display: 'flex', gap: '10px', margin: '15px 0' }}>
        <div style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
          <strong>الأفضل كفاءة</strong><br />
          {bestUnit?.unitCode} ({bestUnit?.netGenerationRate.toFixed(1)}%)
        </div>
        <div style={{ flex: 1, backgroundColor: '#f59e0b', color: '#fff', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
          <strong>الأعلى إنتاج</strong><br />
          {topProducer?.unitCode} ({topProducer?.totalGeneration.toFixed(0)} MWh)
        </div>
        <div style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
          <strong>يحتاج اهتمام</strong><br />
          {worstUnit?.unitCode} ({worstUnit?.netGenerationRate.toFixed(1)}%)
        </div>
      </div>

      {/* İmza Alanları */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '20px' }}>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #999', paddingTop: '5px' }}>توقيع مدير المحطة</div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #999', paddingTop: '5px' }}>توقيع المهندس المسؤول</div>
        </div>
        <div style={{ textAlign: 'center', width: '30%' }}>
          <div style={{ borderTop: '1px solid #999', paddingTop: '5px' }}>ختم المحطة</div>
        </div>
      </div>

      {/* Alt Bilgi */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#999', marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
        تم إنشاء هذا التقرير تلقائياً بواسطة نظام إدارة محطة تشرين الكهربائية
      </div>
    </div>
  );
}