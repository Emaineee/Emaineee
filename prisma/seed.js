const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const accounts = [
    {
      email: 'admin@uphsd.edu.ph',
      password: 'admin123',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      department: 'Guidance Office',
    },
    {
      email: 'counselor@uphsd.edu.ph',
      password: 'counselor123',
      firstName: 'Ma. Clarissn',
      lastName: 'Cardino',
      role: 'COUNSELOR',
      department: 'Guidance Office',
    },
    {
      email: 'student@uphsd.edu.ph',
      password: 'student123',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      role: 'STUDENT',
      studentId: '2023-00001',
    },
    {
      email: 'faculty@uphsd.edu.ph',
      password: 'faculty123',
      firstName: 'Maria',
      lastName: 'Santos',
      role: 'FACULTY',
      department: 'College of Business',
    },
  ];

  for (const account of accounts) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {},
      create: {
        email: account.email,
        passwordHash: bcrypt.hashSync(account.password, 12),
        firstName: account.firstName,
        lastName: account.lastName,
        role: account.role,
        studentId: account.studentId || null,
        department: account.department || null,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
