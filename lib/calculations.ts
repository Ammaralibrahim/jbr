import { DailyLog, Unit, MonthlySummary, IUnit, IDailyLog } from '@/models';
import mongoose from 'mongoose';

export interface GenerationCalculation {
  totalGeneration: number;
  bt01Consumption: number;
  bt02Consumption: number;
  bl01Consumption: number;
  bm01Consumption: number;
  excitationConsumption: number;
  totalConsumption: number;
  netGeneration: number;
}

export interface UnitMonthlyStats {
  unitId: string;
  unitCode: string;
  unitNameAr: string;
  unitType: 'Steam' | 'Gas';
  capacityMW: number;
  totalOperatingHours: number;
  totalGeneration: number;
  netGeneration: number;
  totalConsumption: number;
  averagePMax: number;
  averagePMin: number;
  averageQMax: number;
  averageQMin: number;
  totalBT01Consumption: number;
  totalBT02Consumption: number;
  totalBL01Consumption: number;
  totalBM01Consumption: number;
  totalExcitationConsumption: number;
  capacityFactor: number;
  availabilityFactor: number;
  netGenerationRate: number;
  loadFactor: number;
  utilizationRate: number;
  daysInOperation: number;
  dailyData: Array<{
    date: Date;
    operatingHours: number;
    totalGeneration: number;
    netGeneration: number;
  }>;
}

export interface MonthlyReport {
  year: number;
  month: number;
  daysInMonth: number;
  units: UnitMonthlyStats[];
  totalStats: {
    totalGeneration: number;
    totalNetGeneration: number;
    totalConsumption: number;
    totalOperatingHours: number;
    plantCapacityFactor: number;
    plantAvailabilityFactor: number;
    plantNetGenerationRate: number;
    totalCapacity: number;
    peakDailyGeneration: number;
    lowestDailyGeneration: number;
    averageDailyGeneration: number;
  };
  dailyTotals: Array<{
    date: Date;
    totalGeneration: number;
    netGeneration: number;
    totalConsumption: number;
    operatingUnits: number;
  }>;
}

export function calculateGeneration(
  generatorStart: number,
  generatorEnd: number,
  multiplier: number
): number {
  return Math.max(0, (generatorEnd - generatorStart) * multiplier);
}

export function calculateConsumption(start: number, end: number): number {
  return Math.max(0, end - start);
}

export function calculateTotalConsumption(
  bt01Consumption: number,
  bt02Consumption: number,
  bl01Consumption: number,
  bm01Consumption: number,
  excitationConsumption: number
): number {
  return bt01Consumption + bt02Consumption + bl01Consumption + bm01Consumption + excitationConsumption;
}

export function calculateNetGeneration(
  totalGeneration: number,
  totalConsumption: number
): number {
  return Math.max(0, totalGeneration - totalConsumption);
}

export function calculateCapacityFactor(
  totalGeneration: number,
  capacityMW: number,
  totalHoursInMonth: number
): number {
  if (capacityMW === 0 || totalHoursInMonth === 0) return 0;
  return (totalGeneration / (capacityMW * totalHoursInMonth)) * 100;
}

export function calculateAvailabilityFactor(
  operatingHours: number,
  totalHoursInMonth: number
): number {
  if (totalHoursInMonth === 0) return 0;
  return (operatingHours / totalHoursInMonth) * 100;
}

export function calculateNetGenerationRate(
  netGeneration: number,
  totalGeneration: number
): number {
  if (totalGeneration === 0) return 0;
  return (netGeneration / totalGeneration) * 100;
}

export function calculateLoadFactor(
  totalGeneration: number,
  operatingHours: number,
  capacityMW: number
): number {
  if (operatingHours === 0 || capacityMW === 0) return 0;
  const averagePower = totalGeneration / operatingHours;
  return (averagePower / capacityMW) * 100;
}

export function calculateUtilizationRate(
  netGeneration: number,
  capacityMW: number,
  totalHoursInMonth: number
): number {
  if (capacityMW === 0 || totalHoursInMonth === 0) return 0;
  return (netGeneration / (capacityMW * totalHoursInMonth)) * 100;
}

