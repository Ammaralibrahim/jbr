export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Unit, DailyLog } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('logs') === 'true';
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '30'));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));

    const unit = await Unit.findById(params.id);
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    let result: any = { unit };

    if (includeLogs) {
      const skip = (page - 1) * limit;
      const [logs, totalLogs] = await Promise.all([
        DailyLog.find({ unitId: params.id })
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .populate('createdBy', 'name'),
        DailyLog.countDocuments({ unitId: params.id }),
      ]);

      // Aggregate: sıcaklık veya ısı YOK
      const stats = await DailyLog.aggregate([
        { $match: { unitId: new mongoose.Types.ObjectId(params.id) } },
        {
          $group: {
            _id: null,
            totalGeneration: { $sum: '$totalGeneration' },
            totalHours: { $sum: '$operatingHours' },
            totalConsumption: {
              $sum: {
                $add: [
                  { $ifNull: ['$bt01Consumption', 0] },
                  { $ifNull: ['$bt02Consumption', 0] },
                  { $ifNull: ['$bl01Consumption', 0] },
                  { $ifNull: ['$bm01Consumption', 0] },
                  { $ifNull: ['$excitationConsumption', 0] },
                ],
              },
            },
            totalDays: { $sum: 1 },
          },
        },
      ]);

      result = {
        unit,
        logs,
        totalLogs,
        page,
        totalPages: Math.ceil(totalLogs / limit),
        stats: stats[0] || { totalGeneration: 0, totalHours: 0, totalConsumption: 0, totalDays: 0 },
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching unit:', error);
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
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = ['unitCode', 'unitName', 'unitNameAr', 'unitType', 'capacityMW', 'multiplier', 'sortOrder', 'isActive'];
    const updateData: any = {};
    for (const key of Object.keys(body)) {
      if (allowedFields.includes(key)) updateData[key] = body[key];
    }

    // Multiplier özel doğrulama
    if (updateData.multiplier !== undefined) {
      const m = Number(updateData.multiplier);
      if (!isFinite(m) || m < 0.001) {
        return NextResponse.json({ error: 'المعامل يجب أن يكون أكبر من 0.001' }, { status: 400 });
      }
      updateData.multiplier = m;
    }

    const unit = await Unit.findByIdAndUpdate(params.id, updateData, { new: true, runValidators: true });
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    return NextResponse.json({ unit, success: true });
  } catch (error) {
    console.error('Unit PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logCount = await DailyLog.countDocuments({ unitId: params.id });
    if (logCount > 0) {
      return NextResponse.json({ error: 'لا يمكن حذف وحدة لديها سجلات' }, { status: 400 });
    }

    const unit = await Unit.findByIdAndDelete(params.id);
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    return NextResponse.json({ message: 'Deleted', success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}