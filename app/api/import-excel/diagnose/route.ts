export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as XLSX from 'xlsx';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const report: any = { sheets: {} };

    for (const sheetName of Object.keys(workbook.Sheets)) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];

      const sample = jsonData.slice(0, 15).map((row, idx) => ({
        rowIndex: idx,
        cell0: row[0],
        cell0Type: typeof row[0],
        cell0IsDate: row[0] instanceof Date,
        cell0ISO: row[0] instanceof Date ? (row[0] as Date).toISOString() : null,
        cell1: row[1],
        rawFirst3: row.slice(0, 3),
      }));

      report.sheets[sheetName] = {
        totalRows: jsonData.length,
        sample,
      };
    }

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json({ error: 'Diagnose failed' }, { status: 500 });
  }
}