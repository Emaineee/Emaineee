import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.string().default('ALL'),
});

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  const announcements = await prisma.announcement.findMany({
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  res.json(announcements);
});

router.post('/', authenticate, authorize('COUNSELOR', 'ADMIN'), validate(createSchema), async (req: Request, res: Response) => {
  const { title, body, audience } = req.body;
  const user = req.user!;

  const announcement = await prisma.announcement.create({
    data: { title, body, audience, authorId: user.userId },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json(announcement);
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
