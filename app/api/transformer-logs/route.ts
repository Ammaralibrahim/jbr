import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { TransformerLog } from '@/models';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unitId = searchParams.get('unitId');
    const date = searchParams.get('date');

    let query: any = {};

    if (unitId) {
      query.unitId = new mongoose.Types.ObjectId(unitId);
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.date = { $gte: startDate, $lt: endDate };
    }

    const transformerLogs = await TransformerLog.find(query)
      .populate('unitId', 'unitCode unitNameAr')
      .sort({ date: -1 });

    return NextResponse.json({ transformerLogs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching transformer logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      unitId,
      date,
      transformerCode,
      transformerName,
      transformerType,
      startReading,
      endReading,
    } = body;

    const consumption = endReading - startReading;

    const transformerLog = await TransformerLog.create({
      unitId: new mongoose.Types.ObjectId(unitId),
      date: new Date(date),
      transformerCode,
      transformerName,
      transformerType,
      startReading,
      endReading,
      consumption,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    return NextResponse.json({ transformerLog }, { status: 201 });
  } catch (error) {
    console.error('Error creating transformer log:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}