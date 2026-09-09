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
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeLogs = searchParams.get('logs') === 'true';
    const limit = parseInt(searchParams.get('limit') || '30');
    const page = parseInt(searchParams.get('page') || '1');

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

      const stats = await DailyLog.aggregate([
        { $match: { unitId: new mongoose.Types.ObjectId(params.id) } },
        {
          $group: {
            _id: null,
            totalGeneration: { $sum: '$totalGeneration' },
            totalHours: { $sum: '$operatingHours' },
            totalConsumption: {
              $sum: {
                $add: ['$bt01Consumption', '$bt02Consumption', '$bl01Consumption', '$bm01Consumption', '$excitationConsumption'],
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

    return NextResponse.json(result, { status: 200 });
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

    const body = await request.json();

    // السماح بتحديث multiplier مع الحقول الأخرى
    const allowedFields = [
      'unitCode',
      'unitName',
      'unitNameAr',
      'unitType',
      'capacityMW',
      'multiplier',
      'sortOrder',
      'isActive',
    ];

    const updateData: any = {};
    Object.keys(body).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = body[key];
      }
    });

    const unit = await Unit.findByIdAndUpdate(params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

    return NextResponse.json({ unit, success: true }, { status: 200 });
  } catch (error) {
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

    return NextResponse.json({ message: 'Unit deleted successfully', success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}