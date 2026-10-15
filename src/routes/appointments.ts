import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  studentId: z.string().optional(),
  counselorId: z.string().min(1),
  scheduledAt: z.string().datetime({ offset: true }),
  purpose: z.string().min(1),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  scheduledAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const { status, studentId } = req.query;
  const user = req.user!;

  const where: any = {};
  if (status) where.status = status;
  if (user.role === 'STUDENT') where.studentId = user.userId;
  else if (user.role === 'COUNSELOR') where.counselorId = user.userId;
  else if (studentId) where.studentId = studentId as string;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentId: true, email: true } },
      counselor: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });

  res.json(appointments);
});

router.post('/', authenticate, authorize('STUDENT'), validate(createSchema), async (req: Request, res: Response) => {
  const { counselorId, scheduledAt, purpose, notes } = req.body;
  const user = req.user!;

  const studentId = req.body.studentId || user.userId;

  const counselor = await prisma.user.findFirst({
    where: { id: counselorId, role: 'COUNSELOR', isActive: true },
  });
  if (!counselor) {
    res.status(404).json({ error: 'Counselor not found' });
    return;
  }

  const appointment = await prisma.appointment.create({
    data: { studentId, counselorId, scheduledAt: new Date(scheduledAt), purpose, notes },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      counselor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  await prisma.notification.create({
    data: { userId: counselorId, message: `New appointment request from ${counselor.firstName}` },
  });

  res.status(201).json(appointment);
});

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: req.params.id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      counselor: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const user = req.user!;
  const isOwner = appointment.studentId === user.userId || appointment.counselorId === user.userId;
  if (!isOwner && user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  res.json(appointment);
});

router.patch('/:id', authenticate, validate(updateSchema), async (req: Request, res: Response) => {
  const user = req.user!;
  const appointment = await prisma.appointment.findUnique({ where: { id: req.params.id } });

  if (!appointment) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const isCounselor = appointment.counselorId === user.userId;
  const isAdmin = user.role === 'ADMIN';
  const isStudent = appointment.studentId === user.userId;

  if (!isCounselor && !isAdmin && !isStudent) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  if (isStudent && !isAdmin) {
    res.status(403).json({ error: 'Only counselors or admins can update appointments' });
    return;
  }

  const { scheduledAt, status, rejectionReason, notes } = req.body;
  const data: any = {};
  if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
  if (status) data.status = status;
  if (rejectionReason !== undefined) data.rejectionReason = rejectionReason;
  if (notes !== undefined) data.notes = notes;

  const updated = await prisma.appointment.update({
    where: { id: req.params.id },
    data,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      counselor: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (status && ['APPROVED', 'REJECTED', 'RESCHEDULED', 'CANCELLED'].includes(status)) {
    await prisma.notification.create({
      data: {
        userId: appointment.studentId,
        message: `Your appointment has been ${status.toLowerCase()}`,
      },
    });
  }

  res.json(updated);
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  await prisma.appointment.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