export function calculateDailyLogFromInput(input: {
  unit: IUnit;
  generatorStart: number;
  generatorEnd: number;
  bt01Start: number;
  bt01End: number;
  bt02Start: number;
  bt02End: number;
  bl01Start: number;
  bl01End: number;
  bm01Start: number;
  bm01End: number;
  excitationStart: number;
  excitationEnd: number;
  reactiveStart: number;
  reactiveEnd: number;
}): GenerationCalculation {
  const totalGeneration = calculateGeneration(input.generatorStart, input.generatorEnd, input.unit.multiplier);
  const bt01Consumption = calculateConsumption(input.bt01Start, input.bt01End);
  const bt02Consumption = calculateConsumption(input.bt02Start, input.bt02End);
  const bl01Consumption = calculateConsumption(input.bl01Start, input.bl01End);
  const bm01Consumption = calculateConsumption(input.bm01Start, input.bm01End);
  const excitationConsumption = calculateConsumption(input.excitationStart, input.excitationEnd);
  const totalConsumption = calculateTotalConsumption(bt01Consumption, bt02Consumption, bl01Consumption, bm01Consumption, excitationConsumption);
  const netGeneration = calculateNetGeneration(totalGeneration, totalConsumption);

  return {
    totalGeneration,
    bt01Consumption,
    bt02Consumption,
    bl01Consumption,
    bm01Consumption,
    excitationConsumption,
    totalConsumption,
    netGeneration,
  };
}

