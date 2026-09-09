import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Environment dosyalarını yükle
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI bulunamadı!');
  process.exit(1);
}

// Kullanıcı şeması
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'PlantManager', 'Operator'], default: 'Operator' },
  employeeId: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UnitSchema = new mongoose.Schema({
  unitCode: { type: String, required: true, unique: true },
  unitName: { type: String, required: true },
  unitNameAr: { type: String, required: true },
  unitType: { type: String, enum: ['Steam', 'Gas'], required: true },
  capacityMW: { type: Number, required: true },
  multiplier: { type: Number, default: 315 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

async function seedDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    console.log('URI:', MONGODB_URI.replace(/\/\/.*@/, '//***@'));

    // Bağlantı seçenekleri - ECONNRESET hatası için önemli
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      connectTimeoutMS: 60000,
      socketTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
      w: 'majority',
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      // DNS çözümleme sorunları için
      family: 4, // IPv4 kullan
    });
    
    console.log('✅ Connected to database');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Unit = mongoose.models.Unit || mongoose.model('Unit', UnitSchema);

    // Mevcut verileri temizle
    await User.deleteMany({});
    await Unit.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Şifreleri hash'le
    const adminPassword = await bcrypt.hash('admin123456', 10);
    const managerPassword = await bcrypt.hash('manager123456', 10);
    const operatorPassword = await bcrypt.hash('operator123456', 10);

    // Kullanıcıları oluştur
    const adminUser = await User.create({
      name: 'مدير النظام',
      email: 'admin@tishreen.com',
      password: adminPassword,
      role: 'Admin',
      employeeId: 'ADMIN001',
      isActive: true,
    });

    const plantManager = await User.create({
      name: 'مدير المحطة',
      email: 'manager@tishreen.com',
      password: managerPassword,
      role: 'PlantManager',
      employeeId: 'MGR001',
      isActive: true,
    });

    const operator = await User.create({
      name: 'مشغل المحطة',
      email: 'operator@tishreen.com',
      password: operatorPassword,
      role: 'Operator',
      employeeId: 'OPR001',
      isActive: true,
    });

    console.log('✅ Created users:');
    console.log('Admin:', adminUser.email, '/ admin123456');
    console.log('Manager:', plantManager.email, '/ manager123456');
    console.log('Operator:', operator.email, '/ operator123456');

    // Üniteleri oluştur
    const units = [
      { unitCode: 'ST1', unitName: 'Steam Turbine 1', unitNameAr: 'توربين بخاري 1', unitType: 'Steam', capacityMW: 150, multiplier: 315, sortOrder: 1, isActive: true },
      { unitCode: 'ST2', unitName: 'Steam Turbine 2', unitNameAr: 'توربين بخاري 2', unitType: 'Steam', capacityMW: 150, multiplier: 315, sortOrder: 2, isActive: true },
      { unitCode: 'ST3', unitName: 'Steam Turbine 3', unitNameAr: 'توربين بخاري 3', unitType: 'Steam', capacityMW: 150, multiplier: 315, sortOrder: 3, isActive: true },
      { unitCode: 'GT1', unitName: 'Gas Turbine 1', unitNameAr: 'توربين غازي 1', unitType: 'Gas', capacityMW: 100, multiplier: 315, sortOrder: 4, isActive: true },
      { unitCode: 'GT2', unitName: 'Gas Turbine 2', unitNameAr: 'توربين غازي 2', unitType: 'Gas', capacityMW: 100, multiplier: 315, sortOrder: 5, isActive: true },
      { unitCode: 'GT3', unitName: 'Gas Turbine 3', unitNameAr: 'توربين غازي 3', unitType: 'Gas', capacityMW: 100, multiplier: 315, sortOrder: 6, isActive: true },
      { unitCode: 'GT4', unitName: 'Gas Turbine 4', unitNameAr: 'توربين غازي 4', unitType: 'Gas', capacityMW: 100, multiplier: 315, sortOrder: 7, isActive: true },
    ];

    const createdUnits = await Unit.insertMany(units);
    console.log('✅ Created units:', createdUnits.length);

    console.log('\n🎉 Database seeded successfully!');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    
    if (error && typeof error === 'object' && 'code' in error) {
      const mongoError = error as any;
      if (mongoError.code === 'ECONNRESET') {
        console.error('\n💡 ECONNRESET hatası! Olası çözümler:');
        console.error('1. İnternet bağlantınızı kontrol edin');
        console.error('2. VPN kullanıyorsanız kapatın');
        console.error('3. Firewall/Antivirüs engelliyor olabilir');
        console.error('4. MongoDB Atlas IP whitelist ayarlarını kontrol edin');
        console.error('5. Farklı bir internet bağlantısı deneyin');
      }
    }
    
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedDatabase();