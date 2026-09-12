export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DailyLog, Unit } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

// ==================== SABİTLER ====================
const START_KEYWORDS = ['بداية', 'بدايه', 'başlangıç', 'start', 'begin', 'initial'];
const END_KEYWORDS = ['نهاية', 'نهايه', 'bitiş', 'end', 'finish', 'final'];

const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['اليوم', 'التاريخ', 'date', 'day', 'يوم', 'تاريخ'],
  operatingHours: ['عدد ساعات', 'ساعات العمل', 'ساعات', 'hours', 'saat', 'ساعة'],
  pMax: ['p max', 'pmax', 'p_max', 'p الأعظمي'],
  pMin: ['p min', 'pmin', 'p_min', 'p الأصغري'],
  qMax: ['q max', 'qmax', 'q_max', 'q الأعظمي'],
  qMin: ['q min', 'qmin', 'q_min', 'q الأصغري'],
  generatorStart: ['عداد خرج', 'عداد المولد', 'عداد المنوبة', 'generator'],
  generatorEnd: ['عداد خرج', 'عداد المولد', 'عداد المنوبة', 'generator'],
  bt01Start: ['bt01', 'bt 01', 'bt-01', 'bt1'],
  bt01End: ['bt01', 'bt 01', 'bt-01', 'bt1'],
  bt02Start: ['bt02', 'bt 02', 'bt-02', 'bt2'],
  bt02End: ['bt02', 'bt 02', 'bt-02', 'bt2'],
  bl01Start: ['bl01', 'bl 01', 'bl-01', 'bl1'],
  bl01End: ['bl01', 'bl 01', 'bl-01', 'bl1'],
  bm01Start: ['bm01', 'bm 01', 'bm-01', 'bm1'],
  bm01End: ['bm01', 'bm 01', 'bm-01', 'bm1'],
  excitationStart: ['تهييج', 'تحريض', 'excitation', 'ikaz', 'uyarma'],
  excitationEnd: ['تهييج', 'تحريض', 'excitation', 'ikaz', 'uyarma'],
  reactiveStart: ['ردي', 'reaktif', 'reactive'],
  reactiveEnd: ['ردي', 'reaktif', 'reactive'],
};

const POSITION_FALLBACK: Record<string, number> = {
  date: 0, operatingHours: 1,
  pMax: 2, pMin: 3, qMax: 4, qMin: 5,
  generatorStart: 6, generatorEnd: 7,
  bt01Start: 9, bt01End: 10,
  bt02Start: 11, bt02End: 12,
  bl01Start: 14, bl01End: 15,
  bm01Start: 16, bm01End: 17,
  excitationStart: 19, excitationEnd: 20,
  reactiveStart: 23, reactiveEnd: 24,
};

// ==================== TARİH PARSER ====================
type DateFormat = 'DMY' | 'MDY';

/**
 * Excel serial number → Date (UTC, timezone-safe)
 * Excel epoch: 1899-12-30 (25569 gün offset)
 */
function serialToDate(serial: number): Date | null {
  if (typeof serial !== 'number' || isNaN(serial)) return null;
  if (serial < 1 || serial > 200000) return null;
  
  // UTC tabanlı dönüşüm — timezone kayması olmaz
  const utcMs = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(utcMs);
  if (isNaN(d.getTime())) return null;
  
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
}

/**
 * Metin tarihi yorumlar (kesin format tercihine göre)
 * dateFormat:
 *   'DMY' → Gün/Ay/Yıl (Türkçe/Arapça varsayılan)
 *   'MDY' → Ay/Gün/Yıl (US Excel varsayılan)
 */
