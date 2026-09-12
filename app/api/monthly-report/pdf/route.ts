export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { generateMonthlyReport } from '@/lib/calculations';
import { generateMonthlyReportPDF } from '@/lib/pdfGenerator';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const report = await generateMonthlyReport(year, month);

    if (!report || report.units.length === 0) {
      return NextResponse.json({ error: 'No data for this period' }, { status: 404 });
    }

    const pdf = await generateMonthlyReportPDF(report, {
      companyName: 'محطة تشرين الكهربائية',
      reportTitle: `التقرير الشهري - ${format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ar })}`,
      period: `${format(new Date(year, month - 1, 1), 'dd/MM/yyyy')} - ${format(new Date(year, month, 0), 'dd/MM/yyyy')}`,
      generatedBy: session.user?.name || 'غير معروف',
    });

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="monthly-report-${year}-${month}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}