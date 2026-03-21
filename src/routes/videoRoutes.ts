import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Video } from '../entities/Video';
import { Tag } from '../entities/Tag';

const router = Router();

// Get all videos with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;

    const videoRepo = AppDataSource.getRepository(Video);
    const queryBuilder = videoRepo.createQueryBuilder('video');

    if (search) {
      queryBuilder.where('video.filename LIKE :search', { search: `%${search}%` });
    }

    const [videos, total] = await queryBuilder
      .orderBy('video.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    res.json({
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get video by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const videoRepo = AppDataSource.getRepository(Video);
    const video = await videoRepo.findOne({ where: { id: parseInt(req.params.id as string) } });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get tags for a video
router.get('/:id/tags', async (req: Request, res: Response) => {
  try {
    const tagRepo = AppDataSource.getRepository(Tag);
    // TODO: Implement video-tag association query
    const tags = await tagRepo.find();
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