function parseTextDate(str: string, format: DateFormat, minYear: number, maxYear: number): Date | null {
  const s = str.trim();
  if (!s) return null;

  // DD/MM/YYYY veya MM/DD/YYYY
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) {
    let d: number, mo: number;
    const a = parseInt(m[1]);
    const b = parseInt(m[2]);
    const y = parseInt(m[3]);

    if (format === 'MDY') {
      mo = a; d = b;
    } else {
      d = a; mo = b;
    }

    // Format tercihine göre geçersizse otomatik ters çevir
    if (mo > 12 && d <= 12) { const t = mo; mo = d; d = t; }
    if (d > 31 || mo > 12 || y < minYear || y > maxYear) return null;

    const test = new Date(y, mo - 1, d);
    if (test.getFullYear() !== y || test.getMonth() !== mo - 1 || test.getDate() !== d) return null;
    return new Date(y, mo - 1, d, 12, 0, 0, 0);
  }

  // YYYY-MM-DD (ISO)
  const iso = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (iso) {
    const y = parseInt(iso[1]);
    const mo = parseInt(iso[2]);
    const d = parseInt(iso[3]);
    if (y < minYear || y > maxYear) return null;
    const test = new Date(y, mo - 1, d);
    if (test.getFullYear() !== y || test.getMonth() !== mo - 1 || test.getDate() !== d) return null;
    return new Date(y, mo - 1, d, 12, 0, 0, 0);
  }

  return null;
}

/**
 * Ana tarih parser — hangi tipte gelirse gelsin Date döner
 */
function parseDate(value: any, format: DateFormat, minYear: number, maxYear: number): Date | null {
  if (value === null || value === undefined || value === '') return null;

  // 1) Number → Excel serial
  if (typeof value === 'number') {
    return serialToDate(value);
  }

  // 2) Date objesi → UTC metodları kullan (timezone kayması önlenir)
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    // UTC tabanlı çıkarım — XLSX bazen local olarak döner
    const y = value.getUTCFullYear();
    const mo = value.getUTCMonth() + 1;
    const d = value.getUTCDate();
    if (y < minYear || y > maxYear) return null;
    return new Date(y, mo - 1, d, 12, 0, 0, 0);
  }

  // 3) String
  if (typeof value === 'string') {
    return parseTextDate(value, format, minYear, maxYear);
  }

  return null;
}

// ==================== SAYI PARSER ====================
function parseNum(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/,/g, '.').replace(/[^\d.\-]/g, '');
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

// ==================== ÜNİTE TESPİTİ ====================
function detectUnitFromSheetName(sheetName: string, unitMap: Map<string, any>): any | null {
  const n = sheetName.toLowerCase().replace(/\s/g, '').trim();
  if (unitMap.has(n)) return unitMap.get(n);
  for (const [code, unit] of unitMap) {
    if (n.includes(code)) return unit;
  }
  const aliases: Record<string, string[]> = {
    'st1': ['بخاري1', 'بخارية1', 'steam1', 'buhar1'],
    'st2': ['بخاري2', 'بخارية2', 'steam2', 'buhar2'],
    'st3': ['بخاري3', 'بخارية3', 'steam3', 'buhar3'],
    'gt1': ['غازي1', 'غازية1', 'gas1', 'gaz1'],
    'gt2': ['غازي2', 'غازية2', 'gas2', 'gaz2'],
    'gt3': ['غازي3', 'غازية3', 'gas3', 'gaz3'],
    'gt4': ['غازي4', 'غازية4', 'gas4', 'gaz4'],
  };
  for (const [code, list] of Object.entries(aliases)) {
    for (const alias of list) {
      if (n.includes(alias)) {
        const unit = unitMap.get(code);
        if (unit) return unit;
      }
    }
  }
  return null;
}

function detectUnitFromContent(sheet: XLSX.WorkSheet, unitMap: Map<string, any>): any | null {
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const rowStr = (jsonData[i] || []).join(' ').toLowerCase();
    for (const [code, unit] of unitMap) {
      if (rowStr.includes(code)) return unit;
    }
  }
  return null;
}

// ==================== BAŞLIK BULMA ====================
function findHeaderRow(jsonData: any[][]): number {
  for (let i = 0; i < Math.min(10, jsonData.length); i++) {
    const row = jsonData[i] || [];
    for (let j = 0; j < Math.min(3, row.length); j++) {
      const cell = String(row[j] || '').trim().toLowerCase();
      if (cell.includes('اليوم') || cell === 'date' || cell.includes('تاريخ')) {
        return i;
      }
    }
  }
  return -1;
}

