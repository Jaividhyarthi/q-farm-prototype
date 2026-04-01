import { Link, Route, Routes } from 'react-router-dom';
import { motion } from 'framer-motion';
import CreatorMode from './components/CreatorMode';
import ViewerMode from './components/ViewerMode';

export default function App() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#fff1f8] via-[#ffeaf2] to-[#f3e9ff] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.nav initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between rounded-2xl bg-white/60 p-4 backdrop-blur">
          <Link to="/" className="text-lg font-bold text-dusk">14 Days of You</Link>
          <Link to="/" className="rounded-full bg-white px-4 py-2 text-sm">Creator Mode</Link>
        </motion.nav>
        <Routes>
          <Route path="/" element={<CreatorMode />} />
          <Route path="/view/:shareId" element={<ViewerMode />} />
        </Routes>
      </div>
    </main>
  );
}
