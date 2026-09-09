import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Unit, DailyLog } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const unit = await Unit.findById(params.id);

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const stats = await DailyLog.aggregate([
      {
        $match: {
          unitId: new mongoose.Types.ObjectId(params.id),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalGeneration: { $sum: '$totalGeneration' },
          totalHours: { $sum: '$operatingHours' },
          avgTemperature: { $avg: '$ambientTemperature' },
          avgPMax: { $avg: '$pMax' },
          avgPMin: { $avg: '$pMin' },
          avgQMax: { $avg: '$qMax' },
          avgQMin: { $avg: '$qMin' },
          totalBT01: { $sum: '$bt01Consumption' },
          totalBT02: { $sum: '$bt02Consumption' },
          totalBL01: { $sum: '$bl01Consumption' },
          totalBM01: { $sum: '$bm01Consumption' },
          totalExcitation: { $sum: '$excitationConsumption' },
          totalDays: { $sum: 1 },
        },
      },
    ]);

    // Günlük veriler
    const dailyData = await DailyLog.find({
      unitId: params.id,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .select('date operatingHours totalGeneration ambientTemperature heatConsumption bt01Consumption bt02Consumption bl01Consumption bm01Consumption excitationConsumption');

    const unitStats = stats[0] || {
      totalGeneration: 0,
      totalHours: 0,
      avgTemperature: 0,
      avgPMax: 0,
      avgPMin: 0,
      avgQMax: 0,
      avgQMin: 0,
      totalBT01: 0,
      totalBT02: 0,
      totalBL01: 0,
      totalBM01: 0,
      totalExcitation: 0,
      totalDays: 0,
    };

    // Kapasite faktörü
    const capacityFactor = unit.capacityMW > 0 && unitStats.totalHours > 0
      ? (unitStats.totalGeneration / (unit.capacityMW * unitStats.totalHours)) * 100
      : 0;

    // Net üretim
    const totalConsumption = 
      unitStats.totalBT01 + unitStats.totalBT02 + unitStats.totalBL01 + 
      unitStats.totalBM01 + unitStats.totalExcitation;
    const netGeneration = unitStats.totalGeneration - totalConsumption;

    return NextResponse.json({
      unit: {
        _id: unit._id,
        unitCode: unit.unitCode,
        unitNameAr: unit.unitNameAr,
        unitType: unit.unitType,
        capacityMW: unit.capacityMW,
        multiplier: unit.multiplier,
      },
      period: { year, month },
      stats: {
        ...unitStats,
        capacityFactor,
        totalConsumption,
        netGeneration,
      },
      dailyData,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching unit stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}