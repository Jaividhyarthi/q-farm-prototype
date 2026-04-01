import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Picker from 'emoji-picker-react';
import ReactQuill from 'react-quill';
import { api } from '../lib/api';

const initialLetters = Array.from({ length: 14 }, (_, i) => ({
  day: i + 1,
  title: `Day ${i + 1}: My Heart to Yours`,
  theme: '',
  content: '',
  spotifyUrl: '',
  imageUrl: '',
}));

export default function CreatorMode() {
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({ creatorName: '', viewerName: '', password: '', backgroundMusicUrl: '' });
  const [selectedDay, setSelectedDay] = useState(1);
  const [letters, setLetters] = useState(initialLetters);
  const [showEmoji, setShowEmoji] = useState(false);

  const current = useMemo(() => letters[selectedDay - 1], [letters, selectedDay]);

  const updateCurrent = (patch) => {
    setLetters((prev) => prev.map((l) => (l.day === selectedDay ? { ...l, ...patch } : l)));
  };

  const createJourney = async () => {
    const { data } = await api.post('/journeys', form);
    setProject(data);
  };

  const saveDraft = async () => {
    if (!project) return;
    await api.put(`/journeys/${project.shareId}/letters/${selectedDay}`, { ...current, creatorKey: project.creatorKey });
    alert(`Draft for Day ${selectedDay} saved.`);
  };

  const publish = async () => {
    await api.post(`/journeys/${project.shareId}/publish`, { creatorKey: project.creatorKey, letters, backgroundMusicUrl: form.backgroundMusicUrl });
    alert('Published! Your love story is now unlocked.');
  };

  return (
    <div className="space-y-6">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-4xl font-bold text-dusk">14 Days of You</motion.h1>
      {!project && (
        <div className="rounded-3xl bg-white/70 p-6 shadow-glow backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold">Create Your Romantic Journey</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries({ creatorName: 'Your Name', viewerName: 'Their Name', password: 'Password (optional)', backgroundMusicUrl: 'Background Music URL' }).map(([key, label]) => (
              <input key={key} className="rounded-xl border border-pink-100 p-3" placeholder={label} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            ))}
          </div>
          <button className="mt-4 rounded-xl bg-pink-400 px-5 py-3 font-semibold text-white" onClick={createJourney}>Start Writing</button>
        </div>
      )}

      {project && (
        <div className="space-y-4 rounded-3xl bg-white/75 p-6 shadow-glow backdrop-blur">
          <p className="text-sm">Share link: <span className="font-semibold">{window.location.origin}/view/{project.shareId}</span></p>
          <div className="flex flex-wrap gap-2">
            {letters.map((letter) => (
              <button key={letter.day} onClick={() => setSelectedDay(letter.day)} className={`rounded-full px-4 py-2 text-sm ${selectedDay === letter.day ? 'bg-pink-400 text-white' : 'bg-pink-100'}`}>Day {letter.day}</button>
            ))}
          </div>
          <input className="w-full rounded-xl border border-pink-100 p-3" value={current.title} onChange={(e) => updateCurrent({ title: e.target.value })} />
          <input className="w-full rounded-xl border border-pink-100 p-3" placeholder="Theme" value={current.theme} onChange={(e) => updateCurrent({ theme: e.target.value })} />
          <ReactQuill theme="snow" value={current.content} onChange={(content) => updateCurrent({ content })} />
          <div className="flex gap-3">
            <button className="rounded-xl bg-purple-200 px-4 py-2" onClick={() => setShowEmoji((s) => !s)}>Emoji</button>
            <input className="flex-1 rounded-xl border border-pink-100 p-3" placeholder="Spotify embed URL" value={current.spotifyUrl} onChange={(e) => updateCurrent({ spotifyUrl: e.target.value })} />
          </div>
          {showEmoji && <Picker onEmojiClick={(emoji) => updateCurrent({ content: `${current.content} ${emoji.emoji}` })} />}
          <input type="file" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => updateCurrent({ imageUrl: reader.result });
            reader.readAsDataURL(file);
          }} />
          <div className="flex gap-3">
            <button className="rounded-xl bg-pink-300 px-5 py-2 font-semibold text-white" onClick={saveDraft}>Save Draft</button>
            <button className="rounded-xl bg-dusk px-5 py-2 font-semibold text-white" onClick={publish}>Final Publish & Lock</button>
          </div>
        </div>
      )}
    </div>
  );
}
