import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().min(1),
  notes: z.string().optional(),
  date: z.string().datetime({ offset: true }),
});

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const user = req.user!;
  const { studentId } = req.query;

  const where: any = {};
  if (user.role === 'STUDENT') where.studentId = user.userId;
  else if (user.role === 'COUNSELOR') where.counselorId = user.userId;
  else if (studentId) where.studentId = studentId as string;

  const sessions = await prisma.session.findMany({
    where,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      counselor: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { date: 'desc' },
  });

  res.json(sessions);
});

router.post('/', authenticate, authorize('COUNSELOR', 'ADMIN'), validate(createSchema), async (req: Request, res: Response) => {
  const { studentId, title, notes, date } = req.body;
  const user = req.user!;

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'STUDENT') {
    res.status(404).json({ error: 'Student not found' });
    return;
  }

  const session = await prisma.session.create({
    data: { studentId, counselorId: user.userId, title, notes, date: new Date(date) },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      counselor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.notification.create({
    data: { userId: studentId, message: `A counseling session was recorded: ${title}` },
  });

  res.status(201).json(session);
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  await prisma.session.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
