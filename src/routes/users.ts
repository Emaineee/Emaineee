import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createCounselorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  department: z.string().optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'COUNSELOR', 'STUDENT', 'FACULTY']),
});

const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});

const router = Router();

router.get('/directory', authenticate, async (_req: Request, res: Response) => {
  const counselors = await prisma.user.findMany({
    where: { role: 'COUNSELOR', isActive: true },
    select: { id: true, firstName: true, lastName: true, department: true },
    orderBy: { firstName: 'asc' },
  });
  res.json(counselors);
});

router.use(authenticate, authorize('ADMIN'));

router.get('/', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      studentId: true,
      department: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(users);
});

router.post('/counselors', validate(createCounselorSchema), async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, department } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, role: 'COUNSELOR', department },
  });

  res.status(201).json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
});

router.patch('/:id/role', validate(updateRoleSchema), async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: req.body.role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  res.json(user);
});

router.patch('/:id/active', validate(toggleActiveSchema), async (req: Request, res: Response) => {
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: req.body.isActive },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      isActive: true,
    },
  });

  res.json(user);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.id === req.user!.userId) {
    res.status(400).json({ error: 'Cannot delete this user' });
    return;
  }

  await prisma.user.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
