import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Video } from '../entities/Video';
import SMB2 from 'smb2';

const router = Router();

// Stream video from SMB
router.get('/video/:id', async (req: Request, res: Response) => {
  try {
    const videoId = parseInt(req.params.id as string);
    const videoRepo = AppDataSource.getRepository(Video);
    const video = await videoRepo.findOne({ where: { id: videoId } });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Create SMB client for streaming
    const client = SMB2.createClient({
      share: 'smb', // Default share
      domain: '',
      host: video.smbHost,
      port: 445,
      username: 'guest', // Default username
      password: '', // Default password
    });

    // Get file info for Content-Type
    const ext = video.filename.toLowerCase().slice(video.filename.lastIndexOf('.'));
    const contentTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.mkv': 'video/x-matroska',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
    };

    res.setHeader('Content-Type', contentTypes[ext] || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');

    // Stream the file
    const stream = client.createReadStream(video.path);
    stream.pipe(res);

    stream.on('error', (err: any) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Stream error' });
      }
    });

    res.on('close', () => {
      client.destroy();
    });
  } catch (error: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

export default router;
