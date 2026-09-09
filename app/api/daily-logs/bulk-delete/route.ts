import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DailyLog } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Operatörler silme yapamaz
    if (session.user.role === 'Operator') {
      return NextResponse.json({ error: 'Forbidden: Operators cannot delete logs' }, { status: 403 });
    }

    const body = await request.json();
    const { ids, unitId, startDate, endDate, deleteAll, deleteAllFiltered } = body;

    let query: any = {};
    let deletedCount = 0;

    if (deleteAll) {
      // TÜM kayıtları sil - Sadece Admin
      if (session.user.role !== 'Admin') {
        return NextResponse.json({ 
          error: 'Forbidden: Only Admin can delete ALL logs' 
        }, { status: 403 });
      }
      query = {};
    } else if (deleteAllFiltered) {
      // Filtrelenmiş tüm kayıtları sil
      const { filterUnitId, filterStartDate, filterEndDate } = body;
      
      if (filterUnitId && mongoose.Types.ObjectId.isValid(filterUnitId)) {
        query.unitId = new mongoose.Types.ObjectId(filterUnitId);
      }
      
      if (filterStartDate && filterEndDate) {
        query.date = {
          $gte: new Date(filterStartDate),
          $lte: new Date(filterEndDate),
        };
      } else if (filterStartDate) {
        query.date = { $gte: new Date(filterStartDate) };
      } else if (filterEndDate) {
        query.date = { $lte: new Date(filterEndDate) };
      }
    } else if (ids && Array.isArray(ids) && ids.length > 0) {
      // Belirli ID'lere göre sil
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length === 0) {
        return NextResponse.json({ error: 'No valid IDs provided' }, { status: 400 });
      }
      query._id = { $in: validIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (unitId && startDate && endDate) {
      // Ünite ve tarih aralığına göre sil
      if (!mongoose.Types.ObjectId.isValid(unitId)) {
        return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 });
      }
      query.unitId = new mongoose.Types.ObjectId(unitId);
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    } else {
      return NextResponse.json({ error: 'Invalid delete parameters' }, { status: 400 });
    }

    // Silme işlemi
    const result = await DailyLog.deleteMany(query);
    deletedCount = result.deletedCount || 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `تم حذف ${deletedCount} سجل بنجاح`,
    }, { status: 200 });

  } catch (error) {
    console.error('Error bulk deleting logs:', error);
    return NextResponse.json(
      { 
        error: 'فشل في الحذف', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}