import { DailyLog, Unit, MonthlySummary, IUnit } from '@/models';
import mongoose from 'mongoose';

// ==================== الأنواع ====================
export interface GenerationCalculation {
  totalGeneration: number;
  bt01Consumption: number;
  bt02Consumption: number;
  bl01Consumption: number;
  bm01Consumption: number;
  excitationConsumption: number;
  totalConsumption: number;
  netGeneration: number;
  reactiveGeneration: number;
}

export interface DailyPeak {
  value: number;
  date: Date | null;
}

export interface UnitMonthlyStats {
  unitId: string;
  unitCode: string;
  unitNameAr: string;
  unitType: 'Steam' | 'Gas';
  capacityMW: number;
  multiplier: number;

  // أوقات
  totalOperatingHours: number;
  daysInOperation: number;
  daysInMonth: number;
  totalHoursInMonth: number;

  // طاقة
  totalGeneration: number;
  totalConsumption: number;
  netGeneration: number;
  totalReactiveEnergy: number;       // الطاقة الردية الكلية
  bt01Consumption: number;
  bt02Consumption: number;
  bl01Consumption: number;
  bm01Consumption: number;
  excitationConsumption: number;

  // تجميعات مطلوبة
  selfConsumption: number;           // الاستهلاك الذاتي = BT01 + BT02
  startupDraw: number;               // استجرار المحولة الاقلاعية = BL01 + BM01
  excitationDraw: number;            // استجرار محولة التهييج

  // استطاعات
  averageActivePower: number;        // الاستطاعة الوسطية = الإنتاج / ساعات العمل
  maxActivePower: number;            // أعلى قيمة استطاعة فعلية
  maxActivePowerDate: Date | null;   // تاريخها
  minActivePower: number;            // أدنى قيمة
  minActivePowerDate: Date | null;
  averageReactivePower: number;      // الاستطاعة الردية الوسطية
  maxReactivePower: number;
  maxReactivePowerDate: Date | null;
  minReactivePower: number;
  minReactivePowerDate: Date | null;

  // متوسطات
  averagePMax: number;
  averagePMin: number;
  averageQMax: number;
  averageQMin: number;

  // مؤشرات
  capacityFactor: number;
  availabilityFactor: number;
  netGenerationRate: number;
  loadFactor: number;
  utilizationFactor: number;
  specificConsumption: number;
  evaluation: 'excellent' | 'good' | 'average' | 'poor';

  // بيانات يومية
  dailyData: Array<{
    date: Date;
    operatingHours: number;
    totalGeneration: number;
    netGeneration: number;
    consumption: number;
    reactiveGeneration: number;
    activePower: number;             // إنتاج اليوم / ساعات اليوم
    reactivePower: number;           // ردي اليوم / ساعات اليوم
  }>;
}

export interface MonthlyReport {
  year: number;
  month: number;
  daysInMonth: number;
  totalHoursInMonth: number;
  units: UnitMonthlyStats[];
  totalStats: {
    totalGeneration: number;
    totalNetGeneration: number;
    totalConsumption: number;
    totalReactiveEnergy: number;
    totalBT01: number;
    totalBT02: number;
    totalBL01: number;
    totalBM01: number;
    totalExcitation: number;
    totalSelfConsumption: number;
    totalStartupDraw: number;
    totalExcitationDraw: number;
    totalOperatingHours: number;
    totalCapacity: number;
    averageActivePower: number;
    averageReactivePower: number;
    plantCapacityFactor: number;
    plantAvailabilityFactor: number;
    plantNetGenerationRate: number;
    plantLoadFactor: number;
    plantUtilizationFactor: number;
    plantSpecificConsumption: number;
    peakDailyGeneration: number;
    peakDayDate: Date | null;
    lowestDailyGeneration: number;
    lowestDayDate: Date | null;
    averageDailyGeneration: number;
    daysWithData: number;
    daysWithoutData: number;
    dataCoverage: number;
    overallEvaluation: 'excellent' | 'good' | 'average' | 'poor';
  };
  dailyTotals: Array<{
    date: Date;
    totalGeneration: number;
    netGeneration: number;
    totalConsumption: number;
    reactiveGeneration: number;
    operatingUnits: number;
    averageLoadFactor: number;
  }>;
}

