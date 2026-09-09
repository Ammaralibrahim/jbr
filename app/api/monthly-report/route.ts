import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { generateMonthlyReport, saveMonthlySummary } from '@/lib/calculations';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    const report = await generateMonthlyReport(year, month);
    return NextResponse.json({ report }, { status: 200 });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'Operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    await saveMonthlySummary(year, month, session.user.id);
    const report = await generateMonthlyReport(year, month);

    return NextResponse.json({ message: 'Monthly summary saved', report }, { status: 201 });
  } catch (error) {
    console.error('Error saving monthly summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}