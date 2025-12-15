// prisma/seed.ts
import { PrismaClient, CallStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agency.com' },
    update: {},
    create: {
      email: 'admin@agency.com',
      password: adminPassword,
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin user created:', admin.email);

  // Create demo client user
  const clientPassword = await bcrypt.hash('Client@123', 10);
  
  const client = await prisma.user.upsert({
    where: { email: 'demo@client.com' },
    update: {},
    create: {
      email: 'demo@client.com',
      password: clientPassword,
      name: 'Demo Client',
      role: 'CLIENT',
      isActive: true,
      tenantId: undefined, // Will be set to user's own ID after creation
      pricePerMinute: 0.10,
      monthlyCharge: 50.00,
      billingCycle: 'monthly',
      appAccess: ['dashboard', 'calls', 'appointments', 'integrations'],
    },
  });

  // Update tenantId to user's own ID for isolation
  await prisma.user.update({
    where: { id: client.id },
    data: { tenantId: client.id },
  });

  console.log('✅ Demo client created:', client.email);

  // Create sample calls for demo client
  const sampleCalls = [
    {
      user: { connect: { id: client.id } },
      callId: 'call_' + Math.random().toString(36).substr(2, 9),
      customerPhone: '+1234567890',
      status: CallStatus.COMPLETED,
      duration: 180,
      cost: 0.30,
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 180000),
      endReason: 'completed',
      transcript: 'Sample call transcript...',
      summary: 'Customer inquired about pricing and scheduled a demo.',
      isSuccessful: true,
    },
    {
      user: { connect: { id: client.id } },
      callId: 'call_' + Math.random().toString(36).substr(2, 9),
      customerPhone: '+0987654321',
      status: CallStatus.TRANSFERRED,
      duration: 120,
      cost: 0.20,
      startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 120000),
      endReason: 'transferred',
      transcript: 'Sample call transcript...',
      summary: 'Customer requested to speak with sales team.',
      isSuccessful: true,
      transferredTo: 'sales@agency.com',
    },
    {
      user: { connect: { id: client.id } },
      callId: 'call_' + Math.random().toString(36).substr(2, 9),
      customerPhone: '+1122334455',
      status: CallStatus.FAILED,
      duration: 30,
      cost: 0.05,
      startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
      endTime: new Date(Date.now() - 3 * 60 * 60 * 1000 + 30000),
      endReason: 'technical_error',
      isSuccessful: false,
    },
  ];

  for (const call of sampleCalls) {
    await prisma.call.create({ data: call });
  }

  console.log('✅ Sample calls created');

  // Create system config
  await prisma.systemConfig.upsert({
    where: { key: 'email_config' },
    update: {},
    create: {
      key: 'email_config',
      value: {
        enabled: false,
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpFrom: 'noreply@agency.com',
      },
    },
  });

  console.log('✅ System config created');
  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📧 Default Credentials:');
  console.log('   Admin: admin@agency.com / Admin@123');
  console.log('   Demo Client: demo@client.com / Client@123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
