import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/', async (_req: Request, res: Response) => {
  const usersByRole = await prisma.user.groupBy({
    by: ['role'],
    _count: { role: true },
  });

  const apptByStatus = await prisma.appointment.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const concernByStatus = await prisma.concern.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const concernByCategory = await prisma.concern.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
  });

  const referralByStatus = await prisma.referral.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const appointments = await prisma.appointment.findMany({
    select: {
      scheduledAt: true,
      counselor: { select: { id: true, firstName: true, lastName: true } },
      student: { select: { id: true, firstName: true, lastName: true, department: true } },
    },
  });

  const byDepartment: Record<string, number> = {};
  const byCounselor: Record<string, { name: string; count: number }> = {};
  const byStudent: Record<string, { name: string; count: number }> = {};
  const last30Days: Record<string, number> = {};

  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last30Days[d.toISOString().slice(0, 10)] = 0;
  }

  for (const a of appointments) {
    const dept = a.student.department || 'Unspecified';
    byDepartment[dept] = (byDepartment[dept] || 0) + 1;

    const c = a.counselor;
    const cname = `${c.firstName} ${c.lastName}`;
    if (!byCounselor[c.id]) byCounselor[c.id] = { name: cname, count: 0 };
    byCounselor[c.id].count += 1;

    const s = a.student;
    const sname = `${s.firstName} ${s.lastName}`;
    if (!byStudent[s.id]) byStudent[s.id] = { name: sname, count: 0 };
    byStudent[s.id].count += 1;

    const day = a.scheduledAt.toISOString().slice(0, 10);
    if (day in last30Days) last30Days[day] += 1;
  }

  const totalUsers = await prisma.user.count();
  const totalSessions = await prisma.session.count();

  res.json({
    users: {
      total: totalUsers,
      byRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count.role])),
    },
    appointments: {
      total: appointments.length,
      byStatus: Object.fromEntries(apptByStatus.map((r) => [r.status, r._count.status])),
      byDepartment: Object.entries(byDepartment)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count),
      byCounselor: Object.values(byCounselor).sort((a, b) => b.count - a.count),
      topStudents: Object.values(byStudent).sort((a, b) => b.count - a.count).slice(0, 10),
      last30Days: Object.entries(last30Days).map(([date, count]) => ({ date, count })),
    },
    concerns: {
      total: concernByStatus.reduce((n, r) => n + r._count.status, 0),
      byStatus: Object.fromEntries(concernByStatus.map((r) => [r.status, r._count.status])),
      byCategory: concernByCategory.map((r) => ({ category: r.category, count: r._count.category })),
    },
    referrals: {
      total: referralByStatus.reduce((n, r) => n + r._count.status, 0),
      byStatus: Object.fromEntries(referralByStatus.map((r) => [r.status, r._count.status])),
    },
    sessions: { total: totalSessions },
  });
});

export default router;
