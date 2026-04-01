import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import journeysRouter from './routes/journeys.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_, res) => res.json({ ok: true, service: '14-days-of-you' }));
app.use('/api', journeysRouter);

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/14-days-of-you';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed', err.message);
    process.exit(1);
  });
