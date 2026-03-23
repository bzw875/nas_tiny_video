import { Router, Request, Response } from 'express';
import { initDatabase } from '../config/database';
import { SmbCrawler } from '../services/SmbCrawler';

const router = Router();

// Trigger crawler
router.post('/crawl', async (req: Request, res: Response) => {
  try {
    await initDatabase();

    const { host, share, username, password, path } = req.body;

    const config = {
      share: share || 'smb',
      path: path || '/',
      domain: '',
      host: host || '192.168.1.17',
      port: 445,
      username: username || 'guest',
      password: password || '',
    };

    const crawler = new SmbCrawler(config);
    const videos = await crawler.crawlDirectory(path || '/');
    const count = await crawler.saveToDatabase(videos);
    crawler.close();

    res.json({
      message: 'Crawl completed',
      totalFound: videos.length,
      newVideos: count,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
