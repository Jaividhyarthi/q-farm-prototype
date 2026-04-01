import { Router } from 'express';
import crypto from 'node:crypto';
import Journey from '../models/Journey.js';

const router = Router();

const createDefaultLetters = () =>
  Array.from({ length: 14 }, (_, i) => ({
    day: i + 1,
    title: `Day ${i + 1}`,
    theme: '',
    content: '',
    spotifyUrl: '',
    imageUrl: '',
    status: 'draft',
  }));

router.post('/journeys', async (req, res) => {
  const { creatorName, viewerName, password, backgroundMusicUrl } = req.body;
  const creatorKey = crypto.randomUUID();
  const shareId = crypto.randomBytes(6).toString('hex');
  const journey = await Journey.create({
    creatorName,
    viewerName,
    password: password || '',
    backgroundMusicUrl: backgroundMusicUrl || '',
    creatorKey,
    shareId,
    letters: createDefaultLetters(),
  });
  res.status(201).json({ shareId: journey.shareId, creatorKey: journey.creatorKey });
});

router.put('/journeys/:shareId/letters/:day', async (req, res) => {
  const { shareId, day } = req.params;
  const { creatorKey, ...payload } = req.body;
  const journey = await Journey.findOne({ shareId });
  if (!journey) return res.status(404).json({ message: 'Journey not found' });
  if (journey.creatorKey !== creatorKey) return res.status(403).json({ message: 'Invalid creator key' });
  if (journey.isPublished) return res.status(400).json({ message: 'Letters are locked' });
  const idx = journey.letters.findIndex((x) => x.day === Number(day));
  journey.letters[idx] = { ...journey.letters[idx].toObject(), ...payload };
  await journey.save();
  res.json(journey.letters[idx]);
});

router.post('/journeys/:shareId/publish', async (req, res) => {
  const { shareId } = req.params;
  const { creatorKey, letters, backgroundMusicUrl } = req.body;
  const journey = await Journey.findOne({ shareId });
  if (!journey) return res.status(404).json({ message: 'Journey not found' });
  if (journey.creatorKey !== creatorKey) return res.status(403).json({ message: 'Invalid creator key' });
  journey.letters = letters.map((l, i) => ({ ...l, day: i + 1, status: 'published' }));
  journey.backgroundMusicUrl = backgroundMusicUrl || journey.backgroundMusicUrl;
  journey.isPublished = true;
  await journey.save();
  res.json({ ok: true, shareId: journey.shareId });
});

router.get('/journeys/:shareId', async (req, res) => {
  const { shareId } = req.params;
  const password = req.header('x-love-password') || '';
  const journey = await Journey.findOne({ shareId });
  if (!journey || !journey.isPublished) return res.status(404).json({ message: 'Not ready yet' });
  if (journey.password && journey.password !== password) return res.status(401).json({ message: 'Invalid password' });
  res.json({
    viewerName: journey.viewerName,
    backgroundMusicUrl: journey.backgroundMusicUrl,
    letters: journey.letters,
  });
});

export default router;