export async function generateMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReport> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalHoursInMonth = daysInMonth * 24;

  const units = await Unit.find({ isActive: true }).sort({ sortOrder: 1 });
  const unitStats: UnitMonthlyStats[] = [];
  const dailyTotalsMap = new Map<string, {
    date: Date;
    totalGeneration: number;
    netGeneration: number;
    totalConsumption: number;
    unitCount: number;
  }>();

  for (const unit of units) {
    const dailyLogs = await DailyLog.find({
      unitId: unit._id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const totalOperatingHours = dailyLogs.reduce((sum, log) => sum + log.operatingHours, 0);
    const totalGeneration = dailyLogs.reduce((sum, log) => sum + log.totalGeneration, 0);
    const totalBT01Consumption = dailyLogs.reduce((sum, log) => sum + (log.bt01Consumption || 0), 0);
    const totalBT02Consumption = dailyLogs.reduce((sum, log) => sum + (log.bt02Consumption || 0), 0);
    const totalBL01Consumption = dailyLogs.reduce((sum, log) => sum + (log.bl01Consumption || 0), 0);
    const totalBM01Consumption = dailyLogs.reduce((sum, log) => sum + (log.bm01Consumption || 0), 0);
    const totalExcitationConsumption = dailyLogs.reduce((sum, log) => sum + (log.excitationConsumption || 0), 0);

    const totalConsumption = calculateTotalConsumption(
      totalBT01Consumption, totalBT02Consumption, totalBL01Consumption, totalBM01Consumption, totalExcitationConsumption
    );
    const netGeneration = calculateNetGeneration(totalGeneration, totalConsumption);

    const daysInOperation = dailyLogs.filter(log => log.operatingHours > 0).length;
    const averagePMax = dailyLogs.length > 0 ? dailyLogs.reduce((s, l) => s + l.pMax, 0) / dailyLogs.length : 0;
    const averagePMin = dailyLogs.length > 0 ? dailyLogs.reduce((s, l) => s + l.pMin, 0) / dailyLogs.length : 0;
    const averageQMax = dailyLogs.length > 0 ? dailyLogs.reduce((s, l) => s + l.qMax, 0) / dailyLogs.length : 0;
    const averageQMin = dailyLogs.length > 0 ? dailyLogs.reduce((s, l) => s + l.qMin, 0) / dailyLogs.length : 0;

    const capacityFactor = calculateCapacityFactor(totalGeneration, unit.capacityMW, totalHoursInMonth);
    const availabilityFactor = calculateAvailabilityFactor(totalOperatingHours, totalHoursInMonth);
    const netGenerationRate = calculateNetGenerationRate(netGeneration, totalGeneration);
    const loadFactor = calculateLoadFactor(totalGeneration, totalOperatingHours, unit.capacityMW);
    const utilizationRate = calculateUtilizationRate(netGeneration, unit.capacityMW, totalHoursInMonth);

    const dailyData = dailyLogs.map(log => ({
      date: log.date,
      operatingHours: log.operatingHours,
      totalGeneration: log.totalGeneration,
      netGeneration: log.totalGeneration - (log.bt01Consumption || 0) - (log.bt02Consumption || 0) - (log.bl01Consumption || 0) - (log.bm01Consumption || 0) - (log.excitationConsumption || 0),
    }));

    dailyLogs.forEach(log => {
      const dateKey = log.date.toISOString().split('T')[0];
      const existing = dailyTotalsMap.get(dateKey) || {
        date: log.date, totalGeneration: 0, netGeneration: 0, totalConsumption: 0, unitCount: 0,
      };
      const logConsumption = (log.bt01Consumption || 0) + (log.bt02Consumption || 0) + (log.bl01Consumption || 0) + (log.bm01Consumption || 0) + (log.excitationConsumption || 0);
      existing.totalGeneration += log.totalGeneration;
      existing.netGeneration += log.totalGeneration - logConsumption;
      existing.totalConsumption += logConsumption;
      existing.unitCount += 1;
      dailyTotalsMap.set(dateKey, existing);
    });

    unitStats.push({
      unitId: unit._id.toString(),
      unitCode: unit.unitCode,
      unitNameAr: unit.unitNameAr,
      unitType: unit.unitType,
      capacityMW: unit.capacityMW,
      totalOperatingHours,
      totalGeneration,
      netGeneration,
      totalConsumption,
      averagePMax,
      averagePMin,
      averageQMax,
      averageQMin,
      totalBT01Consumption,
      totalBT02Consumption,
      totalBL01Consumption,
      totalBM01Consumption,
      totalExcitationConsumption,
      capacityFactor,
      availabilityFactor,
      netGenerationRate,
      loadFactor,
      utilizationRate,
      daysInOperation,
      dailyData,
    });
  }

  const dailyTotals = Array.from(dailyTotalsMap.values())
    .map(item => ({
      date: item.date,
      totalGeneration: item.totalGeneration,
      netGeneration: item.netGeneration,
      totalConsumption: item.totalConsumption,
      operatingUnits: item.unitCount,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalGeneration = unitStats.reduce((s, u) => s + u.totalGeneration, 0);
  const totalConsumption = unitStats.reduce((s, u) => s + u.totalConsumption, 0);
  const totalNetGeneration = unitStats.reduce((s, u) => s + u.netGeneration, 0);
  const totalOperatingHours = unitStats.reduce((s, u) => s + u.totalOperatingHours, 0);
  const totalCapacity = unitStats.reduce((s, u) => s + u.capacityMW, 0);

  const dailyGenerations = dailyTotals.filter(d => d.totalGeneration > 0).map(d => d.totalGeneration);
  const peakDailyGeneration = dailyGenerations.length > 0 ? Math.max(...dailyGenerations) : 0;
  const lowestDailyGeneration = dailyGenerations.length > 0 ? Math.min(...dailyGenerations) : 0;
  const averageDailyGeneration = dailyTotals.length > 0 ? totalGeneration / dailyTotals.length : 0;

  const totalStats = {
    totalGeneration,
    totalNetGeneration,
    totalConsumption,
    totalOperatingHours,
    plantCapacityFactor: calculateCapacityFactor(totalGeneration, totalCapacity, totalHoursInMonth),
    plantAvailabilityFactor: calculateAvailabilityFactor(totalOperatingHours / Math.max(1, unitStats.length), totalHoursInMonth),
    plantNetGenerationRate: calculateNetGenerationRate(totalNetGeneration, totalGeneration),
    totalCapacity,
    peakDailyGeneration,
    lowestDailyGeneration,
    averageDailyGeneration,
  };

  return { year, month, daysInMonth, units: unitStats, totalStats, dailyTotals };
}

export async function saveMonthlySummary(year: number, month: number, userId: string): Promise<void> {
  const report = await generateMonthlyReport(year, month);
  for (const unitStat of report.units) {
    await MonthlySummary.findOneAndUpdate(
      { year, month, unitId: new mongoose.Types.ObjectId(unitStat.unitId) },
      {
        totalOperatingHours: unitStat.totalOperatingHours,
        totalGeneration: unitStat.totalGeneration,
        netGeneration: unitStat.netGeneration,
        totalConsumption: unitStat.totalConsumption,
        averagePMax: unitStat.averagePMax,
        averagePMin: unitStat.averagePMin,
        averageQMax: unitStat.averageQMax,
        averageQMin: unitStat.averageQMin,
        totalBT01Consumption: unitStat.totalBT01Consumption,
        totalBT02Consumption: unitStat.totalBT02Consumption,
        totalBL01Consumption: unitStat.totalBL01Consumption,
        totalBM01Consumption: unitStat.totalBM01Consumption,
        totalExcitationConsumption: unitStat.totalExcitationConsumption,
        capacityFactor: unitStat.capacityFactor,
        availabilityFactor: unitStat.availabilityFactor,
        netGenerationRate: unitStat.netGenerationRate,
        loadFactor: unitStat.loadFactor,
        utilizationRate: unitStat.utilizationRate,
        daysInOperation: unitStat.daysInOperation,
        generatedBy: new mongoose.Types.ObjectId(userId),
      },
      { upsert: true, new: true }
    );
  }
}