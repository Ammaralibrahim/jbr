'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import MonthlyTargetCard from '@/components/ui/MonthlyTargetCard';
import PDFDownloadButton from '@/components/ui/PDFDownloadButton';

import {
  Loader2, Zap, Activity, Gauge, TrendingUp, TrendingDown, Clock,
  FileSpreadsheet, Award, AlertTriangle, Target, BarChart3,
  ArrowRight, XCircle, Battery, RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, AreaChart, Area,
} from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [report, setReport] = useState<any>(null);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [yesterdayLogs, setYesterdayLogs] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const now = new Date();


  const fetchAllData = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const yesterday = subDays(now, 1).toISOString().split('T')[0];
      
      const [reportRes, todayRes, yesterdayRes, recentRes] = await Promise.all([
        fetch(`/api/monthly-report?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
        fetch(`/api/daily-logs?date=${today}&limit=50`),
        fetch(`/api/daily-logs?date=${yesterday}&limit=50`),
        fetch('/api/daily-logs?limit=10'),
      ]);

      if (reportRes.ok) {
        const data = await reportRes.json();
        setReport(data.report || null);
      }
      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayLogs(Array.isArray(data.dailyLogs) ? data.dailyLogs : []);
      }
      if (yesterdayRes.ok) {
        const data = await yesterdayRes.json();
        setYesterdayLogs(Array.isArray(data.dailyLogs) ? data.dailyLogs : []);
      }
      if (recentRes.ok) {
        const data = await recentRes.json();
        setRecentLogs(Array.isArray(data.dailyLogs) ? data.dailyLogs : []);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => fetchAllData(false), 300000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const data = useMemo(() => {
    if (!report || !report.units || !report.dailyTotals) return null;
    
    const totalStats = report.totalStats || {};
    const units = report.units || [];
    const dailyTotals = report.dailyTotals || [];
    const safeTodayLogs = Array.isArray(todayLogs) ? todayLogs : [];
    const safeYesterdayLogs = Array.isArray(yesterdayLogs) ? yesterdayLogs : [];
    
    const todayGen = safeTodayLogs.reduce((s: number, l: any) => s + (l.totalGeneration || 0), 0);
    const todayConsumption = safeTodayLogs.reduce((s: number, l: any) => 
      s + (l.bt01Consumption || 0) + (l.bt02Consumption || 0) + 
      (l.bl01Consumption || 0) + (l.bm01Consumption || 0) + (l.excitationConsumption || 0), 0);
    const todayNet = Math.max(0, todayGen - todayConsumption);
    const runningToday = safeTodayLogs.filter((l: any) => l.operatingHours > 0).length;
    
    const yesterdayGen = safeYesterdayLogs.reduce((s: number, l: any) => s + (l.totalGeneration || 0), 0);
    const yesterdayConsumption = safeYesterdayLogs.reduce((s: number, l: any) => 
      s + (l.bt01Consumption || 0) + (l.bt02Consumption || 0) + 
      (l.bl01Consumption || 0) + (l.bm01Consumption || 0) + (l.excitationConsumption || 0), 0);
    const yesterdayNet = Math.max(0, yesterdayGen - yesterdayConsumption);
    const runningYesterday = safeYesterdayLogs.filter((l: any) => l.operatingHours > 0).length;
    
    const genChange = yesterdayGen > 0 ? ((todayGen - yesterdayGen) / yesterdayGen) * 100 : 0;
    
    const daysInMonth = report.daysInMonth || 30;
    const daysWithData = dailyTotals.length;
    const dataCoverage = daysInMonth > 0 ? (daysWithData / daysInMonth) * 100 : 0;
    
    const activeUnits = units.filter((u: any) => (u.daysInOperation || 0) > 0);
    const sortedByEfficiency = [...activeUnits].sort((a: any, b: any) => (b.netGenerationRate || 0) - (a.netGenerationRate || 0));
    const sortedByGeneration = [...activeUnits].sort((a: any, b: any) => (b.totalGeneration || 0) - (a.totalGeneration || 0));
    const bestEfficiency = sortedByEfficiency[0] || null;
    const worstEfficiency = sortedByEfficiency[sortedByEfficiency.length - 1] || null;
    const topProducer = sortedByGeneration[0] || null;
    
    const totalCapacity = units.reduce((s: number, u: any) => s + (u.capacityMW || 0), 0);
    
    return {
      todayGen, todayNet, todayConsumption, runningToday,
      yesterdayGen, yesterdayNet, runningYesterday,
      genChange,
      dataCoverage, daysWithData, daysInMonth,
      bestEfficiency, worstEfficiency, topProducer,
      totalCapacity,
      totalStats, units, dailyTotals,
      safeTodayLogs,
    };
  }, [report, todayLogs, yesterdayLogs]);

  const alerts = useMemo(() => {
    if (!data || !data.units) return [];
    const alerts: any[] = [];
    const { units, safeTodayLogs } = data;

    const todayUnitIds = new Set(safeTodayLogs.map((l: any) => l?.unitId?._id?.toString()).filter(Boolean));
    units.forEach((unit: any) => {
      if (!todayUnitIds.has(unit.unitId)) {
        alerts.push({ type: 'warning', text: `${unit.unitCode}: بيانات اليوم غير مدخلة` });
      }
    });

    units.forEach((unit: any) => {
      if ((unit.daysInOperation || 0) >= 3 && (unit.netGenerationRate || 0) < 75) {
        alerts.push({ type: 'critical', text: `${unit.unitCode}: كفاءة ${(unit.netGenerationRate || 0).toFixed(1)}%` });
      }
    });

    return alerts.slice(0, 5);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <FileSpreadsheet className="h-12 w-12 text-gray-300" />
        <p className="font-semibold text-base">لا توجد بيانات</p>
        <Button size="sm" onClick={() => router.push('/daily-logs/new')}>
          <Zap className="h-4 w-4 ml-1" />إدخال بيانات
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">
            {session?.user?.name} | {format(lastUpdated, 'HH:mm', { locale: ar })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAllData(false)} disabled={isRefreshing}>
            <RefreshCw className={cn('h-4 w-4 ml-1', isRefreshing && 'animate-spin')} />
            تحديث
          </Button>
          <Button size="sm" onClick={() => router.push('/daily-logs/new')}>
            <Zap className="h-4 w-4 ml-1" />إدخال
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push('/monthly-report')}>
            <BarChart3 className="h-4 w-4 ml-1" />تقرير
          </Button>
          <PDFDownloadButton 
  year={now.getFullYear()} 
  month={now.getMonth() + 1} 
  label="تقرير PDF"
  className="h-6 text-xs px-2"
/>
        </div>
      </div>

      {/* Bugün Durumu */}
      <Card className="shadow-sm border-0 bg-gradient-to-l from-blue-600 to-indigo-700 text-white">
        <CardContent className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm opacity-80 mb-1">إنتاج اليوم</p>
              <p className="text-3xl font-bold">{data.todayGen.toFixed(0)} <span className="text-base">MWh</span></p>
              <p className={cn('text-sm mt-1 flex items-center justify-center gap-1', data.genChange >= 0 ? 'text-green-300' : 'text-red-300')}>
                {data.genChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {Math.abs(data.genChange).toFixed(1)}% عن أمس
              </p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">صافي اليوم</p>
              <p className="text-3xl font-bold">{data.todayNet.toFixed(0)} <span className="text-base">MWh</span></p>
              <p className="text-sm opacity-80 mt-1">استهلاك: {data.todayConsumption.toFixed(0)}</p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">وحدات تعمل</p>
              <p className="text-3xl font-bold">{data.runningToday} / 7</p>
              <p className="text-sm opacity-80 mt-1">أمس: {data.runningYesterday} وحدات</p>
            </div>
            <div>
              <p className="text-sm opacity-80 mb-1">تغطية الشهر</p>
              <p className="text-3xl font-bold">{data.dataCoverage.toFixed(0)}%</p>
              <p className="text-sm opacity-80 mt-1">{data.daysWithData} من {data.daysInMonth} يوم</p>
            </div>
          </div>
        </CardContent>
        <MonthlyTargetCard 
  year={now.getFullYear()} 
  month={now.getMonth() + 1} 
  actualGeneration={data?.totalStats?.totalGeneration || 0}
  onTargetSaved={() => fetchAllData(false)}
/>
      </Card>

      {/* Uyarılar */}
      {alerts.length > 0 && (
        <Card className="shadow-sm border-0 bg-gray-50 dark:bg-gray-800/60">
          <CardContent className="p-3">
            <div className="flex flex-wrap gap-2">
              {alerts.map((alert: any, i: number) => (
                <span key={i} className={cn(
                  'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium',
                  alert.type === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                )}>
                  {alert.type === 'critical' ? <XCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {alert.text}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'إنتاج الشهر', value: (data.totalStats.totalGeneration || 0).toLocaleString('en'), unit: 'MWh' },
          { icon: Activity, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', label: 'صافي الشهر', value: (data.totalStats.totalNetGeneration || 0).toLocaleString('en'), unit: 'MWh' },
          { icon: Gauge, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'عامل السعة', value: (data.totalStats.plantCapacityFactor || 0).toFixed(1), unit: '%' },
          { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'نسبة الصافي', value: (data.totalStats.plantNetGenerationRate || 0).toFixed(1), unit: '%' },
          { icon: Battery, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-900/20', label: 'السعة الكلية', value: data.totalCapacity, unit: 'MW' },
          { icon: Clock, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', label: 'ساعات العمل', value: data.totalStats.totalOperatingHours || 0, unit: 'ساعة' },
        ].map((item, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2', item.bg)}>
                <item.icon className={cn('h-5 w-5', item.color)} />
              </div>
              <p className={cn('text-xl font-bold', item.color)}>{item.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.label} ({item.unit})</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Veri Kapsamı */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              تغطية بيانات {format(new Date(), 'MMMM yyyy', { locale: ar })}
            </span>
            <span className="text-sm font-bold">{data.dataCoverage.toFixed(0)}%</span>
          </div>
          <Progress value={data.dataCoverage} className="h-2.5" />
        </CardContent>
      </Card>

      {/* Öne Çıkanlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="shadow-sm border-green-200 dark:border-green-800">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-green-600">{data.bestEfficiency?.unitCode || '—'}</p>
            <p className="text-sm text-muted-foreground">
              الأفضل كفاءة: {(data.bestEfficiency?.netGenerationRate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-yellow-600">{data.topProducer?.unitCode || '—'}</p>
            <p className="text-sm text-muted-foreground">
              الأعلى إنتاج: {(data.topProducer?.totalGeneration || 0).toFixed(0)} MWh
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-red-200 dark:border-red-800">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-red-600">{data.worstEfficiency?.unitCode || '—'}</p>
            <p className="text-sm text-muted-foreground">
              يحتاج اهتمام: {(data.worstEfficiency?.netGenerationRate || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-base font-bold mb-3">آخر 20 يوم - الإنتاج</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.dailyTotals.slice(-20).map((d: any) => ({
                date: format(new Date(d.date), 'dd/MM', { locale: ar }),
                'الإنتاج': d.totalGeneration || 0,
                'الصافي': d.netGeneration || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="الإنتاج" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="الصافي" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-base font-bold mb-3">مقارنة الوحدات</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.units.map((u: any) => ({
                name: u.unitCode,
                'الإنتاج': u.totalGeneration || 0,
                'الصافي': u.netGeneration || 0,
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="الإنتاج" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="الصافي" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ünite Durumları */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h3 className="text-base font-bold mb-3">حالة الوحدات</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {data.units.map((unit: any) => {
              const eff = unit.netGenerationRate || 0;
              const isStopped = (unit.totalOperatingHours || 0) === 0;
              const status = isStopped ? 'متوقفة' : eff >= 90 ? 'ممتاز' : eff >= 80 ? 'جيد' : 'ضعيف';
              const bgColor = isStopped ? 'bg-gray-50 dark:bg-gray-800' : eff >= 90 ? 'bg-green-50 dark:bg-green-900/20' : eff >= 80 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-red-50 dark:bg-red-900/20';
              const txtColor = isStopped ? 'text-gray-500' : eff >= 90 ? 'text-green-600' : eff >= 80 ? 'text-yellow-600' : 'text-red-600';
              
              return (
                <div key={unit.unitId} className={cn('rounded-xl p-3 text-center border', bgColor)}>
                  <p className="text-base font-bold">{unit.unitCode}</p>
                  <p className={cn('text-sm font-semibold', txtColor)}>{status}</p>
                  <p className="text-lg font-bold mt-1">{(unit.totalGeneration || 0).toFixed(0)} <span className="text-xs">MWh</span></p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Son Kayıtlar */}
      {recentLogs.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">آخر السجلات</h3>
              <Button variant="ghost" size="sm" onClick={() => router.push('/daily-logs')}>
                عرض الكل <ArrowRight className="h-4 w-4 mr-1" />
              </Button>
            </div>
            <div className="space-y-1">
              {recentLogs.slice(0, 5).map((log: any) => (
                <div 
                  key={log._id} 
                  className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => router.push(`/daily-logs/${log._id}`)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant={log.unitId?.unitType === 'Steam' ? 'default' : 'secondary'} className="text-xs">
                      {log.unitId?.unitCode}
                    </Badge>
                    <span className="text-muted-foreground">{format(new Date(log.date), 'dd/MM/yyyy', { locale: ar })}</span>
                  </div>
                  <span className="font-bold text-blue-600">{(log.totalGeneration || 0).toFixed(1)} MWh</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}