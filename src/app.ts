import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './config/database';
import videoRoutes from './routes/videoRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/videos', videoRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

async function bootstrap() {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch(console.error);