// ==================== حمايات ====================
function safeDivide(n: number, d: number, fb = 0): number {
  if (!isFinite(n) || !isFinite(d) || d === 0) return fb;
  const r = n / d;
  return isFinite(r) ? r : fb;
}
function safeNumber(v: any, fb = 0): number {
  if (v === null || v === undefined) return fb;
  const n = Number(v);
  return isFinite(n) ? n : fb;
}
function safePercent(v: number): number {
  if (!isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

// ==================== الصيغ المعيارية ====================
export function calculateCapacityFactor(g: number, cap: number, hours: number): number {
  if (cap <= 0 || hours <= 0) return 0;
  return safePercent(safeDivide(g, cap * hours) * 100);
}
export function calculateAvailabilityFactor(opHours: number, totalHours: number): number {
  if (totalHours <= 0) return 0;
  return safePercent(safeDivide(opHours, totalHours) * 100);
}
export function calculateNetGenerationRate(net: number, total: number): number {
  if (total <= 0) return 0;
  return safePercent(safeDivide(net, total) * 100);
}
export function calculateLoadFactor(g: number, opHours: number, cap: number): number {
  if (opHours <= 0 || cap <= 0) return 0;
  const avg = safeDivide(g, opHours);
  return safePercent(safeDivide(avg, cap) * 100);
}
export function calculateUtilizationFactor(net: number, cap: number, hours: number): number {
  if (cap <= 0 || hours <= 0) return 0;
  return safePercent(safeDivide(net, cap * hours) * 100);
}
export function calculateSpecificConsumption(cons: number, gen: number): number {
  if (gen <= 0) return 0;
  return safePercent(safeDivide(cons, gen) * 100);
}

export function evaluateUnitPerformance(cf: number, ngr: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (cf >= 85 && ngr >= 95) return 'excellent';
  if (cf >= 70 && ngr >= 90) return 'good';
  if (cf >= 50 && ngr >= 85) return 'average';
  return 'poor';
}

// ==================== حساب مدخلات اليوم ====================
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
  const multiplier = safeNumber(input.unit.multiplier, 1);
  const totalGeneration = Math.max(0, (safeNumber(input.generatorEnd) - safeNumber(input.generatorStart)) * multiplier);

  const bt01Consumption = Math.max(0, safeNumber(input.bt01End) - safeNumber(input.bt01Start));
  const bt02Consumption = Math.max(0, safeNumber(input.bt02End) - safeNumber(input.bt02Start));
  const bl01Consumption = Math.max(0, safeNumber(input.bl01End) - safeNumber(input.bl01Start));
  const bm01Consumption = Math.max(0, safeNumber(input.bm01End) - safeNumber(input.bm01Start));
  const excitationConsumption = Math.max(0, safeNumber(input.excitationEnd) - safeNumber(input.excitationStart));
  const reactiveGeneration = Math.max(0, safeNumber(input.reactiveEnd) - safeNumber(input.reactiveStart));

  const totalConsumption = bt01Consumption + bt02Consumption + bl01Consumption + bm01Consumption + excitationConsumption;
  const netGeneration = Math.max(0, totalGeneration - totalConsumption);

  return {
    totalGeneration,
    bt01Consumption,
    bt02Consumption,
    bl01Consumption,
    bm01Consumption,
    excitationConsumption,
    totalConsumption,
    netGeneration,
    reactiveGeneration,
  };
}

// ==================== توليد التقرير الشهري ====================
export async function generateMonthlyReport(year: number, month: number): Promise<MonthlyReport> {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalHoursInMonth = daysInMonth * 24;

  const units = await Unit.find({ isActive: true }).sort({ sortOrder: 1 });
  const unitStats: UnitMonthlyStats[] = [];
  const dailyTotalsMap = new Map<string, any>();

  for (const unit of units) {
    const dailyLogs = await DailyLog.find({
      unitId: unit._id,
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // ==== مجاميع ====
    let totalOperatingHours = 0;
    let totalGeneration = 0;
    let totalReactiveEnergy = 0;
    let totalBT01 = 0, totalBT02 = 0, totalBL01 = 0, totalBM01 = 0, totalExcitation = 0;
    let sumPMax = 0, sumPMin = 0, sumQMax = 0, sumQMin = 0;
    let daysInOperation = 0;

    // أعلى وأدنى استطاعة (محسوبة من متوسط القدرة اليومية)
    let maxActivePower = 0;
    let maxActivePowerDate: Date | null = null;
    let minActivePower = Infinity;
    let minActivePowerDate: Date | null = null;

    let maxReactivePower = 0;
    let maxReactivePowerDate: Date | null = null;
    let minReactivePower = Infinity;
    let minReactivePowerDate: Date | null = null;

    const dailyData: UnitMonthlyStats['dailyData'] = [];

    for (const log of dailyLogs) {
      const hours = Math.min(24, Math.max(0, safeNumber(log.operatingHours)));
      totalOperatingHours += hours;
      if (hours > 0) daysInOperation++;

      const dayGen = safeNumber(log.totalGeneration);
      const dayReactive = safeNumber(log.reactiveGeneration);
      totalGeneration += dayGen;
      totalReactiveEnergy += dayReactive;

      totalBT01 += safeNumber(log.bt01Consumption);
      totalBT02 += safeNumber(log.bt02Consumption);
      totalBL01 += safeNumber(log.bl01Consumption);
      totalBM01 += safeNumber(log.bm01Consumption);
      totalExcitation += safeNumber(log.excitationConsumption);

      sumPMax += safeNumber(log.pMax);
      sumPMin += safeNumber(log.pMin);
      sumQMax += safeNumber(log.qMax);
      sumQMin += safeNumber(log.qMin);

      // متوسط القدرة اليومية (الاستطاعة الفعلية)
      const dayActivePower = hours > 0 ? safeDivide(dayGen, hours) : 0;
      const dayReactivePower = hours > 0 ? safeDivide(dayReactive, hours) : 0;

      dailyData.push({
        date: log.date,
        operatingHours: hours,
        totalGeneration: dayGen,
        netGeneration: Math.max(0, dayGen - (
          safeNumber(log.bt01Consumption) + safeNumber(log.bt02Consumption) +
          safeNumber(log.bl01Consumption) + safeNumber(log.bm01Consumption) +
          safeNumber(log.excitationConsumption)
        )),
        consumption: safeNumber(log.bt01Consumption) + safeNumber(log.bt02Consumption) +
          safeNumber(log.bl01Consumption) + safeNumber(log.bm01Consumption) +
          safeNumber(log.excitationConsumption),
        reactiveGeneration: dayReactive,
        activePower: dayActivePower,
        reactivePower: dayReactivePower,
      });

      // تتبع الذروات فقط إذا الوحدة كانت عاملة
      if (hours > 0) {
        if (dayActivePower > maxActivePower) {
          maxActivePower = dayActivePower;
          maxActivePowerDate = log.date;
        }
        if (dayActivePower < minActivePower) {
          minActivePower = dayActivePower;
          minActivePowerDate = log.date;
        }
        if (dayReactivePower > maxReactivePower) {
          maxReactivePower = dayReactivePower;
          maxReactivePowerDate = log.date;
        }
        if (dayReactivePower < minReactivePower) {
          minReactivePower = dayReactivePower;
          minReactivePowerDate = log.date;
        }
      }
    }

    // إذا لم تكن هناك بيانات، صفر بدل Infinity
    if (minActivePower === Infinity) {
      minActivePower = 0;
      minActivePowerDate = null;
    }
    if (minReactivePower === Infinity) {
      minReactivePower = 0;
      minReactivePowerDate = null;
    }

    const totalConsumption = totalBT01 + totalBT02 + totalBL01 + totalBM01 + totalExcitation;
    const netGeneration = Math.max(0, totalGeneration - totalConsumption);

    const selfConsumption = totalBT01 + totalBT02;
    const startupDraw = totalBL01 + totalBM01;
    const excitationDraw = totalExcitation;

    const logCount = Math.max(1, dailyLogs.length);
    const averagePMax = safeDivide(sumPMax, logCount);
    const averagePMin = safeDivide(sumPMin, logCount);
    const averageQMax = safeDivide(sumQMax, logCount);
    const averageQMin = safeDivide(sumQMin, logCount);

    // الاستطاعة الوسطية = إجمالي الإنتاج / إجمالي ساعات العمل
    const averageActivePower = safeDivide(totalGeneration, totalOperatingHours);
    const averageReactivePower = safeDivide(totalReactiveEnergy, totalOperatingHours);

    // مؤشرات
    const capacityFactor = calculateCapacityFactor(totalGeneration, unit.capacityMW, totalHoursInMonth);
    const availabilityFactor = calculateAvailabilityFactor(totalOperatingHours, totalHoursInMonth);
    const netGenerationRate = calculateNetGenerationRate(netGeneration, totalGeneration);
    const loadFactor = calculateLoadFactor(totalGeneration, totalOperatingHours, unit.capacityMW);
    const utilizationFactor = calculateUtilizationFactor(netGeneration, unit.capacityMW, totalHoursInMonth);
    const specificConsumption = calculateSpecificConsumption(totalConsumption, totalGeneration);
    const evaluation = evaluateUnitPerformance(capacityFactor, netGenerationRate);

    // تجميع يومي للمحطة
    for (const log of dailyLogs) {
      const dateKey = log.date.toISOString().split('T')[0];
      const existing = dailyTotalsMap.get(dateKey) || {
        date: log.date,
        totalGeneration: 0,
        netGeneration: 0,
        totalConsumption: 0,
        reactiveGeneration: 0,
        unitCount: 0,
        loadFactors: [],
      };
      const cons = safeNumber(log.bt01Consumption) + safeNumber(log.bt02Consumption) +
        safeNumber(log.bl01Consumption) + safeNumber(log.bm01Consumption) +
        safeNumber(log.excitationConsumption);
      const total = safeNumber(log.totalGeneration);
      const hours = safeNumber(log.operatingHours);
      const lf = calculateLoadFactor(total, hours, unit.capacityMW);

      existing.totalGeneration += total;
      existing.netGeneration += Math.max(0, total - cons);
      existing.totalConsumption += cons;
      existing.reactiveGeneration += safeNumber(log.reactiveGeneration);
      existing.unitCount += 1;
      if (hours > 0) existing.loadFactors.push(lf);
      dailyTotalsMap.set(dateKey, existing);
    }

    unitStats.push({
      unitId: unit._id.toString(),
      unitCode: unit.unitCode,
      unitNameAr: unit.unitNameAr,
      unitType: unit.unitType,
      capacityMW: unit.capacityMW,
      multiplier: unit.multiplier,
      totalOperatingHours,
      daysInOperation,
      daysInMonth,
      totalHoursInMonth,
      totalGeneration,
      totalConsumption,
      netGeneration,
      totalReactiveEnergy,
      bt01Consumption: totalBT01,
      bt02Consumption: totalBT02,
      bl01Consumption: totalBL01,
      bm01Consumption: totalBM01,
      excitationConsumption: totalExcitation,
      selfConsumption,
      startupDraw,
      excitationDraw,
      averageActivePower,
      maxActivePower,
      maxActivePowerDate,
      minActivePower,
      minActivePowerDate,
      averageReactivePower,
      maxReactivePower,
      maxReactivePowerDate,
      minReactivePower,
      minReactivePowerDate,
      averagePMax,
      averagePMin,
      averageQMax,
      averageQMin,
      capacityFactor,
      availabilityFactor,
      netGenerationRate,
      loadFactor,
      utilizationFactor,
      specificConsumption,
      evaluation,
      dailyData,
    });
  }

  // تجميع يومي
  const dailyTotals = Array.from(dailyTotalsMap.values())
    .map((item: any) => ({
      date: item.date,
      totalGeneration: item.totalGeneration,
      netGeneration: item.netGeneration,
      totalConsumption: item.totalConsumption,
      reactiveGeneration: item.reactiveGeneration,
      operatingUnits: item.unitCount,
      averageLoadFactor: item.loadFactors.length > 0
        ? item.loadFactors.reduce((a: number, b: number) => a + b, 0) / item.loadFactors.length
        : 0,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // مجاميع المحطة
  const totalGeneration = unitStats.reduce((s, u) => s + u.totalGeneration, 0);
  const totalConsumption = unitStats.reduce((s, u) => s + u.totalConsumption, 0);
  const totalNetGeneration = unitStats.reduce((s, u) => s + u.netGeneration, 0);
  const totalReactiveEnergy = unitStats.reduce((s, u) => s + u.totalReactiveEnergy, 0);
  const totalOperatingHours = unitStats.reduce((s, u) => s + u.totalOperatingHours, 0);
  const totalCapacity = unitStats.reduce((s, u) => s + u.capacityMW, 0);

  const totalBT01 = unitStats.reduce((s, u) => s + u.bt01Consumption, 0);
  const totalBT02 = unitStats.reduce((s, u) => s + u.bt02Consumption, 0);
  const totalBL01 = unitStats.reduce((s, u) => s + u.bl01Consumption, 0);
  const totalBM01 = unitStats.reduce((s, u) => s + u.bm01Consumption, 0);
  const totalExcitation = unitStats.reduce((s, u) => s + u.excitationConsumption, 0);

  const totalSelfConsumption = totalBT01 + totalBT02;
  const totalStartupDraw = totalBL01 + totalBM01;
  const totalExcitationDraw = totalExcitation;

  const daysWithGen = dailyTotals.filter(d => d.totalGeneration > 0);
  const peakDay = daysWithGen.length > 0
    ? daysWithGen.reduce((m, d) => d.totalGeneration > m.totalGeneration ? d : m, daysWithGen[0])
    : null;
  const lowestDay = daysWithGen.length > 0
    ? daysWithGen.reduce((m, d) => d.totalGeneration < m.totalGeneration ? d : m, daysWithGen[0])
    : null;

  const averageDailyGeneration = dailyTotals.length > 0 ? safeDivide(totalGeneration, dailyTotals.length) : 0;

  // مؤشرات المحطة
  const plantCapacityFactor = calculateCapacityFactor(totalGeneration, totalCapacity, totalHoursInMonth);
  const weightedAvail = unitStats.reduce((s, u) => s + u.capacityMW * u.totalOperatingHours, 0);
  const weightedTotal = unitStats.reduce((s, u) => s + u.capacityMW * totalHoursInMonth, 0);
  const plantAvailabilityFactor = safePercent(safeDivide(weightedAvail, weightedTotal) * 100);
  const plantNetGenerationRate = calculateNetGenerationRate(totalNetGeneration, totalGeneration);

  const plantLoadFactor = (() => {
    if (totalOperatingHours <= 0 || totalCapacity <= 0) return 0;
    const avgPower = safeDivide(totalGeneration, totalOperatingHours);
    return safePercent(safeDivide(avgPower, totalCapacity) * 100);
  })();

  const plantUtilizationFactor = calculateUtilizationFactor(totalNetGeneration, totalCapacity, totalHoursInMonth);
  const plantSpecificConsumption = calculateSpecificConsumption(totalConsumption, totalGeneration);
  const overallEvaluation = evaluateUnitPerformance(plantCapacityFactor, plantNetGenerationRate);

  const daysWithData = dailyTotals.length;
  const daysWithoutData = daysInMonth - daysWithData;
  const dataCoverage = daysInMonth > 0 ? safePercent(safeDivide(daysWithData, daysInMonth) * 100) : 0;

  return {
    year,
    month,
    daysInMonth,
    totalHoursInMonth,
    units: unitStats,
    totalStats: {
      totalGeneration,
      totalNetGeneration,
      totalConsumption,
      totalReactiveEnergy,
      totalBT01,
      totalBT02,
      totalBL01,
      totalBM01,
      totalExcitation,
      totalSelfConsumption,
      totalStartupDraw,
      totalExcitationDraw,
      totalOperatingHours,
      totalCapacity,
      averageActivePower: safeDivide(totalGeneration, totalOperatingHours),
      averageReactivePower: safeDivide(totalReactiveEnergy, totalOperatingHours),
      plantCapacityFactor,
      plantAvailabilityFactor,
      plantNetGenerationRate,
      plantLoadFactor,
      plantUtilizationFactor,
      plantSpecificConsumption,
      peakDailyGeneration: peakDay?.totalGeneration || 0,
      peakDayDate: peakDay?.date || null,
      lowestDailyGeneration: lowestDay?.totalGeneration || 0,
      lowestDayDate: lowestDay?.date || null,
      averageDailyGeneration,
      daysWithData,
      daysWithoutData,
      dataCoverage,
      overallEvaluation,
    },
    dailyTotals,
  };
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
        totalBT01Consumption: unitStat.bt01Consumption,
        totalBT02Consumption: unitStat.bt02Consumption,
        totalBL01Consumption: unitStat.bl01Consumption,
        totalBM01Consumption: unitStat.bm01Consumption,
        totalExcitationConsumption: unitStat.excitationConsumption,
        capacityFactor: unitStat.capacityFactor,
        availabilityFactor: unitStat.availabilityFactor,
        netGenerationRate: unitStat.netGenerationRate,
        loadFactor: unitStat.loadFactor,
        utilizationRate: unitStat.utilizationFactor,
        daysInOperation: unitStat.daysInOperation,
        generatedBy: new mongoose.Types.ObjectId(userId),
      },
      { upsert: true, new: true }
    );
  }
}