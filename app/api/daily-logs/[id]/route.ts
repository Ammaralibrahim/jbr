import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DailyLog, Unit } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import { calculateDailyLogFromInput } from '@/lib/calculations';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dailyLog = await DailyLog.findById(params.id)
      .populate({ path: 'unitId', select: 'unitCode unitNameAr unitType multiplier capacityMW' })
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name');

    if (!dailyLog) return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });
    return NextResponse.json({ dailyLog }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const dailyLog = await DailyLog.findById(params.id);
    if (!dailyLog) return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });

    const unit = await Unit.findById(dailyLog.unitId);
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    const pMax = Number(body.pMax) || 0;
    const pMin = Number(body.pMin) || 0;
    if (pMax > 0 && pMin > 0 && pMax < pMin) {
      return NextResponse.json({ error: 'P max يجب أن يكون أكبر من P min' }, { status: 400 });
    }

    const qMax = Number(body.qMax) || 0;
    const qMin = Number(body.qMin) || 0;
    if (qMax > 0 && qMin > 0 && qMax < qMin) {
      return NextResponse.json({ error: 'Q max يجب أن يكون أكبر من Q min' }, { status: 400 });
    }

    const generatorStart = Number(body.generatorStart) || 0;
    const generatorEnd = Number(body.generatorEnd) || 0;
    if (generatorEnd < generatorStart) {
      return NextResponse.json({ error: 'نهاية العداد يجب أن تكون أكبر من البداية' }, { status: 400 });
    }

    const operatingHours = Number(body.operatingHours) || 24;
    if (operatingHours < 0 || operatingHours > 24) {
      return NextResponse.json({ error: 'ساعات العمل يجب أن تكون بين 0 و 24' }, { status: 400 });
    }

    const calculations = calculateDailyLogFromInput({
      unit,
      generatorStart,
      generatorEnd,
      bt01Start: Number(body.bt01Start) || 0,
      bt01End: Number(body.bt01End) || 0,
      bt02Start: Number(body.bt02Start) || 0,
      bt02End: Number(body.bt02End) || 0,
      bl01Start: Number(body.bl01Start) || 0,
      bl01End: Number(body.bl01End) || 0,
      bm01Start: Number(body.bm01Start) || 0,
      bm01End: Number(body.bm01End) || 0,
      excitationStart: Number(body.excitationStart) || 0,
      excitationEnd: Number(body.excitationEnd) || 0,
      reactiveStart: Number(body.reactiveStart) || 0,
      reactiveEnd: Number(body.reactiveEnd) || 0,
    });

    const updatedLog = await DailyLog.findByIdAndUpdate(
      params.id,
      {
        operatingHours,
        pMax, pMin, qMax, qMin,
        generatorStart, generatorEnd,
        totalGeneration: calculations.totalGeneration,
        bt01Start: Number(body.bt01Start) || 0,
        bt01End: Number(body.bt01End) || 0,
        bt01Consumption: calculations.bt01Consumption,
        bt02Start: Number(body.bt02Start) || 0,
        bt02End: Number(body.bt02End) || 0,
        bt02Consumption: calculations.bt02Consumption,
        bl01Start: Number(body.bl01Start) || 0,
        bl01End: Number(body.bl01End) || 0,
        bl01Consumption: calculations.bl01Consumption,
        bm01Start: Number(body.bm01Start) || 0,
        bm01End: Number(body.bm01End) || 0,
        bm01Consumption: calculations.bm01Consumption,
        excitationStart: Number(body.excitationStart) || 0,
        excitationEnd: Number(body.excitationEnd) || 0,
        excitationConsumption: calculations.excitationConsumption,
        reactiveStart: Number(body.reactiveStart) || 0,
        reactiveEnd: Number(body.reactiveEnd) || 0,
        reactiveGeneration: Math.max(0, (Number(body.reactiveEnd) || 0) - (Number(body.reactiveStart) || 0)),
        notes: body.notes || '',
        updatedBy: new mongoose.Types.ObjectId(session.user.id),
      },
      { new: true }
    ).populate('unitId', 'unitCode unitNameAr unitType multiplier');

    return NextResponse.json({ dailyLog: updatedLog, success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating daily log:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role === 'Operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dailyLog = await DailyLog.findByIdAndDelete(params.id);
    if (!dailyLog) return NextResponse.json({ error: 'Daily log not found' }, { status: 404 });

    return NextResponse.json({ message: 'Daily log deleted successfully', success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}