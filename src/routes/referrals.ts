import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  studentName: z.string().min(1),
  studentCourse: z.string().min(1),
  reason: z.string().min(1),
});

const updateSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'ADDRESSED', 'CLOSED']),
});

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const { status } = req.query;

  const where: any = {};
  if (status) where.status = status;

  const referrals = await prisma.referral.findMany({
    where,
    include: {
      faculty: { select: { id: true, firstName: true, lastName: true, department: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(referrals);
});

router.post('/', authenticate, authorize('FACULTY'), validate(createSchema), async (req: Request, res: Response) => {
  const { studentName, studentCourse, reason } = req.body;
  const user = req.user!;

  const referral = await prisma.referral.create({
    data: { facultyId: user.userId, studentName, studentCourse, reason },
    include: {
      faculty: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  for (const admin of admins) {
    await prisma.notification.create({
      data: { userId: admin.id, message: `New faculty referral: ${studentName}` },
    });
  }

  res.status(201).json(referral);
});

router.patch('/:id', authenticate, authorize('COUNSELOR', 'ADMIN'), validate(updateSchema), async (req: Request, res: Response) => {
  const { status } = req.body;

  const referral = await prisma.referral.update({
    where: { id: req.params.id },
    data: { status },
    include: {
      faculty: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(referral);
});

export default router;
