'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PDFDownloadButton from '@/components/ui/PDFDownloadButton';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Loader2, Zap, Activity, Thermometer, Clock, BarChart3,
  Download, TrendingUp, Gauge, FileSpreadsheet, CheckCircle2,
  AlertTriangle, Target, Award, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function MonthlyDashboard() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'analysis' | 'charts'>('overview');

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monthly-report?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.report);
      } else {
        setReport(null);
      }
    } catch {
      toast.error('فشل في تحميل التقرير');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportCSV = () => {
    if (!report) return;
    const headers = ['الوحدة','النوع','السعة','ساعات','الإنتاج','الاستهلاك','الصافي','نسبة الصافي','عامل السعة','عامل التوفر','معدل الحمل','الحرارة'];
    const rows = report.units.map((u: any) => [
      u.unitCode, u.unitType === 'Steam' ? 'بخارية' : 'غازية', u.capacityMW,
      u.totalOperatingHours, u.totalGeneration.toFixed(2), u.totalConsumption.toFixed(2),
      u.netGeneration.toFixed(2), u.netGenerationRate.toFixed(2) + '%',
      u.capacityFactor.toFixed(2) + '%', u.availabilityFactor.toFixed(2) + '%',
      u.loadFactor.toFixed(2) + '%', u.averageAmbientTemperature.toFixed(1),
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `monthly-report-${year}-${month}.csv`; a.click();
    window.URL.revokeObjectURL(url);
    toast.success('تم التصدير');
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 animate-spin text-blue-500" /></div>;
  }

  if (!report || report.units.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="text-center py-12">
          <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="font-semibold">لا توجد بيانات لهذا الشهر</p>
        </CardContent>
      </Card>
    );
  }

  const { totalStats } = report;
  const bestUnit = [...report.units].sort((a: any, b: any) => b.netGenerationRate - a.netGenerationRate)[0];
  const highestGenUnit = [...report.units].sort((a: any, b: any) => b.totalGeneration - a.totalGeneration)[0];
  const worstUnit = [...report.units].sort((a: any, b: any) => a.netGenerationRate - b.netGenerationRate)[0];

  return (
    <div className="space-y-4 max-w-full">
      {/* Başlık */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <h1 className="text-xl font-bold">التقرير الشهري</h1>
          <p className="text-xs text-muted-foreground">{format(new Date(year, month-1, 1), 'MMMM yyyy', { locale: ar })}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          <select value={year} onChange={(e)=>setYear(parseInt(e.target.value))} className="h-7 text-[10px] px-1 border rounded bg-white dark:bg-gray-800">
            {Array.from({length:5},(_,i)=>new Date().getFullYear()-2+i).map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e)=>setMonth(parseInt(e.target.value))} className="h-7 text-[10px] px-1 border rounded bg-white dark:bg-gray-800">
            {Array.from({length:12},(_,i)=>i+1).map(m=><option key={m} value={m}>{format(new Date(2000,m-1,1),'MMMM',{locale:ar})}</option>)}
          </select>
          <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={handleExportCSV}>
            <Download className="h-3 w-3 ml-1" />تصدير
          </Button>
        </div>
        {report && (
  <PDFDownloadButton
    year={year}
    month={month}
    report={report}
    label="PDF"
    className="h-7 text-xs"
  />
)}
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1.5">
        <Card className="shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <Zap className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.totalGeneration.toFixed(0)}</p>
            <p className="text-[7px] opacity-80">إنتاج (م.و.سا)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <Activity className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.totalNetGeneration.toFixed(0)}</p>
            <p className="text-[7px] opacity-80">صافي (م.و.سا)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <Gauge className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.plantCapacityFactor?.toFixed(1)}%</p>
            <p className="text-[7px] opacity-80">عامل السعة</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <Target className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.plantNetGenerationRate?.toFixed(1)}%</p>
            <p className="text-[7px] opacity-80">نسبة الصافي</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-red-500 to-red-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <Thermometer className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.averageAmbientTemperature?.toFixed(1)}°</p>
            <p className="text-[7px] opacity-80">الحرارة</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <Clock className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.totalOperatingHours}</p>
            <p className="text-[7px] opacity-80">ساعات</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
          <CardContent className="p-2 text-center">
            <TrendingUp className="h-3 w-3 mx-auto mb-0.5 opacity-80" />
            <p className="text-base font-bold">{totalStats.peakDailyGeneration.toFixed(0)}</p>
            <p className="text-[7px] opacity-80">الذروة</p>
          </CardContent>
        </Card>
      </div>

      {/* Öne Çıkanlar */}
      <div className="grid grid-cols-3 gap-1.5">
        <Card className="shadow-sm border-green-200">
          <CardContent className="p-2 text-center">
            <Award className="h-3 w-3 text-green-500 mx-auto mb-0.5" />
            <p className="text-[9px] font-bold text-green-600">{bestUnit?.unitCode}</p>
            <p className="text-[7px] text-muted-foreground">الأفضل: {bestUnit?.netGenerationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-yellow-200">
          <CardContent className="p-2 text-center">
            <Zap className="h-3 w-3 text-yellow-500 mx-auto mb-0.5" />
            <p className="text-[9px] font-bold text-yellow-600">{highestGenUnit?.unitCode}</p>
            <p className="text-[7px] text-muted-foreground">الأعلى: {highestGenUnit?.totalGeneration.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-200">
          <CardContent className="p-2 text-center">
            <AlertTriangle className="h-3 w-3 text-red-500 mx-auto mb-0.5" />
            <p className="text-[9px] font-bold text-red-600">{worstUnit?.unitCode}</p>
            <p className="text-[7px] text-muted-foreground">يحتاج: {worstUnit?.netGenerationRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg">
        {[['overview','نظرة عامة'],['units','الوحدات'],['analysis','التحليل'],['charts','الرسوم']].map(([k,l])=>(
          <button key={k} onClick={()=>setActiveTab(k as any)} className={cn('flex-1 px-2 py-1.5 rounded text-[10px] font-medium', activeTab===k ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-600')}>{l}</button>
        ))}
      </div>

      {/* Tab İçerikleri */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">الإنتاج اليومي</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={report.dailyTotals.map((d:any)=>({date:format(new Date(d.date),'dd/MM',{locale:ar}), إنتاج:d.totalGeneration, صافي:d.netGeneration}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={8} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize:'8px'}} />
                  <Area type="monotone" dataKey="إنتاج" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="صافي" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">مقارنة الوحدات</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.units.map((u:any)=>({name:u.unitCode, إنتاج:u.totalGeneration, استهلاك:u.totalConsumption, صافي:u.netGeneration}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={8} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize:'8px'}} />
                  <Bar dataKey="إنتاج" fill="#3b82f6" radius={[3,3,0,0]} />
                  <Bar dataKey="استهلاك" fill="#f59e0b" radius={[3,3,0,0]} />
                  <Bar dataKey="صافي" fill="#10b981" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'units' && (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table className="text-[9px] w-full">
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/60">
                  <TableHead className="h-6 px-1 text-center font-bold border-r">الوحدة</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r">ساعات</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r text-blue-600">إنتاج</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r text-orange-600">استهلاك</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r text-green-600">صافي</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r">نسبة الصافي</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r">عامل سعة</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r">عامل توفر</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold border-r">معدل حمل</TableHead>
                  <TableHead className="h-6 px-1 text-center font-bold">°C</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.units.map((u:any)=>(
                  <TableRow key={u.unitId} className="hover:bg-gray-50">
                    <TableCell className="px-1 py-1 text-center border-r">
                      <Badge variant={u.unitType==='Steam'?'default':'secondary'} className="text-[8px] h-4 px-1">{u.unitCode}</Badge>
                    </TableCell>
                    <TableCell className="px-1 py-1 text-center border-r">{u.totalOperatingHours}</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r font-bold text-blue-600">{u.totalGeneration.toFixed(1)}</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r text-orange-600">{u.totalConsumption.toFixed(1)}</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r font-bold text-green-600">{u.netGeneration.toFixed(1)}</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r">{u.netGenerationRate.toFixed(1)}%</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r">{u.capacityFactor.toFixed(1)}%</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r">{u.availabilityFactor.toFixed(1)}%</TableCell>
                    <TableCell className="px-1 py-1 text-center border-r">{u.loadFactor.toFixed(1)}%</TableCell>
                    <TableCell className="px-1 py-1 text-center">{u.averageAmbientTemperature.toFixed(1)}°</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === 'analysis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">رادار الأداء</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={report.units.map((u:any)=>({unit:u.unitCode, 'عامل السعة':u.capacityFactor, 'نسبة الصافي':u.netGenerationRate, 'عامل التوفر':u.availabilityFactor, 'معدل الحمل':u.loadFactor}))}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="unit" fontSize={8} />
                  <PolarRadiusAxis fontSize={7} />
                  <Radar name="عامل السعة" dataKey="عامل السعة" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Radar name="نسبة الصافي" dataKey="نسبة الصافي" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                  <Radar name="عامل التوفر" dataKey="عامل التوفر" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                  <Radar name="معدل الحمل" dataKey="معدل الحمل" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} />
                  <Legend wrapperStyle={{fontSize:'7px'}} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">توزيع الإنتاج</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={report.units.map((u:any,i:number)=>({name:u.unitCode,value:u.totalGeneration,color:COLORS[i%COLORS.length]}))} cx="50%" cy="50%" labelLine={false} label={(e:any)=>e.name} outerRadius={80} dataKey="value">
                    {report.units.map((u:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm md:col-span-2">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">تحليل الكفاءة</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={report.units.map((u:any)=>({name:u.unitCode, 'نسبة الصافي':u.netGenerationRate, 'معدل الحمل':u.loadFactor}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={8} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize:'8px'}} />
                  <Bar dataKey="نسبة الصافي" fill="#10b981" radius={[3,3,0,0]} />
                  <Bar dataKey="معدل الحمل" fill="#8b5cf6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">الإنتاج مقابل الحرارة</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={report.dailyTotals.map((d:any)=>({date:format(new Date(d.date),'dd/MM',{locale:ar}), إنتاج:d.totalGeneration, حرارة:d.averageAmbientTemperature}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={7} />
                  <YAxis yAxisId="left" fontSize={7} />
                  <YAxis yAxisId="right" orientation="right" fontSize={7} />
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize:'7px'}} />
                  <Line yAxisId="left" type="monotone" dataKey="إنتاج" stroke="#3b82f6" strokeWidth={1.5} />
                  <Line yAxisId="right" type="monotone" dataKey="حرارة" stroke="#ef4444" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <h3 className="text-xs font-bold mb-2">الاستهلاك الذاتي</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.units.map((u:any)=>({name:u.unitCode, BT01:u.totalBT01Consumption, BT02:u.totalBT02Consumption, BL01:u.totalBL01Consumption, BM01:u.totalBM01Consumption, تهييج:u.totalExcitationConsumption}))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={8} />
                  <YAxis fontSize={8} />
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize:'7px'}} />
                  <Bar dataKey="BT01" fill="#3b82f6" radius={[2,2,0,0]} />
                  <Bar dataKey="BT02" fill="#10b981" radius={[2,2,0,0]} />
                  <Bar dataKey="BL01" fill="#f59e0b" radius={[2,2,0,0]} />
                  <Bar dataKey="BM01" fill="#ef4444" radius={[2,2,0,0]} />
                  <Bar dataKey="تهييج" fill="#8b5cf6" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}