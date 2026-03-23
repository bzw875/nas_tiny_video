import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Video } from '../entities/Video';
import { SmbCrawler, SmbConfig } from '../services/SmbCrawler';
import { validateSmbConfig } from '../config/smb';

const router = Router();
const videoRepo = AppDataSource.getRepository(Video);

// Default SMB config - should be moved to env/config
const defaultSmbConfig: SmbConfig = {
  share: 'smb',
  path: '/Volumes/banzhaowu/FormatFactory/BaiduNetdisk/',
  domain: '',
  host: '192.168.1.17',
  port: 445,
  username: 'fnnas',
  password: 'shenJ!2017',
};

// List all videos with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';

    const query = videoRepo.createQueryBuilder('video');

    if (search) {
      query.where('video.filename LIKE :search', { search: `%${search}%` });
    }

    const [videos, total] = await query
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
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get video by ID
router.get('/:id', async (req, res) => {
  try {
    const video = await videoRepo.findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json(video);
  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: 'Failed to fetch video' });
  }
});

// Stream video from SMB
router.get('/:id/stream', async (req, res) => {
  try {
    const video = await videoRepo.findOne({
      where: { id: parseInt(req.params.id) },
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Return SMB URL for streaming
    const smbUrl = `smb://${video.smbHost}${video.path}`;
    res.json({
      streamUrl: smbUrl,
      filename: video.filename,
      size: video.size,
    });
  } catch (error) {
    console.error('Error streaming video:', error);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Trigger SMB crawl
router.post('/crawl', async (req, res) => {
  try {
    const { path, config } = req.body;
    const smbConfig: SmbConfig = config || defaultSmbConfig;
    const crawlPath = defaultSmbConfig.path;

    // Validate config
    const errors = validateSmbConfig(smbConfig);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Invalid SMB config', details: errors });
    }

    const crawler = new SmbCrawler(smbConfig);
    const videos: { filename: string; path: string; size: number; modifiedAt: Date }[] = [];

    try {
      console.log(`Starting crawl from: ${crawlPath}`);
      await crawler.crawlDirectory(crawlPath, (video) => {
        videos.push(video);
        console.log(`Found video: ${video.filename}`);
      });

      const savedCount = await crawler.saveToDatabase(videos);

      res.json({
        message: 'Crawl completed',
        found: videos.length,
        saved: savedCount,
        videos,
      });
    } finally {
      crawler.close();
    }
  } catch (error) {
    console.error('Error crawling SMB:', error);
    res.status(500).json({ error: 'Failed to crawl SMB', details: String(error) });
  }
});

export default router;
