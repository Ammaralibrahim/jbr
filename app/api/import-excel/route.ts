import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DailyLog, Unit } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import * as XLSX from 'xlsx';
import mongoose from 'mongoose';

const START_KEYWORDS = ['بداية', 'başlangıç', 'start', 'begin', 'initial', 'اول', 'أول', 'بدايه'];
const END_KEYWORDS = ['نهاية', 'bitiş', 'end', 'finish', 'final', 'آخر', 'اخر', 'نهايه'];

const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ['اليوم', 'التاريخ', 'date', 'day', 'يوم', 'تاريخ'],
  operatingHours: ['ساعات العمل', 'عدد ساعات', 'ساعات', 'hours', 'saat', 'ساعة'],
  pMax: ['p max', 'pmax', 'p_max', 'p الأعظمي'],
  pMin: ['p min', 'pmin', 'p_min', 'p الأصغري'],
  qMax: ['q max', 'qmax', 'q_max', 'q الأعظمي'],
  qMin: ['q min', 'qmin', 'q_min', 'q الأصغري'],
  generatorStart: ['عداد خرج', 'عداد المولد', 'عداد المنوبة', 'generator', 'بداية العداد'],
  generatorEnd: ['عداد خرج', 'عداد المولد', 'عداد المنوبة', 'generator', 'نهاية العداد'],
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

function detectUnitFromSheetName(sheetName: string, unitMap: Map<string, any>): any | null {
  const normalized = sheetName.toLowerCase().trim();
  if (unitMap.has(normalized)) return unitMap.get(normalized);
  for (const [code, unit] of unitMap) {
    if (normalized.includes(code.toLowerCase())) return unit;
  }
  const aliases: Record<string, string[]> = {
    'st1': ['بخاري 1', 'steam 1', 'buhar 1'],
    'st2': ['بخاري 2', 'steam 2', 'buhar 2'],
    'st3': ['بخاري 3', 'steam 3', 'buhar 3'],
    'gt1': ['غازي 1', 'gas 1', 'gaz 1'],
    'gt2': ['غازي 2', 'gas 2', 'gaz 2'],
    'gt3': ['غازي 3', 'gas 3', 'gaz 3'],
    'gt4': ['غازي 4', 'gas 4', 'gaz 4'],
  };
  for (const [code, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      if (normalized.includes(alias)) {
        const unit = unitMap.get(code);
        if (unit) return unit;
      }
    }
  }
  return null;
}

function detectUnitFromContent(sheet: XLSX.WorkSheet, unitMap: Map<string, any>): any | null {
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const rowStr = (jsonData[i] || []).join(' ').toLowerCase();
    for (const [code, unit] of unitMap) {
      if (rowStr.includes(code)) return unit;
    }
  }
  return null;
}

function detectColumns(headers: any[][]): Map<string, number> {
  const columnMap = new Map<string, number>();
  for (let colIndex = 0; colIndex < 30; colIndex++) {
    let combinedHeader = '';
    for (let rowIndex = 0; rowIndex < Math.min(4, headers.length); rowIndex++) {
      const cellValue = (headers[rowIndex] || [])[colIndex];
      if (cellValue && typeof cellValue === 'string') combinedHeader += ' ' + cellValue;
    }
    combinedHeader = combinedHeader.toLowerCase().trim();
    if (!combinedHeader) continue;
    const isStart = START_KEYWORDS.some(kw => combinedHeader.includes(kw));
    const isEnd = END_KEYWORDS.some(kw => combinedHeader.includes(kw));
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      const matched = patterns.some(p => combinedHeader.includes(p));
      if (matched) {
        if (field.endsWith('Start') && isStart && !columnMap.has(field)) columnMap.set(field, colIndex);
        else if (field.endsWith('End') && isEnd && !columnMap.has(field)) columnMap.set(field, colIndex);
        else if (!field.endsWith('Start') && !field.endsWith('End') && !columnMap.has(field)) columnMap.set(field, colIndex);
      }
    }
  }
  return columnMap;
}

