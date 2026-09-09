import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MonthlyTarget } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const target = await MonthlyTarget.findOne({ year, month })
      .populate('createdBy', 'name');

    return NextResponse.json({ target }, { status: 200 });
  } catch (error) {
    console.error('Error fetching target:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'Operator') {
      return NextResponse.json({ error: 'Forbidden: Operators cannot set targets' }, { status: 403 });
    }

    const body = await request.json();
    const { year, month, targetGeneration, notes } = body;

    if (!year || !month || !targetGeneration) {
      return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    if (targetGeneration <= 0) {
      return NextResponse.json({ error: 'الهدف يجب أن يكون أكبر من صفر' }, { status: 400 });
    }

    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'الشهر غير صالح' }, { status: 400 });
    }

    const target = await MonthlyTarget.findOneAndUpdate(
      { year, month },
      {
        targetGeneration: Number(targetGeneration),
        notes: notes || '',
        createdBy: new mongoose.Types.ObjectId(session.user.id),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ target, success: true, message: 'تم حفظ الهدف بنجاح' }, { status: 200 });
  } catch (error) {
    console.error('Error saving target:', error);
    return NextResponse.json({ error: 'فشل في حفظ الهدف' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session || session.user.role === 'Operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '');
    const month = parseInt(searchParams.get('month') || '');

    if (!year || !month) {
      return NextResponse.json({ error: 'السنة والشهر مطلوبان' }, { status: 400 });
    }

    const target = await MonthlyTarget.findOneAndDelete({ year, month });

    if (!target) {
      return NextResponse.json({ error: 'لا يوجد هدف لهذا الشهر' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف الهدف' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'فشل في حذف الهدف' }, { status: 500 });
  }
}