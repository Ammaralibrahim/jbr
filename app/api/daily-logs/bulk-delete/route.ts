export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DailyLog } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role === 'Operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      ids,
      unitId, startDate, endDate,
      deleteAll, deleteAllFiltered,
      filterUnitId, filterStartDate, filterEndDate,
    } = body;

    let query: any = {};

    if (deleteAll) {
      if (session.user.role !== 'Admin') {
        return NextResponse.json({ error: 'Only Admin' }, { status: 403 });
      }
      query = {};
    } else if (deleteAllFiltered) {
      // Frontend'den gelen filtre alanları (filterX) VEYA eski alanlar
      const fUnit = filterUnitId || unitId;
      const fStart = filterStartDate || startDate;
      const fEnd = filterEndDate || endDate;

      if (fUnit && mongoose.Types.ObjectId.isValid(fUnit)) {
        query.unitId = new mongoose.Types.ObjectId(fUnit);
      }
      if (fStart && fEnd) {
        const start = new Date(fStart);
        start.setHours(0, 0, 0, 0);
        const end = new Date(fEnd);
        end.setHours(23, 59, 59, 999);
        query.date = { $gte: start, $lte: end };
      } else if (fStart) {
        const start = new Date(fStart);
        start.setHours(0, 0, 0, 0);
        query.date = { $gte: start };
      } else if (fEnd) {
        const end = new Date(fEnd);
        end.setHours(23, 59, 59, 999);
        query.date = { $lte: end };
      }
    } else if (Array.isArray(ids) && ids.length > 0) {
      const valid = ids.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
      if (valid.length === 0) {
        return NextResponse.json({ error: 'No valid IDs' }, { status: 400 });
      }
      query._id = { $in: valid.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } else {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const result = await DailyLog.deleteMany(query);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount || 0,
      message: `تم حذف ${result.deletedCount || 0} سجل`,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'فشل في الحذف' }, { status: 500 });
  }
}