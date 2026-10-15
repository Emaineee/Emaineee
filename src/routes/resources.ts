import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  url: z.string().url(),
});

const router = Router();

router.get('/', authenticate, async (_req: Request, res: Response) => {
  const resources = await prisma.resource.findMany({
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(resources);
});

router.post('/', authenticate, authorize('COUNSELOR', 'ADMIN'), validate(createSchema), async (req: Request, res: Response) => {
  const { title, description, url } = req.body;
  const user = req.user!;

  const resource = await prisma.resource.create({
    data: { title, description, url, authorId: user.userId },
    include: {
      author: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  res.status(201).json(resource);
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  await prisma.resource.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
