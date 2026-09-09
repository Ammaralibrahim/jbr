import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Unit, DailyLog } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import { unitSchema } from '@/lib/validators';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('stats') === 'true';

    const units = await Unit.find({ isActive: true }).sort({ sortOrder: 1 });

    if (includeStats) {
      const unitsWithStats = await Promise.all(
        units.map(async (unit) => {
          const logs = await DailyLog.find({ unitId: unit._id }).sort({ date: -1 }).limit(30);
          const totalGeneration = logs.reduce((sum, log) => sum + (log.totalGeneration || 0), 0);
          const totalHours = logs.reduce((sum, log) => sum + (log.operatingHours || 0), 0);
          const lastLog = logs[0] || null;

          return {
            ...unit.toObject(),
            stats: {
              totalGeneration,
              totalHours,
              totalLogs: logs.length,
              lastLogDate: lastLog?.date || null,
              lastGeneration: lastLog?.totalGeneration || 0,
            },
          };
        })
      );
      return NextResponse.json({ units: unitsWithStats }, { status: 200 });
    }

    return NextResponse.json({ units }, { status: 200 });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = unitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation error', details: validation.error.errors }, { status: 400 });
    }

    const existingUnit = await Unit.findOne({ unitCode: validation.data.unitCode });
    if (existingUnit) return NextResponse.json({ error: 'Unit already exists' }, { status: 400 });

    const unit = await Unit.create(validation.data);
    return NextResponse.json({ unit, success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}