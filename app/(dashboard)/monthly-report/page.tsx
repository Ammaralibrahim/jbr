'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, Zap, Activity, Gauge, Clock, Target, Award, AlertTriangle,
  Download, TrendingUp, Minus, FileSpreadsheet, Percent, Battery,
  BarChart3, Info, ArrowUp, ArrowDown, FlaskConical, Power, PlugZap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import PDFDownloadButton from '@/components/ui/PDFDownloadButton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function fmt(n: number | undefined | null, d = 2): string {
  if (n === undefined || n === null || !isFinite(n)) return '0';
  return Number(n).toFixed(d);
}

function fmtDate(d: any): string {
  if (!d) return '—';
  try { return format(new Date(d), 'dd/MM/yyyy', { locale: ar }); } catch { return '—'; }
}

function evalText(e: string): string {
  return e === 'excellent' ? 'ممتاز' : e === 'good' ? 'جيد' : e === 'average' ? 'متوسط' : e === 'poor' ? 'ضعيف' : '—';
}
function evalColor(e: string): string {
  return e === 'excellent' ? 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200'
    : e === 'good' ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200'
    : e === 'average' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
    : 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200';
}

export default function MonthlyReportPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'parameters' | 'charts' | 'analysis'>('overview');

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/monthly-report?year=${year}&month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.report || null);
      } else setReport(null);
    } catch { setReport(null); } finally { setIsLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportCSV = () => {
    if (!report?.units?.length) { toast.error('لا توجد بيانات'); return; }
    const headers = [
      'الوحدة','النوع','السعة (MW)','ساعات التشغيل','الإنتاج الكلي (MWh)',
      'الاستطاعة الوسطية (MW)','أعلى استطاعة فعلية','تاريخها','أدنى استطاعة فعلية','تاريخها',
      'الطاقة الردية الكلية (MVARh)','الاستطاعة الردية الوسطية (MVAR)',
      'أعلى استطاعة ردية','تاريخها','أدنى استطاعة ردية','تاريخها',
      'الاستهلاك الذاتي BT01+BT02','استجرار المحولة الاقلاعية BL01+BM01','استجرار محولة التهييج',
      'الصافي (MWh)','معامل السعة (%)','معامل الجاهزية (%)','نسبة الصافي (%)','معامل الحمل (%)','التقييم',
    ];
    const rows = report.units.map((u: any) => [
      u.unitCode, u.unitType === 'Steam' ? 'بخارية' : 'غازية', u.capacityMW, u.totalOperatingHours,
      fmt(u.totalGeneration), fmt(u.averageActivePower),
      fmt(u.maxActivePower), fmtDate(u.maxActivePowerDate),
      fmt(u.minActivePower), fmtDate(u.minActivePowerDate),
      fmt(u.totalReactiveEnergy), fmt(u.averageReactivePower),
      fmt(u.maxReactivePower), fmtDate(u.maxReactivePowerDate),
      fmt(u.minReactivePower), fmtDate(u.minReactivePowerDate),
      fmt(u.selfConsumption), fmt(u.startupDraw), fmt(u.excitationDraw),
      fmt(u.netGeneration), fmt(u.capacityFactor), fmt(u.availabilityFactor),
      fmt(u.netGenerationRate), fmt(u.loadFactor), evalText(u.evaluation),
    ]);
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${year}-${month}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('تم التصدير');
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-12 w-12 animate-spin text-blue-500" /></div>;

  if (!report?.units?.length) {
    return (
      <Card className="shadow-sm">
        <CardContent className="text-center py-12">
          <FileSpreadsheet className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-lg font-semibold mb-2">لا توجد بيانات لهذا الشهر</p>
        </CardContent>
      </Card>
    );
  }

  const t = report.totalStats || {};
  const activeUnits = report.units.filter((u: any) => u.daysInOperation > 0);
  const bestUnit = [...activeUnits].sort((a: any, b: any) => b.capacityFactor - a.capacityFactor)[0];
  const topProducer = [...activeUnits].sort((a: any, b: any) => b.totalGeneration - a.totalGeneration)[0];
  const worstUnit = [...activeUnits].sort((a: any, b: any) => a.capacityFactor - b.capacityFactor)[0];

  const barData = report.units.map((u: any) => ({
    name: u.unitCode,
    'الإنتاج': Number(fmt(u.totalGeneration, 1)),
    'الصافي': Number(fmt(u.netGeneration, 1)),
    'الاستهلاك': Number(fmt(u.totalConsumption, 1)),
  }));

  const dailyData = report.dailyTotals.map((d: any) => ({
    date: format(new Date(d.date), 'dd/MM', { locale: ar }),
    'الإنتاج': Number(fmt(d.totalGeneration, 1)),
    'الصافي': Number(fmt(d.netGeneration, 1)),
  }));

  const pieData = report.units.map((u: any, i: number) => ({
    name: u.unitCode,
    value: Number(fmt(u.totalGeneration, 1)),
    color: COLORS[i % COLORS.length],
  }));

  const cfBarData = report.units.map((u: any) => ({
    name: u.unitCode,
    'معامل السعة': Number(fmt(u.capacityFactor)),
    'معامل الجاهزية': Number(fmt(u.availabilityFactor)),
    'معامل الحمل': Number(fmt(u.loadFactor)),
  }));

  return (
    <div className="space-y-4 max-w-full">
      {/* العنوان */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">التقرير الشهري</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ar })} — {report.daysInMonth} يوم / {report.totalHoursInMonth} ساعة
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="h-8 text-sm px-2 border rounded-lg bg-white dark:bg-gray-800">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="h-8 text-sm px-2 border rounded-lg bg-white dark:bg-gray-800">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{format(new Date(2000, m - 1, 1), 'MMMM', { locale: ar })}</option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="h-8 text-sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 ml-1" />CSV
          </Button>
          <PDFDownloadButton year={year} month={month} report={report} label="PDF" className="h-8 text-sm" />
        </div>
      </div>

      {/* تقييم عام */}
      <Card className={cn('shadow-sm border-2', evalColor(t.overallEvaluation))}>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Award className="h-10 w-10" />
            <div>
              <p className="text-xs opacity-80">التقييم العام للمحطة</p>
              <p className="text-2xl font-bold">{evalText(t.overallEvaluation)}</p>
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-xs opacity-80">معامل السعة</p>
              <p className="font-bold text-lg">{fmt(t.plantCapacityFactor, 1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs opacity-80">نسبة الصافي</p>
              <p className="font-bold text-lg">{fmt(t.plantNetGenerationRate, 1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.totalGeneration, 0)}</p>
            <p className="text-[10px] opacity-90 mt-1">إجمالي الإنتاج (MWh)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Activity className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.totalNetGeneration, 0)}</p>
            <p className="text-[10px] opacity-90 mt-1">الصافي (MWh)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Gauge className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.plantCapacityFactor, 1)}%</p>
            <p className="text-[10px] opacity-90 mt-1">معامل السعة</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Percent className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.plantNetGenerationRate, 1)}%</p>
            <p className="text-[10px] opacity-90 mt-1">نسبة الصافي</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-cyan-500 to-cyan-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Battery className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.plantAvailabilityFactor, 1)}%</p>
            <p className="text-[10px] opacity-90 mt-1">معامل الجاهزية</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Power className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.averageActivePower, 1)}</p>
            <p className="text-[10px] opacity-90 mt-1">الاستطاعة الوسطية (MW)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-1 opacity-90" />
            <p className="text-xl font-bold">{fmt(t.totalOperatingHours, 0)}</p>
            <p className="text-[10px] opacity-90 mt-1">ساعات التشغيل</p>
          </CardContent>
        </Card>
      </div>

      {/* بطاقات ثانوية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">الذروة اليومية</p>
            <p className="text-lg font-bold text-green-600">{fmt(t.peakDailyGeneration, 0)} MWh</p>
            <p className="text-[10px] text-muted-foreground">{fmtDate(t.peakDayDate)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">أدنى إنتاج يومي</p>
            <p className="text-lg font-bold text-orange-600">{fmt(t.lowestDailyGeneration, 0)} MWh</p>
            <p className="text-[10px] text-muted-foreground">{fmtDate(t.lowestDayDate)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">متوسط الإنتاج اليومي</p>
            <p className="text-lg font-bold text-blue-600">{fmt(t.averageDailyGeneration, 0)} MWh</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">تغطية البيانات</p>
            <p className="text-lg font-bold text-purple-600">{fmt(t.dataCoverage, 1)}%</p>
            <p className="text-[10px] text-muted-foreground">{t.daysWithData}/{report.daysInMonth} يوم</p>
          </CardContent>
        </Card>
      </div>

      {/* مميزات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="shadow-sm border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{bestUnit?.unitCode || '—'}</p>
            <p className="text-sm text-muted-foreground">الأفضل — معامل السعة: {fmt(bestUnit?.capacityFactor, 1)}%</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-600">{topProducer?.unitCode || '—'}</p>
            <p className="text-sm text-muted-foreground">الأعلى إنتاج: {fmt(topProducer?.totalGeneration, 0)} MWh</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{worstUnit?.unitCode || '—'}</p>
            <p className="text-sm text-muted-foreground">يحتاج اهتمام: {fmt(worstUnit?.capacityFactor, 1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* التبويبات */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex-wrap">
        {[
          ['overview', 'نظرة عامة', BarChart3],
          ['parameters', 'البارامترات التفصيلية', FlaskConical],
          ['units', 'تفاصيل الوحدات', Zap],
          ['charts', 'الرسوم البيانية', TrendingUp],
          ['analysis', 'التحليل', Target],
        ].map(([k, l, Icon]: any) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            className={cn(
              'flex-1 min-w-[120px] px-3 py-2 rounded text-sm font-medium transition-all flex items-center justify-center gap-1',
              activeTab === k ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-600 hover:bg-white/50'
            )}
          >
            <Icon className="h-4 w-4" />{l}
          </button>
        ))}
      </div>

      {/* ====== نظرة عامة ====== */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3">الإنتاج اليومي للمحطة</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => `${v} MWh`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="الإنتاج" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="الصافي" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3">مقارنة الإنتاج والاستهلاك</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => `${v} MWh`} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="الإنتاج" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="الاستهلاك" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="الصافي" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== البارامترات التفصيلية (مطابقة لملف Excel) ====== */}
      {activeTab === 'parameters' && (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-blue-50 dark:bg-blue-900/30">
                  <tr>
                    <th className="p-3 text-right font-bold border-b w-56">البارامتر</th>
                    {report.units.map((u: any) => (
                      <th key={u.unitId} className="p-3 text-center font-bold border-b">{u.unitCode}</th>
                    ))}
                    <th className="p-3 text-center font-bold border-b bg-blue-100 dark:bg-blue-900/50">المحطة كاملة</th>
                  </tr>
                </thead>
                <tbody>
                  {/* الساعات */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold">عدد ساعات العمل</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-orange-600">{fmt(u.totalOperatingHours, 0)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-orange-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalOperatingHours, 0)}</td>
                  </tr>

                  {/* الإنتاج */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold">الإنتاج الكهربائي الكلي (MWh)</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-blue-600">{fmt(u.totalGeneration, 2)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalGeneration, 2)}</td>
                  </tr>

                  {/* الاستطاعة الوسطية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold">الاستطاعة الوسطية (MW)</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold">{fmt(u.averageActivePower, 3)}</td>
                    ))}
                    <td className="p-3 text-center font-bold bg-blue-50 dark:bg-blue-900/20">{fmt(t.averageActivePower, 3)}</td>
                  </tr>

                  {/* أعلى استطاعة فعلية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b bg-green-50/30 dark:bg-green-900/10">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <ArrowUp className="h-3 w-3 text-green-600" />أعلى قيمة استطاعة فعلية
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center">
                        <div className="font-bold text-green-600">{fmt(u.maxActivePower, 2)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(u.maxActivePowerDate)}</div>
                      </td>
                    ))}
                    <td className="p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                      <div className="font-bold text-green-700">{fmt(Math.max(...report.units.map((u: any) => u.maxActivePower || 0)), 2)}</div>
                    </td>
                  </tr>

                  {/* أدنى استطاعة فعلية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b bg-orange-50/30 dark:bg-orange-900/10">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <ArrowDown className="h-3 w-3 text-orange-600" />أدنى قيمة استطاعة فعلية
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center">
                        <div className="font-bold text-orange-600">{fmt(u.minActivePower, 2)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(u.minActivePowerDate)}</div>
                      </td>
                    ))}
                    <td className="p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                      <div className="font-bold text-orange-700">{fmt(Math.min(...report.units.filter((u: any) => u.minActivePower > 0).map((u: any) => u.minActivePower)), 2)}</div>
                    </td>
                  </tr>

                  {/* الطاقة الردية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold">الطاقة الردية الكلية (MVARh)</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-purple-600">{fmt(u.totalReactiveEnergy, 2)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-purple-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalReactiveEnergy, 2)}</td>
                  </tr>

                  {/* الاستطاعة الردية الوسطية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold">الاستطاعة الردية الوسطية (MVAR)</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-purple-600">{fmt(u.averageReactivePower, 4)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-purple-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.averageReactivePower, 4)}</td>
                  </tr>

                  {/* أعلى ردية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b bg-purple-50/30 dark:bg-purple-900/10">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <ArrowUp className="h-3 w-3 text-purple-600" />أعلى قيمة استطاعة ردية
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center">
                        <div className="font-bold text-purple-600">{fmt(u.maxReactivePower, 2)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(u.maxReactivePowerDate)}</div>
                      </td>
                    ))}
                    <td className="p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                      <div className="font-bold text-purple-700">{fmt(Math.max(...report.units.map((u: any) => u.maxReactivePower || 0)), 2)}</div>
                    </td>
                  </tr>

                  {/* أدنى ردية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b bg-yellow-50/30 dark:bg-yellow-900/10">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <ArrowDown className="h-3 w-3 text-yellow-600" />أدنى قيمة استطاعة ردية
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center">
                        <div className="font-bold text-yellow-600">{fmt(u.minReactivePower, 2)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDate(u.minReactivePowerDate)}</div>
                      </td>
                    ))}
                    <td className="p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                      <div className="font-bold text-yellow-700">{fmt(Math.min(...report.units.filter((u: any) => u.minReactivePower > 0).map((u: any) => u.minReactivePower)), 2)}</div>
                    </td>
                  </tr>

                  {/* الاستهلاك الذاتي */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <PlugZap className="h-3 w-3 text-blue-600" />
                      الاستهلاك الذاتي (BT01+BT02)
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-blue-600">{fmt(u.selfConsumption, 2)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalSelfConsumption, 2)}</td>
                  </tr>

                  {/* تفصيل BT01 و BT02 */}
                  <tr className="hover:bg-gray-50 border-b bg-blue-50/20 text-[11px]">
                    <td className="p-2 pl-8 text-muted-foreground">↳ BT01</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-2 text-center text-muted-foreground">{fmt(u.bt01Consumption, 2)}</td>)}
                    <td className="p-2 text-center text-muted-foreground bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalBT01, 2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b bg-blue-50/20 text-[11px]">
                    <td className="p-2 pl-8 text-muted-foreground">↳ BT02</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-2 text-center text-muted-foreground">{fmt(u.bt02Consumption, 2)}</td>)}
                    <td className="p-2 text-center text-muted-foreground bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalBT02, 2)}</td>
                  </tr>

                  {/* استجرار المحولة الاقلاعية */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <Power className="h-3 w-3 text-orange-600" />
                      استجرار المحولة الاقلاعية (BL01+BM01)
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-orange-600">{fmt(u.startupDraw, 2)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-orange-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalStartupDraw, 2)}</td>
                  </tr>

                  {/* تفصيل BL01 و BM01 */}
                  <tr className="hover:bg-gray-50 border-b bg-orange-50/20 text-[11px]">
                    <td className="p-2 pl-8 text-muted-foreground">↳ BL01</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-2 text-center text-muted-foreground">{fmt(u.bl01Consumption, 2)}</td>)}
                    <td className="p-2 text-center text-muted-foreground bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalBL01, 2)}</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b bg-orange-50/20 text-[11px]">
                    <td className="p-2 pl-8 text-muted-foreground">↳ BM01</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-2 text-center text-muted-foreground">{fmt(u.bm01Consumption, 2)}</td>)}
                    <td className="p-2 text-center text-muted-foreground bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalBM01, 2)}</td>
                  </tr>

                  {/* استجرار محولة التهييج */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                    <td className="p-3 font-semibold flex items-center gap-1">
                      <FlaskConical className="h-3 w-3 text-purple-600" />
                      استجرار محولة التهييج
                    </td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-purple-600">{fmt(u.excitationDraw, 2)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-purple-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalExcitationDraw, 2)}</td>
                  </tr>

                  {/* الصافي */}
                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b bg-green-50 dark:bg-green-900/20">
                    <td className="p-3 font-bold">الصافي (MWh)</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center font-bold text-green-600">{fmt(u.netGeneration, 2)}</td>
                    ))}
                    <td className="p-3 text-center font-bold text-green-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.totalNetGeneration, 2)}</td>
                  </tr>

                  {/* المؤشرات */}
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="p-3 font-semibold">معامل السعة (%)</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-3 text-center">{fmt(u.capacityFactor, 1)}%</td>)}
                    <td className="p-3 text-center font-bold bg-blue-50 dark:bg-blue-900/20">{fmt(t.plantCapacityFactor, 1)}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="p-3 font-semibold">معامل الجاهزية (%)</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-3 text-center">{fmt(u.availabilityFactor, 1)}%</td>)}
                    <td className="p-3 text-center font-bold bg-blue-50 dark:bg-blue-900/20">{fmt(t.plantAvailabilityFactor, 1)}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="p-3 font-semibold">نسبة الصافي (%)</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-3 text-center font-bold text-green-600">{fmt(u.netGenerationRate, 2)}%</td>)}
                    <td className="p-3 text-center font-bold text-green-700 bg-blue-50 dark:bg-blue-900/20">{fmt(t.plantNetGenerationRate, 2)}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="p-3 font-semibold">معامل الحمل (%)</td>
                    {report.units.map((u: any) => <td key={u.unitId} className="p-3 text-center">{fmt(u.loadFactor, 1)}%</td>)}
                    <td className="p-3 text-center font-bold bg-blue-50 dark:bg-blue-900/20">{fmt(t.plantLoadFactor, 1)}%</td>
                  </tr>
                  <tr className="hover:bg-gray-50 border-b">
                    <td className="p-3 font-semibold">التقييم</td>
                    {report.units.map((u: any) => (
                      <td key={u.unitId} className="p-3 text-center">
                        <Badge variant="outline" className={cn('text-[10px] border', evalColor(u.evaluation))}>
                          {evalText(u.evaluation)}
                        </Badge>
                      </td>
                    ))}
                    <td className="p-3 text-center bg-blue-50 dark:bg-blue-900/20">
                      <Badge variant="outline" className={cn('text-[10px] border', evalColor(t.overallEvaluation))}>
                        {evalText(t.overallEvaluation)}
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== تفاصيل الوحدات ====== */}
      {activeTab === 'units' && (
        <Card className="shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="p-3 text-center font-bold border-b">الوحدة</th>
                    <th className="p-3 text-center font-bold border-b">النوع</th>
                    <th className="p-3 text-center font-bold border-b">السعة</th>
                    <th className="p-3 text-center font-bold border-b">ساعات</th>
                    <th className="p-3 text-center font-bold border-b">أيام</th>
                    <th className="p-3 text-center font-bold border-b text-blue-600">الإنتاج</th>
                    <th className="p-3 text-center font-bold border-b text-orange-600">الاستهلاك</th>
                    <th className="p-3 text-center font-bold border-b text-green-600">الصافي</th>
                    <th className="p-3 text-center font-bold border-b">معامل السعة</th>
                    <th className="p-3 text-center font-bold border-b">الجاهزية</th>
                    <th className="p-3 text-center font-bold border-b">نسبة الصافي</th>
                    <th className="p-3 text-center font-bold border-b">التقييم</th>
                  </tr>
                </thead>
                <tbody>
                  {report.units.map((u: any) => (
                    <tr key={u.unitId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b">
                      <td className="p-3 text-center">
                        <Badge variant={u.unitType === 'Steam' ? 'default' : 'secondary'}>{u.unitCode}</Badge>
                      </td>
                      <td className="p-3 text-center">{u.unitType === 'Steam' ? 'بخارية' : 'غازية'}</td>
                      <td className="p-3 text-center">{u.capacityMW}</td>
                      <td className="p-3 text-center">{fmt(u.totalOperatingHours, 0)}</td>
                      <td className="p-3 text-center">{u.daysInOperation}/{report.daysInMonth}</td>
                      <td className="p-3 text-center font-bold text-blue-600">{fmt(u.totalGeneration, 1)}</td>
                      <td className="p-3 text-center text-orange-600">{fmt(u.totalConsumption, 1)}</td>
                      <td className="p-3 text-center font-bold text-green-600">{fmt(u.netGeneration, 1)}</td>
                      <td className="p-3 text-center font-bold">{fmt(u.capacityFactor, 1)}%</td>
                      <td className="p-3 text-center">{fmt(u.availabilityFactor, 1)}%</td>
                      <td className="p-3 text-center">{fmt(u.netGenerationRate, 1)}%</td>
                      <td className="p-3 text-center">
                        <Badge variant="outline" className={cn('text-[10px] border', evalColor(u.evaluation))}>
                          {evalText(u.evaluation)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== الرسوم البيانية ====== */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3">توزيع الإنتاج</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={(e: any) => e.name} outerRadius={90} dataKey="value">
                    {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} MWh`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3">مقارنة المعاملات</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cfBarData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="معامل السعة" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="معامل الجاهزية" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="معامل الحمل" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====== التحليل ====== */}
      {activeTab === 'analysis' && (
        <div className="space-y-3">
          <Card className="shadow-sm border-blue-200">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3 flex items-center gap-1">
                <Info className="h-4 w-4 text-blue-500" />شرح المؤشرات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-bold mb-1">معامل السعة</p>
                  <p className="text-muted-foreground">الإنتاج الفعلي ÷ (السعة × ساعات الشهر الكاملة). يقيس الاستفادة من السعة. القيم الجيدة: 70-90%.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-bold mb-1">معامل الجاهزية</p>
                  <p className="text-muted-foreground">ساعات التشغيل ÷ ساعات الشهر. يقيس التوفر. القيم الجيدة: 85-95%.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-bold mb-1">نسبة الصافي</p>
                  <p className="text-muted-foreground">الصافي ÷ الإجمالي. يقيس كفاءة الاستهلاك الذاتي. القيم الجيدة: 90-98%.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-bold mb-1">معامل الحمل</p>
                  <p className="text-muted-foreground">متوسط القدرة ÷ السعة. يقيس شدة الاستخدام. القيم الجيدة: 70-95%.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-bold mb-1">الاستطاعة الوسطية</p>
                  <p className="text-muted-foreground">إجمالي الإنتاج ÷ ساعات التشغيل. معدل القدرة الفعلية أثناء التشغيل.</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <p className="font-bold mb-1">الاستطاعة الردية الوسطية</p>
                  <p className="text-muted-foreground">إجمالي الطاقة الردية ÷ ساعات التشغيل. معدل القدرة الردية.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3">توزيع التقييمات</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(['excellent', 'good', 'average', 'poor'] as const).map(level => {
                  const count = report.units.filter((u: any) => u.evaluation === level).length;
                  return (
                    <div key={level} className={cn('rounded-lg p-3 text-center border-2', evalColor(level))}>
                      <p className="text-3xl font-bold">{count}</p>
                      <p className="text-xs mt-1">{evalText(level)}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-bold mb-3">تفصيل الاستهلاك الذاتي للمحطة</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'BT01', value: t.totalBT01, color: 'text-blue-600' },
                  { label: 'BT02', value: t.totalBT02, color: 'text-blue-600' },
                  { label: 'BL01', value: t.totalBL01, color: 'text-orange-600' },
                  { label: 'BM01', value: t.totalBM01, color: 'text-orange-600' },
                  { label: 'التهييج', value: t.totalExcitation, color: 'text-purple-600' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={cn('text-lg font-bold', item.color)}>{fmt(item.value, 1)}</p>
                    <p className="text-[10px] text-muted-foreground">MWh</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}