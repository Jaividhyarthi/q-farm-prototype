import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';

const target = new Date(Date.UTC(new Date().getUTCFullYear(), 3, 14, 0, 0, 0));
if (target < new Date()) target.setUTCFullYear(target.getUTCFullYear() + 1);

export default function ViewerMode() {
  const { shareId } = useParams();
  const [password, setPassword] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);
  const [day, setDay] = useState(1);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const t = setInterval(() => {
      const diff = target - new Date();
      const d = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
      const h = Math.max(0, Math.floor((diff / (1000 * 60 * 60)) % 24));
      setCountdown(`${d} days ${h} hours`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const load = async () => {
    try {
      const res = await api.get(`/journeys/${shareId}`, { headers: { 'x-love-password': password } });
      setData(res.data);
      setError('');
    } catch {
      setError('Password required or link unavailable.');
    }
  };

  const current = useMemo(() => data?.letters?.[day - 1], [data, day]);

  useEffect(() => {
    if (day === 14 && data) confetti({ particleCount: 180, spread: 100, origin: { y: 0.6 } });
  }, [day, data]);

  if (!data) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl bg-white/80 p-8 text-center shadow-glow">
        <h1 className="text-3xl font-bold">A Letter Journey Awaits</h1>
        <p className="mt-2">Countdown to April 14: {countdown}</p>
        <input className="mt-4 w-full rounded-xl border border-pink-100 p-3" placeholder="Password (if any)" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="mt-3 rounded-xl bg-pink-400 px-5 py-2 font-semibold text-white" onClick={load}>Open Link</button>
        {error && <p className="mt-3 text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-3xl bg-white/80 p-6 shadow-glow">
      <h2 className="text-center text-2xl font-bold">For {data.viewerName} 💌</h2>
      {!opened ? (
        <motion.button className="mx-auto block rounded-2xl bg-rose-200 px-8 py-6 text-xl" whileHover={{ scale: 1.04 }} onClick={() => setOpened(true)}>
          ✉️ Tap to Open the Envelope
        </motion.button>
      ) : (
        <>
          {data.backgroundMusicUrl && <audio controls className="w-full" src={data.backgroundMusicUrl} />}
          <AnimatePresence mode="wait">
            <motion.div key={day} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-3 rounded-2xl bg-roseMist p-5">
              <h3 className="text-2xl font-semibold">{current?.title}</h3>
              <p className="text-sm uppercase tracking-wider text-pink-500">{current?.theme}</p>
              {current?.imageUrl && <img src={current.imageUrl} alt="letter memory" className="max-h-64 w-full rounded-xl object-cover" />}
              <div dangerouslySetInnerHTML={{ __html: current?.content || '' }} />
              {current?.spotifyUrl && <iframe className="h-24 w-full rounded-xl" src={current.spotifyUrl} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" />}
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-between">
            <button className="rounded-xl bg-pink-100 px-4 py-2" disabled={day === 1} onClick={() => setDay((d) => d - 1)}>Previous</button>
            <button className="rounded-xl bg-pink-400 px-4 py-2 text-white" disabled={day === 14} onClick={() => setDay((d) => d + 1)}>Next Letter</button>
          </div>
          {day === 14 && <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="rounded-2xl bg-gradient-to-r from-pink-300 to-purple-300 p-6 text-center text-xl font-semibold text-white">Final Surprise: Every day with you is my favorite love story. 🌹</motion.div>}
        </>
      )}
    </div>
  );
}
