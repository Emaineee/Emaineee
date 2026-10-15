import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@uphsd.edu.ph' },
    update: {},
    create: {
      email: 'admin@uphsd.edu.ph',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
    },
  });

  const counselor = await prisma.user.upsert({
    where: { email: 'counselor@uphsd.edu.ph' },
    update: {},
    create: {
      email: 'counselor@uphsd.edu.ph',
      passwordHash: await bcrypt.hash('counselor123', 12),
      firstName: 'Ma. Clarissn',
      lastName: 'Cardino',
      role: 'COUNSELOR',
      department: 'Guidance Office',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@uphsd.edu.ph' },
    update: {},
    create: {
      email: 'student@uphsd.edu.ph',
      passwordHash: await bcrypt.hash('student123', 12),
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      role: 'STUDENT',
      studentId: '2023-00001',
    },
  });

  const faculty = await prisma.user.upsert({
    where: { email: 'faculty@uphsd.edu.ph' },
    update: {},
    create: {
      email: 'faculty@uphsd.edu.ph',
      passwordHash: await bcrypt.hash('faculty123', 12),
      firstName: 'Maria',
      lastName: 'Santos',
      role: 'FACULTY',
      department: 'College of Business',
    },
  });

  console.log('Seeded users:', { admin: admin.email, counselor: counselor.email, student: student.email, faculty: faculty.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
