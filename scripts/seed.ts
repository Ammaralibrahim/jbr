import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ['Admin', 'PlantManager', 'Operator'] },
  employeeId: { type: String, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UnitSchema = new mongoose.Schema({
  unitCode: { type: String, unique: true },
  unitName: String,
  unitNameAr: String,
  unitType: { type: String, enum: ['Steam', 'Gas'] },
  capacityMW: Number,
  multiplier: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  sortOrder: Number,
}, { timestamps: true });

async function seed() {
  try {
    console.log('🔌 Connecting...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 30000 });
    console.log('✅ Connected');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Unit = mongoose.models.Unit || mongoose.model('Unit', UnitSchema);

    await User.deleteMany({});
    await Unit.deleteMany({});
    console.log('🧹 Cleared');

    const adminPass = await bcrypt.hash('admin123456', 10);
    const mgrPass = await bcrypt.hash('manager123456', 10);
    const opPass = await bcrypt.hash('operator123456', 10);

    await User.create([
      { name: 'مدير النظام', email: 'admin@tishreen.com', password: adminPass, role: 'Admin', employeeId: 'ADMIN001', isActive: true },
      { name: 'مدير المحطة', email: 'manager@tishreen.com', password: mgrPass, role: 'PlantManager', employeeId: 'MGR001', isActive: true },
      { name: 'مشغل المحطة', email: 'operator@tishreen.com', password: opPass, role: 'Operator', employeeId: 'OPR001', isActive: true },
    ]);
    console.log('✅ Users created');

    // Multiplier = 1 (kullanıcı isterse UI'dan değiştirebilir)
    await Unit.insertMany([
      { unitCode: 'ST1', unitName: 'Steam Turbine 1', unitNameAr: 'توربين بخاري 1', unitType: 'Steam', capacityMW: 150, multiplier: 1, sortOrder: 1, isActive: true },
      { unitCode: 'ST2', unitName: 'Steam Turbine 2', unitNameAr: 'توربين بخاري 2', unitType: 'Steam', capacityMW: 150, multiplier: 1, sortOrder: 2, isActive: true },
      { unitCode: 'ST3', unitName: 'Steam Turbine 3', unitNameAr: 'توربين بخاري 3', unitType: 'Steam', capacityMW: 150, multiplier: 1, sortOrder: 3, isActive: true },
      { unitCode: 'GT1', unitName: 'Gas Turbine 1', unitNameAr: 'توربين غازي 1', unitType: 'Gas', capacityMW: 100, multiplier: 1, sortOrder: 4, isActive: true },
      { unitCode: 'GT2', unitName: 'Gas Turbine 2', unitNameAr: 'توربين غازي 2', unitType: 'Gas', capacityMW: 100, multiplier: 1, sortOrder: 5, isActive: true },
      { unitCode: 'GT3', unitName: 'Gas Turbine 3', unitNameAr: 'توربين غازي 3', unitType: 'Gas', capacityMW: 100, multiplier: 1, sortOrder: 6, isActive: true },
      { unitCode: 'GT4', unitName: 'Gas Turbine 4', unitNameAr: 'توربين غازي 4', unitType: 'Gas', capacityMW: 100, multiplier: 1, sortOrder: 7, isActive: true },
    ]);
    console.log('✅ Units created (multiplier=1)');

    console.log('\n🎉 Done!');
    console.log('Admin: admin@tishreen.com / admin123456');
    console.log('Manager: manager@tishreen.com / manager123456');
    console.log('Operator: operator@tishreen.com / operator123456');
    console.log('\n⚠️  Multiplier defaults to 1. Change it per unit if needed.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();