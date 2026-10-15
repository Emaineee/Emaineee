import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

const updateSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
});

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const user = req.user!;
  const { status, studentId } = req.query;

  const where: any = {};
  if (user.role === 'STUDENT') where.studentId = user.userId;
  else if (studentId) where.studentId = studentId as string;
  if (status) where.status = status;

  const concerns = await prisma.concern.findMany({
    where,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(concerns);
});

router.post('/', authenticate, authorize('STUDENT'), validate(createSchema), async (req: Request, res: Response) => {
  const { category, title, description } = req.body;
  const user = req.user!;

  const concern = await prisma.concern.create({
    data: { studentId: user.userId, category, title, description },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json(concern);
});

router.patch('/:id', authenticate, authorize('COUNSELOR', 'ADMIN'), validate(updateSchema), async (req: Request, res: Response) => {
  const { status } = req.body;

  const concern = await prisma.concern.update({
    where: { id: req.params.id },
    data: { status },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.json(concern);
});

export default router;
