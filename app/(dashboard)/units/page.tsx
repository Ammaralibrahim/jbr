'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Loader2, Zap, Flame, Activity, Clock, BarChart3,
  FileSpreadsheet, Search, Eye, Gauge, Target,
  Award, AlertTriangle, ChevronRight, ChevronLeft,
  Battery, RefreshCw, Save, Pencil, X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface Unit {
  _id: string;
  unitCode: string;
  unitNameAr: string;
  unitType: 'Steam' | 'Gas';
  capacityMW: number;
  multiplier: number;
  stats?: any;
}

export default function UnitsPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string>('');
  const [unitLogs, setUnitLogs] = useState<any[]>([]);
  const [unitStats, setUnitStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Multiplier düzenleme state'leri
  const [editingMultiplierId, setEditingMultiplierId] = useState<string | null>(null);
  const [editMultiplierValue, setEditMultiplierValue] = useState('');
  const [isSavingMultiplier, setIsSavingMultiplier] = useState(false);

  const pageSize = 50;

  const fetchUnits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/units?stats=true');
      if (response.ok) {
        const data = await response.json();
        const unitList = Array.isArray(data.units) ? data.units : [];
        const unitOrder: Record<string, number> = {
          'ST1': 1, 'ST2': 2, 'ST3': 3,
          'GT1': 4, 'GT2': 5, 'GT3': 6, 'GT4': 7,
        };
        unitList.sort((a: Unit, b: Unit) => (unitOrder[a.unitCode] || 99) - (unitOrder[b.unitCode] || 99));
        setUnits(unitList);
        if (unitList.length > 0 && !activeUnitId) {
          setActiveUnitId(unitList[0]._id);
        }
      }
    } catch {
      toast.error('فشل في تحميل الوحدات');
    } finally {
      setIsLoading(false);
    }
  }, [activeUnitId]);

  const fetchUnitData = useCallback(async (unitId: string, page: number = 1) => {
    if (!unitId) return;
    setIsLoadingLogs(true);
    try {
      const response = await fetch(`/api/units/${unitId}?logs=true&page=${page}&limit=${pageSize}`);
      if (response.ok) {
        const data = await response.json();
        setUnitLogs(Array.isArray(data.logs) ? data.logs : []);
        setUnitStats(data.stats || null);
        setTotalLogs(data.totalLogs || 0);
      }
    } catch {
      toast.error('فشل في تحميل بيانات الوحدة');
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    if (activeUnitId) {
      fetchUnitData(activeUnitId, currentPage);
    }
  }, [activeUnitId, currentPage, fetchUnitData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUnits();
    if (activeUnitId) await fetchUnitData(activeUnitId, currentPage);
    setIsRefreshing(false);
    toast.success('تم التحديث');
  };

  // Multiplier düzenleme
  const startEditMultiplier = (unit: Unit) => {
    setEditingMultiplierId(unit._id);
    setEditMultiplierValue(unit.multiplier.toString());
  };

  const cancelEditMultiplier = () => {
    setEditingMultiplierId(null);
    setEditMultiplierValue('');
  };

  const saveMultiplier = async (unitId: string) => {
    const value = Number(editMultiplierValue);
    if (!value || value <= 0) {
      toast.error('المعامل يجب أن يكون أكبر من صفر');
      return;
    }

    setIsSavingMultiplier(true);
    try {
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplier: value }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('تم تحديث المعامل بنجاح');
        cancelEditMultiplier();
        fetchUnits();
      } else {
        toast.error(data.error || 'فشل في تحديث المعامل');
      }
    } catch {
      toast.error('فشل في تحديث المعامل');
    } finally {
      setIsSavingMultiplier(false);
    }
  };

  const activeUnit = useMemo(() => {
    return units.find(u => u._id === activeUnitId) || null;
  }, [units, activeUnitId]);

  const filteredLogs = useMemo(() => {
    return unitLogs.filter(log => {
      const dateStr = format(new Date(log.date), 'dd/MM/yyyy', { locale: ar });
      return dateStr.includes(searchTerm);
    });
  }, [unitLogs, searchTerm]);

  const chartData = useMemo(() => {
    return [...unitLogs].reverse().slice(0, 30).map(log => {
      const consumption = (log.bt01Consumption || 0) + (log.bt02Consumption || 0) +
        (log.bl01Consumption || 0) + (log.bm01Consumption || 0) + (log.excitationConsumption || 0);
      return {
        date: format(new Date(log.date), 'dd/MM', { locale: ar }),
        'الإنتاج': log.totalGeneration || 0,
        'الصافي': (log.totalGeneration || 0) - consumption,
        'الاستهلاك': consumption,
      };
    });
  }, [unitLogs]);

  const totalPages = Math.ceil(totalLogs / pageSize);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
        <p className="text-sm text-muted-foreground">جاري تحميل الوحدات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-full">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">الوحدات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {units.length} وحدات نشطة | إجمالي السعة: {units.reduce((s, u) => s + (u.capacityMW || 0), 0)} MW
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={cn('h-4 w-4 ml-1', isRefreshing && 'animate-spin')} />
          تحديث
        </Button>
      </div>

      {/* Ünite Tabları */}
      <div className="flex gap-2 flex-wrap bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
        {units.map(unit => (
          <button
            key={unit._id}
            onClick={() => { setActiveUnitId(unit._id); setCurrentPage(1); setSearchTerm(''); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              activeUnitId === unit._id
                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'
            )}
          >
            {unit.unitType === 'Steam' ? (
              <Flame className="h-4 w-4 text-orange-500" />
            ) : (
              <Zap className="h-4 w-4 text-blue-500" />
            )}
            <span className="font-bold">{unit.unitCode}</span>
            <span className="text-xs text-muted-foreground">{unit.unitNameAr}</span>
          </button>
        ))}
      </div>

      {/* Aktif Ünite Bilgisi + Multiplier Düzenleme */}
      {activeUnit && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  activeUnit.unitType === 'Steam'
                    ? 'bg-orange-100 dark:bg-orange-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                )}>
                  {activeUnit.unitType === 'Steam' ? (
                    <Flame className="h-7 w-7 text-orange-600" />
                  ) : (
                    <Zap className="h-7 w-7 text-blue-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{activeUnit.unitCode}</h2>
                    <Badge variant={activeUnit.unitType === 'Steam' ? 'default' : 'secondary'}>
                      {activeUnit.unitType === 'Steam' ? 'بخارية' : 'غازية'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{activeUnit.unitNameAr}</p>
                </div>
              </div>

              <div className="flex gap-4 text-sm items-end">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">السعة</p>
                  <p className="font-bold text-lg">{activeUnit.capacityMW} MW</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">المعامل</p>
                  {editingMultiplierId === activeUnit._id ? (
                    <div className="flex gap-1.5 items-center">
                      <Input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={editMultiplierValue}
                        onChange={(e) => setEditMultiplierValue(e.target.value)}
                        className="h-8 w-24 text-sm"
                      />
                      <Button size="sm" className="h-8" onClick={() => saveMultiplier(activeUnit._id)} disabled={isSavingMultiplier}>
                        {isSavingMultiplier ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Save className="h-3.5 w-3.5 ml-1" />}
                        حفظ
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={cancelEditMultiplier}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-lg text-blue-600">{activeUnit.multiplier}</p>
                      <Button size="sm" variant="outline" className="h-7" onClick={() => startEditMultiplier(activeUnit)}>
                        <Pencil className="h-3.5 w-3.5 ml-1" />
                        تعديل
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* İstatistikler */}
      {unitStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Zap className="h-5 w-5 text-blue-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-blue-600">{(unitStats.totalGeneration || 0).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">إنتاج (MWh)</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Activity className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-600">
                {Math.max(0, (unitStats.totalGeneration || 0) - (unitStats.totalConsumption || 0)).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">صافي (MWh)</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 text-orange-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-orange-600">{unitStats.totalHours || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">ساعات العمل</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Gauge className="h-5 w-5 text-purple-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-purple-600">
                {activeUnit && unitStats.totalHours > 0
                  ? ((unitStats.totalGeneration / (activeUnit.capacityMW * unitStats.totalHours)) * 100).toFixed(1)
                  : '0'}%
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">عامل الحمل</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Target className="h-5 w-5 text-cyan-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-cyan-600">{unitStats.totalDays || 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">أيام التشغيل</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3 text-center">
              <Battery className="h-5 w-5 text-red-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-600">{(unitStats.totalConsumption || 0).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">استهلاك (MWh)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grafik */}
      {chartData.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h3 className="text-base font-bold mb-3">آخر 30 يوم - الإنتاج والاستهلاك</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="الإنتاج" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="الصافي" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                <Area type="monotone" dataKey="الاستهلاك" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Kayıtlar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-base font-bold">السجلات اليومية</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="بحث بالتاريخ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9 h-9 text-sm w-48"
                />
              </div>
              <Badge variant="outline">{totalLogs} سجل</Badge>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">لا توجد سجلات لهذه الوحدة</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-gray-800/60">
                      <TableHead className="h-10 px-3 text-center font-bold">التاريخ</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold">ساعات</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold">P max/min</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold">Q max/min</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold text-blue-600">الإنتاج</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold text-orange-600">الاستهلاك</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold text-green-600">الصافي</TableHead>
                      <TableHead className="h-10 px-3 text-center font-bold">إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log: any) => {
                      const consumption = (log.bt01Consumption || 0) + (log.bt02Consumption || 0) +
                        (log.bl01Consumption || 0) + (log.bm01Consumption || 0) + (log.excitationConsumption || 0);
                      const net = (log.totalGeneration || 0) - consumption;

                      return (
                        <TableRow
                          key={log._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                          onClick={() => router.push(`/daily-logs/${log._id}`)}
                        >
                          <TableCell className="px-3 py-2 text-center font-medium">
                            {format(new Date(log.date), 'dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center">{log.operatingHours}</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-500">{log.pMax}/{log.pMin}</TableCell>
                          <TableCell className="px-3 py-2 text-center text-gray-500">{log.qMax}/{log.qMin}</TableCell>
                          <TableCell className="px-3 py-2 text-center font-bold text-blue-600">
                            {(log.totalGeneration || 0).toFixed(1)}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center text-orange-600">
                            {consumption.toFixed(1)}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center font-bold text-green-600">
                            {net.toFixed(1)}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/daily-logs/${log._id}`); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">
                    صفحة {currentPage} من {totalPages} ({totalLogs} سجل)
                  </span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      <ChevronRight className="h-4 w-4 ml-1" />السابق
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                      التالي<ChevronLeft className="h-4 w-4 mr-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}