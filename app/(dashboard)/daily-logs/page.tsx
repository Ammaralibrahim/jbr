'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  Plus,
  Search,
  Download,
  Printer,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileSpreadsheet,
  X,
  Zap,
  Flame,
  Thermometer,
  Calendar,
  Clock,
  Gauge,
  CheckSquare,
  Square,
  AlertTriangle,
  Upload,
  ShieldAlert,
  Trash,
  CheckCircle2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DailyLogsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const pageSize = 100;
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteFilteredConfirm, setShowDeleteFilteredConfirm] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [deleteFilteredConfirmText, setDeleteFilteredConfirmText] = useState('');
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  
  const isAdmin = session?.user?.role === 'Admin';
  const isManager = session?.user?.role === 'PlantManager';
  const canDelete = isAdmin || isManager;
  const canDeleteAll = isAdmin;

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/daily-logs?limit=1000');
      const data = await response.json();
      if (data.dailyLogs) {
        const unitOrder: Record<string, number> = {
          'ST1': 1, 'ST2': 2, 'ST3': 3,
          'GT1': 4, 'GT2': 5, 'GT3': 6, 'GT4': 7,
        };
        
        const sortedLogs = data.dailyLogs.sort((a: any, b: any) => {
          const unitA = a.unitId?.unitCode || 'ZZZ';
          const unitB = b.unitId?.unitCode || 'ZZZ';
          const orderA = unitOrder[unitA] || 99;
          const orderB = unitOrder[unitB] || 99;
          
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        setLogs(sortedLogs);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('فشل في تحميل السجلات');
    } finally {
      setIsLoading(false);
    }
  };

  const uniqueUnits = useMemo(() => {
    const units = new Map();
    logs.forEach(log => {
      if (log.unitId) units.set(log.unitId._id, log.unitId);
    });
    return Array.from(units.values());
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = 
        log.unitId?.unitCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.unitId?.unitNameAr?.includes(searchTerm);
      const matchesDate = filterDate ? new Date(log.date).toISOString().split('T')[0] === filterDate : true;
      const matchesUnit = filterUnit ? log.unitId?._id === filterUnit : true;
      return matchesSearch && matchesDate && matchesUnit;
    });
  }, [logs, searchTerm, filterDate, filterUnit]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLogs.length);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  const handleFilterChange = useCallback((setter: any, value: string) => {
    setter(value);
    setCurrentPage(1);
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === currentLogs.length && currentLogs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentLogs.map(log => log._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectMode(false);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('لم يتم تحديد أي سجلات');
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/daily-logs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || `تم حذف ${data.deletedCount} سجل`);
        setSelectedIds(new Set());
        setIsSelectMode(false);
        setShowBulkDeleteConfirm(false);
        fetchLogs();
      } else {
        throw new Error(data.error || 'فشل في الحذف');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في الحذف');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText !== 'DELETE ALL') {
      toast.error('يرجى كتابة DELETE ALL للتأكيد');
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await fetch('/api/daily-logs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || `تم حذف ${data.deletedCount} سجل`);
        setShowDeleteAllConfirm(false);
        setDeleteAllConfirmText('');
        fetchLogs();
      } else {
        throw new Error(data.error || 'فشل في الحذف');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في الحذف');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteFiltered = async () => {
    if (deleteFilteredConfirmText !== 'DELETE') {
      toast.error('يرجى كتابة DELETE للتأكيد');
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await fetch('/api/daily-logs/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          deleteAllFiltered: true,
          filterUnitId: filterUnit || undefined,
          filterStartDate: filterDate || undefined,
          filterEndDate: filterDate || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || `تم حذف ${data.deletedCount} سجل`);
        setShowDeleteFilteredConfirm(false);
        setDeleteFilteredConfirmText('');
        clearFilters();
        fetchLogs();
      } else {
        throw new Error(data.error || 'فشل في الحذف');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في الحذف');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('حذف هذا السجل؟')) return;
    try {
      const response = await fetch(`/api/daily-logs/${id}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('تم الحذف');
        fetchLogs();
      }
    } catch {
      toast.error('فشل الحذف');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterUnit('');
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const headers = ['التاريخ','الوحدة','ساعات','P max','P min','Q max','Q min','عداد بداية','عداد نهاية','الإنتاج','BT01','BT02','BL01','BM01','تهييج','ردي','حرارة'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.date), 'dd/MM/yyyy', { locale: ar }),
      log.unitId?.unitCode || '',
      log.operatingHours, log.pMax, log.pMin, log.qMax, log.qMin,
      log.generatorStart, log.generatorEnd,
      log.totalGeneration?.toFixed(2) || '0',
      log.bt01Consumption?.toFixed(2) || '0',
      log.bt02Consumption?.toFixed(2) || '0',
      log.bl01Consumption?.toFixed(2) || '0',
      log.bm01Consumption?.toFixed(2) || '0',
      ((log.excitationEnd || 0) - (log.excitationStart || 0)).toFixed(2),
      ((log.reactiveEnd || 0) - (log.reactiveStart || 0)).toFixed(2),
      log.ambientTemperature
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-logs.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('تم التصدير');
  };

  const getNetGeneration = (log: any) => {
    const totalConsumption = 
      (log.bt01Consumption || 0) + (log.bt02Consumption || 0) + 
      (log.bl01Consumption || 0) + (log.bm01Consumption || 0) + 
      (log.excitationConsumption || 0);
    return (log.totalGeneration || 0) - totalConsumption;
  };

  const getExcitationConsumption = (log: any) => {
    return (log.excitationEnd || 0) - (log.excitationStart || 0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Üst Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">السجلات اليومية</h1>
          <Badge variant="outline" className="text-xs">{filteredLogs.length} / {logs.length}</Badge>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {isSelectMode ? (
            <>
              <Badge variant="destructive" className="text-xs h-8 px-3 flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5" />
                {selectedIds.size} محدد
              </Badge>
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={selectedIds.size === 0}
              >
                <Trash2 className="h-3.5 w-3.5 ml-1" />
                حذف المحدد
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearSelection}>
                <X className="h-3.5 w-3.5 ml-1" />
                إلغاء
              </Button>
            </>
          ) : (
            <>
              {canDelete && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => setIsSelectMode(true)}
                  >
                    <CheckSquare className="h-3.5 w-3.5 ml-1" />
                    تحديد متعدد
                  </Button>
                  
                  {(filterDate || filterUnit || searchTerm) && canDeleteAll && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs text-red-600 hover:text-red-700 border-red-300 hover:border-red-500"
                      onClick={() => setShowDeleteFilteredConfirm(true)}
                    >
                      <Trash className="h-3.5 w-3.5 ml-1" />
                      حذف المفلتر ({filteredLogs.length})
                    </Button>
                  )}
                  
                  {canDeleteAll && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setShowDeleteAllConfirm(true)}
                    >
                      <ShieldAlert className="h-3.5 w-3.5 ml-1" />
                      حذف الكل
                    </Button>
                  )}
                </>
              )}
              
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5 ml-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.print()}>
                <Printer className="h-3.5 w-3.5 ml-1" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push('/daily-logs/import')}>
                <Upload className="h-3.5 w-3.5 ml-1" />
                استيراد
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={() => router.push('/daily-logs/new')}>
                <Plus className="h-3.5 w-3.5 ml-1" />
                جديد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-1.5 flex-wrap items-center">
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
            className="pr-8 h-8 text-xs"
          />
        </div>
        <Input
          type="date"
          value={filterDate}
          onChange={(e) => handleFilterChange(setFilterDate, e.target.value)}
          className="w-36 h-8 text-xs"
        />
        <select
          value={filterUnit}
          onChange={(e) => handleFilterChange(setFilterUnit, e.target.value)}
          className="w-28 h-8 text-xs px-1.5 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
        >
          <option value="">الكل</option>
          {uniqueUnits.map((unit: any) => (
            <option key={unit._id} value={unit._id}>{unit.unitCode}</option>
          ))}
        </select>
        {(searchTerm || filterDate || filterUnit) && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Tablo */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/60 sticky top-0 z-10">
                {isSelectMode && (
                  <TableHead className="h-7 px-1.5 text-center border-l w-8">
                    <button onClick={toggleSelectAll}>
                      {selectedIds.size === currentLogs.length && currentLogs.length > 0 ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">اليوم</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">الوحدة</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">ساعات</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">P max/min</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">Q max/min</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l bg-yellow-50 whitespace-nowrap">عداد المولد</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l text-blue-600 whitespace-nowrap">الإنتاج</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">BT01</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">BT02</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">BL01</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">BM01</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">تهييج</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l text-green-600 whitespace-nowrap">الصافي</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center border-l whitespace-nowrap">°C</TableHead>
                <TableHead className="h-7 px-1.5 text-[10px] font-bold text-center whitespace-nowrap">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSelectMode ? 16 : 15} className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                    <span className="text-xs">لا توجد بيانات</span>
                  </TableCell>
                </TableRow>
              ) : (
                currentLogs.map((log: any) => {
                  const netGen = getNetGeneration(log);
                  const excitationCons = getExcitationConsumption(log);
                  const isSelected = selectedIds.has(log._id);

                  return (
                    <TableRow 
                      key={log._id} 
                      className={cn(
                        'transition-colors cursor-pointer',
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      )}
                      onClick={() => isSelectMode ? toggleSelect(log._id) : (setSelectedLog(log), setShowDetail(true))}
                    >
                      {isSelectMode && (
                        <TableCell className="px-1.5 py-1.5 text-center border-l">
                          {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600 mx-auto" /> : <Square className="h-4 w-4 text-gray-400 mx-auto" />}
                        </TableCell>
                      )}
                      <TableCell className="px-1.5 py-1.5 text-[10px] font-medium text-center border-l whitespace-nowrap">
                        {format(new Date(log.date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 text-center border-l">
                        <Badge variant={log.unitId?.unitType === 'Steam' ? 'default' : 'secondary'} className="text-[9px] h-4 px-1">
                          {log.unitId?.unitCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l">{log.operatingHours}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-gray-500 whitespace-nowrap">{log.pMax}/{log.pMin}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-gray-500 whitespace-nowrap">{log.qMax}/{log.qMin}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l bg-yellow-50/50 whitespace-nowrap">{log.generatorStart}→{log.generatorEnd}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l font-bold text-blue-600 whitespace-nowrap">{log.totalGeneration?.toFixed(1)}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-orange-600 whitespace-nowrap">{log.bt01Consumption?.toFixed(1) || '0'}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-orange-600 whitespace-nowrap">{log.bt02Consumption?.toFixed(1) || '0'}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-red-500 whitespace-nowrap">{log.bl01Consumption?.toFixed(1) || '0'}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-red-500 whitespace-nowrap">{log.bm01Consumption?.toFixed(1) || '0'}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-purple-600 whitespace-nowrap">{excitationCons.toFixed(1)}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l font-bold text-green-600 whitespace-nowrap">{netGen.toFixed(1)}</TableCell>
                      <TableCell className="px-1.5 py-1.5 text-[10px] text-center border-l text-gray-500 whitespace-nowrap">{log.ambientTemperature}°</TableCell>
                      <TableCell className="px-1 py-1.5">
                        <div className="flex gap-0.5 justify-center" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => router.push(`/daily-logs/${log._id}`)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => router.push(`/daily-logs/${log._id}?edit=true`)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-red-500" onClick={() => handleDeleteSingle(log._id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Gelişmiş Sayfalama */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          <div className="text-muted-foreground">
            عرض <span className="font-bold">{startIndex + 1}</span> - <span className="font-bold">{endIndex}</span> من <span className="font-bold">{filteredLogs.length}</span> سجل
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentPage(1)} 
              disabled={currentPage === 1}
              title="الصفحة الأولى"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              title="السابق"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            
            <div className="flex gap-0.5 mx-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                      'h-7 w-7 text-xs font-bold',
                      currentPage === pageNum && 'bg-blue-600 text-white'
                    )}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
              title="التالي"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCurrentPage(totalPages)} 
              disabled={currentPage === totalPages}
              title="الصفحة الأخيرة"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          <div className="text-muted-foreground">
            صفحة <span className="font-bold">{currentPage}</span> من <span className="font-bold">{totalPages}</span>
          </div>
        </div>
      )}

      {/* Detay Modal */}
      {showDetail && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-sm">تفاصيل السجل</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowDetail(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p className="text-[9px] text-muted-foreground">التاريخ</p>
                <p className="text-xs font-semibold">{format(new Date(selectedLog.date), 'dd/MM/yyyy', { locale: ar })}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p className="text-[9px] text-muted-foreground">الوحدة</p>
                <p className="text-xs font-semibold">{selectedLog.unitId?.unitCode}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p className="text-[9px] text-muted-foreground">ساعات</p>
                <p className="text-xs font-semibold">{selectedLog.operatingHours}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p className="text-[9px] text-muted-foreground">P max/min</p>
                <p className="text-xs font-semibold">{selectedLog.pMax}/{selectedLog.pMin}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p className="text-[9px] text-muted-foreground">Q max/min</p>
                <p className="text-xs font-semibold">{selectedLog.qMax}/{selectedLog.qMin}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
                <p className="text-[9px] text-muted-foreground">درجة الحرارة</p>
                <p className="text-xs font-semibold">{selectedLog.ambientTemperature}°C</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">عداد المولد</p>
                <p className="text-xs font-semibold">{selectedLog.generatorStart} → {selectedLog.generatorEnd}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">الإنتاج الكلي</p>
                <p className="text-xs font-bold text-blue-600">{selectedLog.totalGeneration?.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">الإنتاج الصافي</p>
                <p className="text-xs font-bold text-green-600">{getNetGeneration(selectedLog).toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">BT01</p>
                <p className="text-xs">{selectedLog.bt01Start || 0} → {selectedLog.bt01End || 0}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">BT02</p>
                <p className="text-xs">{selectedLog.bt02Start || 0} → {selectedLog.bt02End || 0}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">BL01</p>
                <p className="text-xs">{selectedLog.bl01Start || 0} → {selectedLog.bl01End || 0}</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">BM01</p>
                <p className="text-xs">{selectedLog.bm01Start || 0} → {selectedLog.bm01End || 0}</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">تهييج</p>
                <p className="text-xs">{selectedLog.excitationStart || 0} → {selectedLog.excitationEnd || 0}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 rounded p-2">
                <p className="text-[9px] text-muted-foreground">ردي</p>
                <p className="text-xs">{selectedLog.reactiveStart || 0} → {selectedLog.reactiveEnd || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Silme Onay Modalı */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBulkDeleteConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">حذف متعدد</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                حذف <span className="font-bold text-red-600">{selectedIds.size}</span> سجل محدد؟
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowBulkDeleteConfirm(false)} disabled={isBulkDeleting}>
                  إلغاء
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                  {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Trash2 className="h-4 w-4 ml-2" />}
                  تأكيد
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tümünü Silme Onay Modalı */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteAllConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center">
                  <ShieldAlert className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2 text-red-600">تحذير خطير!</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                أنت على وشك حذف <span className="font-bold text-red-600">جميع السجلات ({logs.length})</span>
                <br />
                هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <div className="mb-4">
                <label className="text-xs font-semibold mb-1 block">اكتب DELETE ALL للتأكيد</label>
                <Input
                  value={deleteAllConfirmText}
                  onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                  placeholder="DELETE ALL"
                  className="text-center font-bold"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowDeleteAllConfirm(false); setDeleteAllConfirmText(''); }}
                  disabled={isDeletingAll}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAll}
                  disabled={isDeletingAll || deleteAllConfirmText !== 'DELETE ALL'}
                >
                  {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Trash2 className="h-4 w-4 ml-2" />}
                  حذف الكل
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtrelenmiş Silme Onay Modalı */}
      {showDeleteFilteredConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteFilteredConfirm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-center mb-2">حذف المفلتر</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                سيتم حذف <span className="font-bold text-red-600">{filteredLogs.length}</span> سجل مفلتر
                <br />
                لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="mb-4">
                <label className="text-xs font-semibold mb-1 block">اكتب DELETE للتأكيد</label>
                <Input
                  value={deleteFilteredConfirmText}
                  onChange={(e) => setDeleteFilteredConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="text-center font-bold"
                  dir="ltr"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowDeleteFilteredConfirm(false); setDeleteFilteredConfirmText(''); }}
                  disabled={isDeletingAll}
                >
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteFiltered}
                  disabled={isDeletingAll || deleteFilteredConfirmText !== 'DELETE'}
                >
                  {isDeletingAll ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Trash2 className="h-4 w-4 ml-2" />}
                  حذف
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}