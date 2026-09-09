import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DailyLog, Unit } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import { calculateDailyLogFromInput } from '@/lib/calculations';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const unitId = searchParams.get('unitId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const limit = parseInt(searchParams.get('limit') || '500');

    let query: any = {};
    if (date) {
      const sd = new Date(date); const ed = new Date(date); ed.setDate(ed.getDate() + 1);
      query.date = { $gte: sd, $lt: ed };
    }
    if (unitId) query.unitId = new mongoose.Types.ObjectId(unitId);
    if (year && month) {
      query.date = { $gte: new Date(parseInt(year), parseInt(month)-1, 1), $lt: new Date(parseInt(year), parseInt(month), 1) };
    }

    const dailyLogs = await DailyLog.find(query)
      .populate({ path: 'unitId', select: 'unitCode unitNameAr unitType multiplier capacityMW' })
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .limit(limit);

    return NextResponse.json({ dailyLogs, count: dailyLogs.length }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    
    if (!body.unitId || !body.date) {
      return NextResponse.json({ error: 'الوحدة والتاريخ مطلوبان' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(body.date);
    inputDate.setHours(0, 0, 0, 0);
    if (inputDate > today) {
      return NextResponse.json({ error: 'لا يمكن إدخال بيانات لتاريخ مستقبلي' }, { status: 400 });
    }

    const unit = await Unit.findById(body.unitId);
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    const pMax = Number(body.pMax) || 0;
    const pMin = Number(body.pMin) || 0;
    if (pMax > 0 && pMin > 0 && pMax < pMin) {
      return NextResponse.json({ error: 'P max يجب أن يكون أكبر من أو يساوي P min' }, { status: 400 });
    }

    const qMax = Number(body.qMax) || 0;
    const qMin = Number(body.qMin) || 0;
    if (qMax > 0 && qMin > 0 && qMax < qMin) {
      return NextResponse.json({ error: 'Q max يجب أن يكون أكبر من أو يساوي Q min' }, { status: 400 });
    }

    const generatorStart = Number(body.generatorStart) || 0;
    const generatorEnd = Number(body.generatorEnd) || 0;
    if (generatorEnd < generatorStart) {
      return NextResponse.json({ error: 'قراءة نهاية العداد يجب أن تكون أكبر من أو تساوي البداية' }, { status: 400 });
    }

    const previousLog = await DailyLog.findOne({
      unitId: new mongoose.Types.ObjectId(body.unitId),
      date: { $lt: inputDate },
    }).sort({ date: -1 });

    if (previousLog && generatorStart < previousLog.generatorEnd) {
      return NextResponse.json({ 
        error: `قراءة بداية العداد (${generatorStart}) يجب أن تكون أكبر من أو تساوي نهاية آخر قراءة (${previousLog.generatorEnd}) بتاريخ ${previousLog.date.toISOString().split('T')[0]}` 
      }, { status: 400 });
    }

    const existingLog = await DailyLog.findOne({
      unitId: new mongoose.Types.ObjectId(body.unitId),
      date: inputDate,
    });
    if (existingLog) {
      return NextResponse.json({ error: 'يوجد سجل بالفعل لهذه الوحدة في هذا التاريخ' }, { status: 400 });
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

    const dailyLog = await DailyLog.create({
      unitId: new mongoose.Types.ObjectId(body.unitId),
      date: inputDate,
      operatingHours,
      pMax,
      pMin,
      qMax,
      qMin,
      generatorStart,
      generatorEnd,
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
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    const populatedLog = await DailyLog.findById(dailyLog._id)
      .populate('unitId', 'unitCode unitNameAr unitType multiplier');

    return NextResponse.json({ dailyLog: populatedLog, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating daily log:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}