// ==================== KOLON EŞLEŞTİRME ====================
function detectColumns(headerRows: any[][]): Map<string, number> {
  const columnMap = new Map<string, number>();
  for (let colIndex = 0; colIndex < 30; colIndex++) {
    let combined = '';
    for (let rowIndex = 0; rowIndex < Math.min(4, headerRows.length); rowIndex++) {
      const cell = (headerRows[rowIndex] || [])[colIndex];
      if (cell !== null && cell !== undefined) combined += ' ' + String(cell);
    }
    combined = combined.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!combined) continue;

    const isStart = START_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
    const isEnd = END_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (columnMap.has(field)) continue;
      if (!patterns.some(p => combined.includes(p.toLowerCase()))) continue;

      if (field.endsWith('Start')) { if (isStart) columnMap.set(field, colIndex); }
      else if (field.endsWith('End')) { if (isEnd) columnMap.set(field, colIndex); }
      else columnMap.set(field, colIndex);
    }
  }
  for (const [field, pos] of Object.entries(POSITION_FALLBACK)) {
    if (!columnMap.has(field)) columnMap.set(field, pos);
  }
  return columnMap;
}

// ==================== ANA IMPORT ====================
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'لم يتم العثور على الملف' }, { status: 400 });

    // Tarih formatı tercihi: DMY (varsayılan) veya MDY
    const dateFormatRaw = String(formData.get('dateFormat') || 'MDY').toUpperCase();
    const dateFormat: DateFormat = dateFormatRaw === 'DMY' ? 'DMY' : 'MDY';

    // Ay filtresi
    const expectedMonthRaw = formData.get('expectedMonth');
    const expectedYearRaw = formData.get('expectedYear');
    const expectedMonth = expectedMonthRaw ? parseInt(expectedMonthRaw.toString()) : null;
    const expectedYear = expectedYearRaw ? parseInt(expectedYearRaw.toString()) : null;

    const buffer = Buffer.from(await file.arrayBuffer());

    // KRİTİK: cellDates: false → ham serial number alırız, timezone kayması olmaz
    const workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: false,
      cellNF: false,
      cellText: false,
    });

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 10;
    const maxYear = currentYear + 1;

    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      skippedDates: [] as string[],
      detectedMonths: {} as Record<string, number>,
      sheetSummary: [] as Array<{ sheet: string; unit: string; processed: number; skipped: number }>,
      dateFormatUsed: dateFormat,
    };

    const units = await Unit.find({ isActive: true });
    const unitMap = new Map(units.map(u => [u.unitCode.toLowerCase(), u]));

    for (const sheetName of Object.keys(workbook.Sheets)) {
      const lowerSheet = sheetName.toLowerCase();
      if (lowerSheet.includes('التقرير') || lowerSheet.includes('summary') ||
          lowerSheet.includes('total') || lowerSheet.includes('اجمالي')) {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const detectedUnit = detectUnitFromSheetName(sheetName, unitMap) ||
                           detectUnitFromContent(sheet, unitMap);
      if (!detectedUnit) {
        results.errors.push(`صفحة "${sheetName}": لم يتم تحديد الوحدة`);
        continue;
      }

      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        raw: true,
        defval: '',
        blankrows: false,
      }) as any[][];

      if (jsonData.length < 2) continue;

      const headerRowIndex = findHeaderRow(jsonData);
      if (headerRowIndex === -1) {
        results.errors.push(`صفحة "${sheetName}": لم يتم العثور على صف العنوان`);
        continue;
      }

      const headerRows = jsonData.slice(headerRowIndex, headerRowIndex + 4);
      const columnMap = detectColumns(headerRows);
      const dateColIndex = columnMap.get('date') ?? 0;

      // Veri başlangıcını bul (ilk geçerli tarih satırı)
      let dataStartIndex = headerRowIndex + 4;
      for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 8, jsonData.length); i++) {
        const testVal = jsonData[i]?.[dateColIndex];
        const testDate = parseDate(testVal, dateFormat, minYear, maxYear);
        if (testDate) {
          dataStartIndex = i;
          break;
        }
      }

      const dataRows = jsonData.slice(dataStartIndex);
      let processedCount = 0;
      let skippedCount = 0;

      for (const row of dataRows) {
        if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) continue;

        const dateValue = row[dateColIndex];
        const date = parseDate(dateValue, dateFormat, minYear, maxYear);

        if (!date) {
          skippedCount++;
          results.skipped++;
          if (dateValue !== '' && dateValue !== null && dateValue !== undefined) {
            results.skippedDates.push(
              `${detectedUnit.unitCode}: ${String(dateValue).substring(0, 25)}`
            );
          }
          continue;
        }

        const dateMonth = date.getMonth() + 1;
        const dateYear = date.getFullYear();

        if (expectedMonth && expectedYear) {
          if (dateMonth !== expectedMonth || dateYear !== expectedYear) {
            skippedCount++;
            results.skipped++;
            results.skippedDates.push(
              `${detectedUnit.unitCode}: ${dateYear}-${String(dateMonth).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} (خارج النطاق)`
            );
            continue;
          }
        }

        const monthKey = `${dateYear}-${String(dateMonth).padStart(2, '0')}`;
        results.detectedMonths[monthKey] = (results.detectedMonths[monthKey] || 0) + 1;

        const getVal = (field: string): number => {
          const ci = columnMap.get(field);
          if (ci === undefined) return 0;
          return parseNum(row[ci]);
        };

        const operatingHours = Math.min(24, Math.max(0, getVal('operatingHours') || 24));
        const pMax = getVal('pMax');
        const pMin = getVal('pMin');
        const qMax = getVal('qMax');
        const qMin = getVal('qMin');
        const generatorStart = getVal('generatorStart');
        const generatorEnd = getVal('generatorEnd');
        const bt01Start = getVal('bt01Start');
        const bt01End = getVal('bt01End');
        const bt02Start = getVal('bt02Start');
        const bt02End = getVal('bt02End');
        const bl01Start = getVal('bl01Start');
        const bl01End = getVal('bl01End');
        const bm01Start = getVal('bm01Start');
        const bm01End = getVal('bm01End');
        const excitationStart = getVal('excitationStart');
        const excitationEnd = getVal('excitationEnd');
        const reactiveStart = getVal('reactiveStart');
        const reactiveEnd = getVal('reactiveEnd');

        const totalGeneration = Math.max(0, (generatorEnd - generatorStart) * detectedUnit.multiplier);
        const bt01Consumption = Math.max(0, bt01End - bt01Start);
        const bt02Consumption = Math.max(0, bt02End - bt02Start);
        const bl01Consumption = Math.max(0, bl01End - bl01Start);
        const bm01Consumption = Math.max(0, bm01End - bm01Start);
        const excitationConsumption = Math.max(0, excitationEnd - excitationStart);
        const reactiveGeneration = Math.max(0, reactiveEnd - reactiveStart);

        const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

        const logData = {
          operatingHours,
          pMax, pMin, qMax, qMin,
          generatorStart, generatorEnd, totalGeneration,
          bt01Start, bt01End, bt01Consumption,
          bt02Start, bt02End, bt02Consumption,
          bl01Start, bl01End, bl01Consumption,
          bm01Start, bm01End, bm01Consumption,
          excitationStart, excitationEnd, excitationConsumption,
          reactiveStart, reactiveEnd, reactiveGeneration,
        };

        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

        const existingLog = await DailyLog.findOne({
          unitId: detectedUnit._id,
          date: { $gte: dayStart, $lte: dayEnd },
        });

        if (existingLog) {
          await DailyLog.findByIdAndUpdate(existingLog._id, {
            ...logData,
            date: normalizedDate,
            updatedBy: new mongoose.Types.ObjectId(session.user.id),
          });
          results.updated++;
          processedCount++;
        } else {
          await DailyLog.create({
            unitId: detectedUnit._id,
            date: normalizedDate,
            ...logData,
            createdBy: new mongoose.Types.ObjectId(session.user.id),
          });
          results.imported++;
          processedCount++;
        }
      }

      results.sheetSummary.push({
        sheet: sheetName,
        unit: detectedUnit.unitCode,
        processed: processedCount,
        skipped: skippedCount,
      });
    }

    return NextResponse.json({
      success: true,
      results,
      message: `تم استيراد ${results.imported} جديد، تحديث ${results.updated}، تجاهل ${results.skipped}`,
    }, { status: 200 });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'فشل في الاستيراد', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}