function parseDate(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string') {
    const str = value.trim();
    if (!str) return null;
    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) {
      const d = parseInt(dmy[1]), m = parseInt(dmy[2]), y = parseInt(dmy[3]);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12) return new Date(y, m - 1, d);
    }
    const ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymd) return new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
    const iso = new Date(str);
    if (!isNaN(iso.getTime())) return iso;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'لم يتم العثور على الملف' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const results = {
      imported: 0, updated: 0,
      errors: [] as string[],
      details: [] as Array<{ sheet: string; date: string; action: string }>,
    };

    const units = await Unit.find({ isActive: true });
    const unitMap = new Map(units.map(u => [u.unitCode.toLowerCase(), u]));

    for (const sheetName of Object.keys(workbook.Sheets)) {
      const sheet = workbook.Sheets[sheetName];
      const detectedUnit = detectUnitFromSheetName(sheetName, unitMap) || detectUnitFromContent(sheet, unitMap);
      if (!detectedUnit) continue;

      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, dateNF: 'dd/mm/yyyy', defval: '' }) as any[][];
      if (jsonData.length < 2) continue;

      let headerStartIndex = 0;
      for (let i = 0; i < Math.min(6, jsonData.length); i++) {
        const rowStr = (jsonData[i] || []).join(' ').toLowerCase();
        if (rowStr.includes('اليوم') || rowStr.includes('date') || rowStr.includes('بداية')) {
          headerStartIndex = i;
          break;
        }
      }

      const headerRows = jsonData.slice(headerStartIndex, headerStartIndex + 4);
      const columnMap = detectColumns(headerRows);

      const defaultPositions: Record<string, number> = {
        date: 0, operatingHours: 1, pMax: 2, pMin: 3, qMax: 4, qMin: 5,
        generatorStart: 6, generatorEnd: 7,
        bt01Start: 9, bt01End: 10, bt02Start: 11, bt02End: 12,
        bl01Start: 14, bl01End: 15, bm01Start: 16, bm01End: 17,
        excitationStart: 19, excitationEnd: 20,
        reactiveStart: 23, reactiveEnd: 24,
      };

      for (const [field, pos] of Object.entries(defaultPositions)) {
        if (!columnMap.has(field)) columnMap.set(field, pos);
      }

      const dataStartIndex = headerStartIndex + 4;
      const dataRows = jsonData.slice(dataStartIndex);

      for (const row of dataRows) {
        if (!row || row.every((c: any) => c === '' || c === null || c === undefined)) continue;
        const dateValue = row[columnMap.get('date') || 0];
        const date = parseDate(dateValue);
        if (!date) continue;

        const parseNum = (val: any): number => {
          if (val === null || val === undefined || val === '') return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^\d.-]/g, '');
          const num = Number(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const getVal = (field: string): number => {
          const colIndex = columnMap.get(field);
          if (colIndex === undefined) return 0;
          return parseNum(row[colIndex]);
        };

        const operatingHours = getVal('operatingHours') || 24;
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

        const logData = {
          operatingHours: Math.max(0, Math.min(24, operatingHours)),
          pMax, pMin, qMax, qMin,
          generatorStart, generatorEnd, totalGeneration,
          bt01Start, bt01End, bt01Consumption,
          bt02Start, bt02End, bt02Consumption,
          bl01Start, bl01End, bl01Consumption,
          bm01Start, bm01End, bm01Consumption,
          excitationStart, excitationEnd, excitationConsumption,
          reactiveStart, reactiveEnd, reactiveGeneration,
        };

        const existingLog = await DailyLog.findOne({ unitId: detectedUnit._id, date });
        if (existingLog) {
          await DailyLog.findByIdAndUpdate(existingLog._id, {
            ...logData,
            updatedBy: new mongoose.Types.ObjectId(session.user.id),
          });
          results.updated++;
        } else {
          await DailyLog.create({
            unitId: detectedUnit._id,
            date,
            ...logData,
            createdBy: new mongoose.Types.ObjectId(session.user.id),
          });
          results.imported++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `تم استيراد ${results.imported} سجل جديد وتحديث ${results.updated} سجل موجود`,
    }, { status: 200 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'فشل في الاستيراد' }, { status: 500 });
  }
}