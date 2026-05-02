import { motion, AnimatePresence, Variants } from 'motion/react';
import React, { useMemo } from 'react';

// ─── Proper TypeScript Types ───
interface AnimationConfig {
  eyes: any;
  mouth: any;
  body: any;
  bgGradient: string;
  borderColor: string;
  isGrayscale: boolean;
  props: React.ReactNode;
  statusText: string;
  statusColor: string;
}

interface ActionMojiProps {
  state: string;
  username: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatusRing?: boolean;
  onClick?: () => void;
}

// ─── Size Config ───
const sizeConfig = {
  sm: { w: 'w-12', h: 'h-12', eye: 'w-2 h-2', mouthScale: 0.6, font: 'text-xs' },
  md: { w: 'w-16', h: 'h-16', eye: 'w-2.5 h-2.5', mouthScale: 0.8, font: 'text-sm' },
  lg: { w: 'w-20', h: 'h-20', eye: 'w-3 h-3', mouthScale: 1, font: 'text-base' },
  xl: { w: 'w-24', h: 'h-24', eye: 'w-3.5 h-3.5', mouthScale: 1.2, font: 'text-lg' },
};

// ─── Helper: Bouncing Dots (Typing Indicator) ───
const TypingDots = () => (
  <motion.div
    className="absolute -top-3 -right-3 w-9 h-5 bg-white rounded-2xl flex gap-1 justify-center items-center shadow-lg border border-neutral-200 z-20 px-1.5"
    initial={{ scale: 0, opacity: 0, originX: 0, originY: 1 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
  >
    {/* Tail of the speech bubble */}
    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-b border-l border-neutral-200 rotate-45" />
    {[0, 0.15, 0.3].map((delay, i) => (
      <motion.span
        key={i}
        className="w-1 h-1 bg-neutral-400 rounded-full z-10"
        animate={{ y: [0, -2, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 0.8, delay }}
      />
    ))}
  </motion.div>
);

// ─── Helper: Floating Emoji with Animation ───
const FloatEmoji = ({ emoji, className, animate, transition }: any) => (
  <motion.div
    className={`absolute z-20 ${className}`}
    animate={animate}
    transition={transition}
  >
    {emoji}
  </motion.div>
);

// ─── Main Component ───
export default function ActionMojiAvatar({
  state,
  username,
  size = 'lg',
  showStatusRing = true,
  onClick,
}: ActionMojiProps) {
  const isBot = username === 'AuraBot';
  const s = sizeConfig[size];

  // ─── State Configuration Map ───
  const config: AnimationConfig = useMemo(() => {
    const base: AnimationConfig = {
      eyes: {},
      mouth: {},
      body: {},
      bgGradient: 'from-yellow-300 to-yellow-400',
      borderColor: 'border-yellow-500',
      isGrayscale: false,
      props: null,
      statusText: 'Online',
      statusColor: 'bg-green-500',
    };

    switch (state) {
      // ─── OFFLINE ───
      case 'offline':
        return {
          ...base,
          eyes: { height: 2, y: 2, opacity: 0.6 },
          mouth: { width: 10, height: 2, borderRadius: '2px', y: 2 },
          bgGradient: 'from-neutral-500 to-neutral-700',
          borderColor: 'border-neutral-800',
          isGrayscale: true,
          statusText: 'Offline',
          statusColor: 'bg-neutral-500',
          props: (
            <FloatEmoji
              emoji="🌙"
              className="-top-1 -right-1 text-sm opacity-60"
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
          ),
        };

      // ─── TYPING ───
      case 'typing':
        return {
          ...base,
          eyes: { x: [-1.5, 1.5, -1.5], y: 1, transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } },
          mouth: { width: 5, height: 5, borderRadius: '50%', y: 1 },
          body: { y: [0, 2, 0], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } },
          bgGradient: 'from-cyan-300 to-blue-400',
          borderColor: 'border-blue-500',
          statusText: 'Typing...',
          statusColor: 'bg-blue-500',
          props: <TypingDots />,
        };

      // ─── READING CHAT ───
      case 'reading_chat':
        return {
          ...base,
          eyes: { x: [-3, 3, -3], transition: { repeat: Infinity, duration: 2.5 } },
          mouth: { width: 14, height: 2, borderRadius: '2px' },
          body: { rotateY: [-8, 8, -8], transition: { repeat: Infinity, duration: 3 } },
          bgGradient: 'from-yellow-200 to-yellow-400',
          borderColor: 'border-yellow-400',
          statusText: 'Reading',
          statusColor: 'bg-blue-400',
          props: (
            <FloatEmoji
              emoji="👀"
              className="top-0 right-0 text-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── BROWSING FILES ───
      case 'browsing_files':
        return {
          ...base,
          eyes: { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.5 } },
          mouth: { width: 10, height: 8, borderRadius: '50%' },
          bgGradient: 'from-yellow-400 to-amber-500',
          borderColor: 'border-amber-600',
          statusText: 'In Files',
          statusColor: 'bg-amber-500',
          props: (
            <FloatEmoji
              emoji="📂"
              className="top-1 right-1 text-xl"
              animate={{ rotate: [0, 10, -10, 0], y: [0, -2, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />
          ),
        };

      // ─── VIEWING NOTES ───
      case 'viewing_notes':
        return {
          ...base,
          eyes: { x: [0, 3, 0], y: [0, 2, 0], transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 12, height: 4, borderRadius: '0 0 8px 8px' },
          bgGradient: 'from-yellow-300 to-green-400',
          borderColor: 'border-green-500',
          statusText: 'Notes',
          statusColor: 'bg-green-500',
          props: (
            <FloatEmoji
              emoji="📝"
              className="top-1 -left-2 text-xl"
              animate={{ y: [0, -4, 0], rotate: [0, 5, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── TIMETABLE OPEN ───
      case 'timetable_open':
        return {
          ...base,
          eyes: { x: [2, -2, 2], transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 10, height: 6, borderRadius: '50%' },
          bgGradient: 'from-yellow-300 to-pink-400',
          borderColor: 'border-pink-400',
          statusText: 'Schedule',
          statusColor: 'bg-pink-500',
          props: (
            <FloatEmoji
              emoji="📅"
              className="top-1 right-1 text-xl"
              animate={{ rotateY: [0, 180, 360], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
            />
          ),
        };

      // ─── IDLE / SLEEPING ───
      case 'idle':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.9, 1] } },
          mouth: { width: 8, height: 3, borderRadius: '50%' },
          body: { y: [0, 3, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
          bgGradient: 'from-neutral-300 to-yellow-200',
          borderColor: 'border-yellow-300',
          statusText: 'Idle',
          statusColor: 'bg-yellow-500',
          props: (
            <div className="absolute -top-3 -right-1 z-20">
              <motion.span
                className="text-sm font-bold text-neutral-400"
                animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
              >
                Z
              </motion.span>
              <motion.span
                className="text-xs font-bold text-neutral-400 absolute -top-2 -left-2"
                animate={{ opacity: [0, 1, 0], y: [0, -6, -12] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              >
                z
              </motion.span>
            </div>
          ),
        };

      // ─── HAPPY ───
      case 'happy':
        return {
          ...base,
          eyes: { height: [8, 8, 2, 8], transition: { repeat: Infinity, duration: 3 } },
          mouth: { width: 16, height: 8, borderRadius: '0 0 10px 10px' },
          body: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 1, ease: 'easeInOut' } },
          bgGradient: 'from-yellow-300 to-orange-400',
          borderColor: 'border-orange-400',
          statusText: 'Happy',
          statusColor: 'bg-orange-500',
          props: (
            <motion.div
              className="absolute -top-2 left-1/2 -translate-x-1/2 text-lg z-20"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ✨
            </motion.div>
          ),
        };

      // ─── SAD ───
      case 'sad':
        return {
          ...base,
          eyes: { height: 4, y: 2, opacity: 0.7 },
          mouth: { width: 14, height: 5, borderRadius: '10px 10px 0 0' },
          bgGradient: 'from-blue-300 to-indigo-400',
          borderColor: 'border-indigo-500',
          statusText: 'Sad',
          statusColor: 'bg-blue-500',
          props: (
            <div className="absolute top-5 w-full flex justify-center gap-6 z-20">
              <motion.div
                className="w-1.5 h-2.5 bg-blue-400 rounded-full"
                animate={{ y: [0, 12], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
              />
              <motion.div
                className="w-1.5 h-2.5 bg-blue-400 rounded-full"
                animate={{ y: [0, 12], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            </div>
          ),
        };

      // ─── ANGRY ───
      case 'angry':
        return {
          ...base,
          eyes: { height: 3, y: 1, rotate: [-5, 5, -5], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } },
          mouth: { width: 14, height: 3, borderRadius: '2px' },
          body: { x: [-1.5, 1.5, -1.5], transition: { repeat: Infinity, duration: 0.9, ease: 'easeInOut' } },
          bgGradient: 'from-red-400 to-orange-500',
          borderColor: 'border-red-600',
          statusText: 'Angry',
          statusColor: 'bg-red-600',
          props: (
            <FloatEmoji
              emoji="💢"
              className="top-0 right-0 text-xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            />
          ),
        };

      // ─── CONFUSED ───
      case 'confused':
        return {
          ...base,
          eyes: { height: [8, 4], y: [0, 2], transition: { repeat: Infinity, duration: 1.5, repeatType: 'reverse' } },
          mouth: { width: 10, height: 5, borderRadius: '50%', x: 3 },
          bgGradient: 'from-purple-300 to-fuchsia-400',
          borderColor: 'border-fuchsia-500',
          statusText: 'Confused',
          statusColor: 'bg-purple-500',
          props: (
            <FloatEmoji
              emoji="❓"
              className="-top-2 right-0 text-lg font-black text-neutral-800"
              animate={{ rotate: [0, 15, -15, 0], y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── SURPRISED ───
      case 'surprised':
        return {
          ...base,
          eyes: { width: 10, height: 10, borderRadius: '50%', scale: [1, 1.2, 1] },
          mouth: { width: 8, height: 12, borderRadius: '50%' },
          body: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-teal-300 to-cyan-500',
          borderColor: 'border-cyan-500',
          statusText: 'Surprised',
          statusColor: 'bg-cyan-500',
          props: (
            <FloatEmoji
              emoji="❗"
              className="-top-3 right-1 text-xl"
              animate={{ y: [0, -5, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            />
          ),
        };

      // ─── PARTYING ───
      case 'partying':
        return {
          ...base,
          eyes: { height: [4, 8, 4], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } },
          mouth: { width: 14, height: 8, borderRadius: '0 0 10px 10px' },
          body: { rotate: [-3, 3, -3], transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' } },
          bgGradient: 'from-fuchsia-400 to-rose-500',
          borderColor: 'border-rose-500',
          statusText: 'Partying',
          statusColor: 'bg-fuchsia-600',
          props: (
            <FloatEmoji
              emoji="🎉"
              className="-top-3 left-1 text-xl"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            />
          ),
        };

      // ─── THINKING ───
      case 'thinking':
        return {
          ...base,
          eyes: { x: [-4, 0, -4], y: [-3, 0, -3], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } },
          mouth: { width: 12, height: 2, borderRadius: '2px', x: -3 },
          bgGradient: 'from-sky-300 to-blue-400',
          borderColor: 'border-blue-500',
          statusText: 'Thinking',
          statusColor: 'bg-sky-500',
          props: (
            <>
              <FloatEmoji
                emoji="💭"
                className="-top-5 right-2 text-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5], y: [0, -3, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <TypingDots />
            </>
          ),
        };

      // ─── MIND BLOWN ───
      case 'mind_blown':
        return {
          ...base,
          eyes: { width: 10, height: 10, scale: [1, 1.4, 1], transition: { repeat: Infinity, duration: 0.8 } },
          mouth: { width: 12, height: 12, borderRadius: '50%' },
          body: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-orange-400 to-pink-500',
          borderColor: 'border-pink-500',
          statusText: 'Mind Blown',
          statusColor: 'bg-orange-500',
          props: (
            <FloatEmoji
              emoji="🤯"
              className="-top-5 right-0 text-2xl"
              animate={{ y: [0, -10, -20], opacity: [1, 0], scale: [1, 1.5] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          ),
        };

      // ─── HEART EYES ───
      case 'heart_eyes':
        return {
          ...base,
          eyes: { opacity: 0 },
          mouth: { width: 14, height: 8, borderRadius: '0 0 10px 10px' },
          body: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.2 } },
          bgGradient: 'from-pink-300 to-rose-400',
          borderColor: 'border-rose-400',
          statusText: 'Loving',
          statusColor: 'bg-pink-500',
          props: (
            <div className="absolute top-3 w-full flex justify-center gap-3 z-20 px-3">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
                className="text-lg"
              >
                ❤️
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
                className="text-lg"
              >
                ❤️
              </motion.div>
            </div>
          ),
        };

      // ─── STARRY EYES ───
      case 'starry_eyes':
        return {
          ...base,
          eyes: { opacity: 0 },
          mouth: { width: 14, height: 6, borderRadius: '0 0 10px 10px' },
          bgGradient: 'from-yellow-200 to-yellow-500',
          borderColor: 'border-yellow-500',
          statusText: 'Amazed',
          statusColor: 'bg-yellow-500',
          props: (
            <div className="absolute top-3 w-full flex justify-center gap-3 z-20 px-3">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="text-lg"
              >
                ⭐
              </motion.div>
              <motion.div
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                className="text-lg"
              >
                ⭐
              </motion.div>
            </div>
          ),
        };

      // ─── COOL ───
      case 'cool':
        return {
          ...base,
          eyes: { opacity: 0 },
          mouth: { width: 14, height: 3, borderRadius: '50%' },
          bgGradient: 'from-cyan-300 to-blue-500',
          borderColor: 'border-blue-500',
          statusText: 'Cool',
          statusColor: 'bg-cyan-500',
          props: (
            <motion.div
              className="absolute top-2 text-2xl z-20"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
            >
              😎
            </motion.div>
          ),
        };

      // ─── CRYING ───
      case 'crying':
        return {
          ...base,
          eyes: { height: 3, y: 2, opacity: 0.6 },
          mouth: { width: 12, height: 8, borderRadius: '10px 10px 0 0' },
          bgGradient: 'from-blue-400 to-indigo-600',
          borderColor: 'border-indigo-600',
          statusText: 'Crying',
          statusColor: 'bg-blue-600',
          props: (
            <div className="absolute top-5 w-full flex justify-center gap-7 z-20">
              <motion.div
                className="w-1.5 h-3 bg-blue-300 rounded-full"
                animate={{ y: [0, 14], opacity: [1, 0], scale: [1, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: 0.2 }}
              />
              <motion.div
                className="w-1.5 h-3 bg-blue-300 rounded-full"
                animate={{ y: [0, 14], opacity: [1, 0], scale: [1, 0.5] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
              />
            </div>
          ),
        };

      // ─── FREEZING ───
      case 'freezing':
        return {
          ...base,
          eyes: { x: [-0.8, 0.8, -0.8], transition: { repeat: Infinity, duration: 0.35, ease: 'easeInOut' } },
          mouth: { width: 14, height: 2, x: [-0.8, 0.8, -0.8], transition: { repeat: Infinity, duration: 0.35, ease: 'easeInOut' } },
          body: { x: [-0.8, 0.8, -0.8], transition: { repeat: Infinity, duration: 0.35, ease: 'easeInOut' } },
          bgGradient: 'from-cyan-200 to-blue-300',
          borderColor: 'border-cyan-400',
          statusText: 'Freezing',
          statusColor: 'bg-cyan-400',
          props: (
            <motion.div
              className="absolute top-0 right-0 text-xl z-20"
              animate={{ y: [0, -2, 0], rotate: [0, 4, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            >
              🥶
            </motion.div>
          ),
        };

      // ─── HOT ───
      case 'hot':
        return {
          ...base,
          eyes: { height: 3, opacity: 0.7 },
          mouth: { width: 14, height: 8, borderRadius: '50%' },
          bgGradient: 'from-red-300 to-red-500',
          borderColor: 'border-red-600',
          statusText: 'Hot',
          statusColor: 'bg-red-500',
          props: (
            <motion.div
              className="absolute -top-1 right-0 text-lg z-20"
              animate={{ y: [0, 5, 0], opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              💧
            </motion.div>
          ),
        };

      // ─── RUNNING ───
      case 'running':
        return {
          ...base,
          eyes: { x: 2 },
          mouth: { width: 10, height: 6, borderRadius: '50%', x: 2 },
          body: { x: [-2, 2, -2], rotate: 4, transition: { repeat: Infinity, duration: 0.5, ease: 'easeInOut' } },
          bgGradient: 'from-green-400 to-teal-500',
          borderColor: 'border-teal-500',
          statusText: 'Running',
          statusColor: 'bg-green-500',
          props: (
            <motion.div
              className="absolute -left-3 top-4 text-lg z-20"
              animate={{ x: [-6, 0], opacity: [0, 0.8, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'easeOut' }}
            >
              💨
            </motion.div>
          ),
        };

      // ─── GYM ───
      case 'gym':
        return {
          ...base,
          eyes: { height: 2, y: 2 },
          mouth: { width: 14, height: 5, borderRadius: '2px' },
          body: { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 0.9, ease: 'easeInOut' } },
          bgGradient: 'from-stone-500 to-stone-700',
          borderColor: 'border-stone-700',
          statusText: 'Working Out',
          statusColor: 'bg-stone-600',
          props: (
            <motion.div
              className="absolute -top-3 right-0 text-xl z-20"
              animate={{ y: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 1.0, ease: 'easeInOut' }}
            >
              🏋️
            </motion.div>
          ),
        };

      // ─── LISTENING MUSIC ───
      case 'listening_music':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 3 } },
          mouth: { width: 12, height: 5, borderRadius: '0 0 8px 8px' },
          body: { rotate: [-4, 4, -4], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-violet-400 to-fuchsia-500',
          borderColor: 'border-fuchsia-500',
          statusText: 'Vibing',
          statusColor: 'bg-violet-500',
          props: (
            <div className="absolute -top-3 -left-2 z-20">
              <motion.span
                className="text-lg absolute"
                animate={{ y: [-4, -14], opacity: [1, 0], x: [0, 3] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >
                🎵
              </motion.span>
              <motion.span
                className="text-sm absolute left-3"
                animate={{ y: [-4, -12], opacity: [1, 0], x: [0, -2] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
              >
                🎶
              </motion.span>
            </div>
          ),
        };

      // ─── PLAYING GAMES ───
      case 'playing_games':
        return {
          ...base,
          eyes: { x: [-1.5, 1.5, -1.5], y: [-1.5, 1.5, -1.5], transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } },
          mouth: { width: 10, height: 3, borderRadius: '50%' },
          bgGradient: 'from-green-500 to-lime-600',
          borderColor: 'border-lime-600',
          statusText: 'Gaming',
          statusColor: 'bg-green-600',
          props: (
            <motion.div
              className="absolute top-2 right-2 text-xl z-20"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 4, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            >
              🎮
            </motion.div>
          ),
        };

      // ─── READING BOOK ───
      case 'reading_book':
        return {
          ...base,
          eyes: { y: 3, x: [-2, 2, -2], transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 12, height: 2, borderRadius: '2px' },
          bgGradient: 'from-amber-600 to-yellow-700',
          borderColor: 'border-yellow-700',
          statusText: 'Reading',
          statusColor: 'bg-amber-700',
          props: (
            <motion.div
              className="absolute top-5 right-2 text-xl z-20"
              animate={{ y: [0, -3, 0], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              📖
            </motion.div>
          ),
        };

      // ─── WRITING CODE ───
      case 'writing_code':
        return {
          ...base,
          eyes: { x: [-2, 2, -2], transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' } },
          mouth: { width: 10, height: 3, borderRadius: '2px' },
          bgGradient: 'from-slate-700 to-slate-900',
          borderColor: 'border-slate-800',
          statusText: 'Coding',
          statusColor: 'bg-slate-700',
          props: (
            <motion.div
              className="absolute top-1 right-1 text-xs z-20 font-mono text-green-400 bg-neutral-900/80 backdrop-blur-sm rounded px-1 py-0.5 border border-green-500/30"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
            >
              {'/>'}
            </motion.div>
          ),
        };

      // ─── COFFEE BREAK ───
      case 'coffee_break':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 3 } },
          mouth: { width: 10, height: 5, borderRadius: '50%' },
          bgGradient: 'from-amber-700 to-orange-900',
          borderColor: 'border-orange-900',
          statusText: 'Coffee',
          statusColor: 'bg-amber-800',
          props: (
            <motion.div
              className="absolute top-3 -right-2 text-xl z-20"
              animate={{ y: [0, -2, 0], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              ☕
            </motion.div>
          ),
        };

      // ─── MAGIC ───
      case 'magic':
        return {
          ...base,
          eyes: { scale: [1, 1.3, 1], transition: { repeat: Infinity, duration: 0.8 } },
          mouth: { width: 14, height: 6, borderRadius: '0 0 10px 10px' },
          bgGradient: 'from-indigo-500 to-purple-600',
          borderColor: 'border-purple-600',
          statusText: 'Magic',
          statusColor: 'bg-indigo-600',
          props: (
            <motion.div
              className="absolute -top-3 -right-2 text-2xl z-20"
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              ✨
            </motion.div>
          ),
        };

      // ─── GHOST ───
      case 'ghost':
        return {
          ...base,
          eyes: { height: 10, width: 6, borderRadius: '50%', opacity: 0.8 },
          mouth: { width: 8, height: 10, borderRadius: '50%', opacity: 0.8 },
          body: { y: [-4, 4, -4], opacity: 0.85, transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } },
          bgGradient: 'from-neutral-200 to-neutral-400',
          borderColor: 'border-neutral-400',
          statusText: 'Ghost',
          statusColor: 'bg-neutral-400',
        };

      // ─── NINJA ───
      case 'ninja':
        return {
          ...base,
          eyes: { height: 3, width: 10, rotate: [-4, 4], transition: { repeat: Infinity, duration: 0.5 } },
          mouth: { opacity: 0 },
          bgGradient: 'from-neutral-800 to-black',
          borderColor: 'border-neutral-900',
          statusText: 'Ninja',
          statusColor: 'bg-neutral-800',
          props: (
            <motion.div
              className="absolute bottom-2 w-full h-7 bg-neutral-900 z-10 rounded-sm"
              animate={{ opacity: [0.9, 1, 0.9] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── ALIEN ───
      case 'alien':
        return {
          ...base,
          eyes: { width: 14, height: 16, rotate: [-8, 8], borderRadius: '50%', transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 5, height: 2, borderRadius: '2px' },
          body: { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 2 } },
          bgGradient: 'from-lime-400 to-green-600',
          borderColor: 'border-green-600',
          statusText: 'Alien',
          statusColor: 'bg-lime-500',
        };

      // ─── ROBOT ───
      case 'robot':
        return {
          ...base,
          eyes: { width: 8, height: 8, borderRadius: '2px' },
          mouth: { width: 14, height: 3, borderRadius: '2px' },
          bgGradient: 'from-slate-400 to-slate-600',
          borderColor: 'border-slate-600',
          statusText: 'Bot',
          statusColor: 'bg-slate-500',
          props: (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
              <div className="w-1.5 h-3 bg-neutral-400 rounded-sm">
                <motion.div
                  className="w-3 h-3 bg-red-500 rounded-full absolute -top-2 -left-0.5"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
              </div>
            </div>
          ),
        };

      // ─── DETECTIVE ───
      case 'detective':
        return {
          ...base,
          eyes: { height: 3, width: 8 },
          mouth: { width: 12, height: 2, borderRadius: '2px' },
          bgGradient: 'from-stone-600 to-stone-800',
          borderColor: 'border-stone-800',
          statusText: 'Detective',
          statusColor: 'bg-stone-700',
          props: (
            <motion.div
              className="absolute top-0 right-0 text-2xl z-20"
              animate={{ x: [-4, 4, -4], rotate: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              🕵️
            </motion.div>
          ),
        };

      // ─── SUPERHERO ───
      case 'superhero':
        return {
          ...base,
          eyes: { height: 5, width: 8, borderRadius: '2px' },
          mouth: { width: 14, height: 5, borderRadius: '0 0 8px 8px' },
          body: { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-blue-500 to-blue-700',
          borderColor: 'border-blue-700',
          statusText: 'Hero',
          statusColor: 'bg-blue-600',
          props: (
            <motion.div
              className="absolute top-2 w-full h-5 bg-red-500/80 z-20 rounded-sm"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
            />
          ),
        };



      // ─── SEARCHING ───
      case 'searching':
        return {
          ...base,
          eyes: { x: [-4, 4, -4], scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } },
          mouth: { width: 8, height: 8, borderRadius: '50%' },
          bgGradient: 'from-violet-400 to-indigo-500',
          borderColor: 'border-indigo-500',
          statusText: 'Searching',
          statusColor: 'bg-violet-500',
          props: (
            <FloatEmoji
              emoji="🔍"
              className="-top-2 right-0 text-xl"
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── UPLOADING ───
      case 'uploading':
        return {
          ...base,
          eyes: { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 1 } },
          mouth: { width: 12, height: 5, borderRadius: '0 0 8px 8px' },
          bgGradient: 'from-teal-400 to-emerald-500',
          borderColor: 'border-emerald-500',
          statusText: 'Uploading',
          statusColor: 'bg-teal-500',
          props: (
            <motion.div
              className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
              animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              ⬆️
            </motion.div>
          ),
        };

      // ─── CELEBRATING ───
      case 'celebrating':
        return {
          ...base,
          eyes: { height: [8, 2, 8], transition: { repeat: Infinity, duration: 0.8 } },
          mouth: { width: 16, height: 10, borderRadius: '0 0 12px 12px' },
          body: { rotate: [-5, 5, -5], scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.7 } },
          bgGradient: 'from-yellow-300 to-orange-400',
          borderColor: 'border-orange-400',
          statusText: 'Celebrating!',
          statusColor: 'bg-orange-500',
          props: (
            <>
              <FloatEmoji
                emoji="🎊"
                className="-top-3 -left-2 text-xl"
                animate={{ rotate: [0, 20, -20, 0], y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.0 }}
              />
              <FloatEmoji
                emoji="🎉"
                className="-top-3 right-0 text-xl"
                animate={{ rotate: [0, -20, 20, 0], y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.0, delay: 0.3 }}
              />
            </>
          ),
        };

      // ─── ONLINE (DEFAULT) ───
      case 'online':
      default:
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.95, 1] } },
          mouth: { width: 14, height: 5, borderRadius: '0 0 8px 8px' },
          bgGradient: 'from-yellow-300 to-yellow-400',
          borderColor: 'border-yellow-500',
          statusText: 'Online',
          statusColor: 'bg-green-500',
        };
    }
  }, [state]);

  const { eyes, mouth, body, bgGradient, borderColor, isGrayscale, props, statusText, statusColor } = config;

  // ─── Check if eyes should be hidden ───
  const showEyes = eyes.opacity !== 0;
  const showMouth = mouth.opacity !== 0;

  return (
    <div className="relative inline-flex flex-col items-center gap-1 group">
      {/* Status Ring */}
      {showStatusRing && (
        <motion.div
          className={`absolute -inset-1 rounded-2xl ${statusColor} opacity-30 blur-sm`}
          animate={{ scale: [1, 1.05, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}

      {/* Main Avatar Container */}
      <motion.div
        className={`relative ${s.w} ${s.h} cursor-pointer`}
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Bot antenna */}
        {isBot && (
          <motion.div
            className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-3.5 ${isGrayscale ? 'bg-neutral-500 border-neutral-700' : 'bg-green-500 border-green-700'} rounded-full border-2 rotate-[25deg] -z-10 shadow-sm`}
            animate={{ rotate: [25, 35, 25] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}

        {/* Face */}
        <motion.div
          className={`w-full h-full rounded-[50%_50%_50%_20%_/_20%_50%_50%_50%] rotate-12 scale-110 border-b-[6px] bg-gradient-to-br ${bgGradient} ${borderColor} ${isGrayscale ? 'grayscale' : ''} shadow-lg shadow-black/20 flex flex-col items-center justify-center relative overflow-visible`}
          animate={body}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Initial Letter Background — subtle watermark for non-bot */}
          {!isBot && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10 text-3xl font-black text-white pointer-events-none select-none">
              {username[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* Eyes Container */}
          <div className="flex gap-3 mb-1.5 z-10 mt-1">
            <AnimatePresence mode="wait">
              {showEyes && (
                <>
                  {/* Left Eye */}
                  <motion.div
                    className={`${s.eye} bg-neutral-800 rounded-full shadow-sm relative overflow-hidden`}
                    animate={eyes}
                    initial={false}
                  >
                    {/* Pupil */}
                    <motion.div
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-600 rounded-full`}
                      style={{ width: '40%', height: '40%' }}
                      animate={eyes.x || eyes.y ? { x: (eyes.x || 0) * 0.3, y: (eyes.y || 0) * 0.3 } : {}}
                    />
                  </motion.div>

                  {/* Right Eye */}
                  <motion.div
                    className={`${s.eye} bg-neutral-800 rounded-full shadow-sm relative overflow-hidden`}
                    animate={eyes}
                    initial={false}
                  >
                    {/* Pupil */}
                    <motion.div
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-600 rounded-full`}
                      style={{ width: '40%', height: '40%' }}
                      animate={eyes.x || eyes.y ? { x: (eyes.x || 0) * 0.3, y: (eyes.y || 0) * 0.3 } : {}}
                    />
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Mouth */}
          <AnimatePresence>
            {showMouth && (
              <motion.div
                className={`bg-neutral-800 z-10 shadow-sm`}
                animate={mouth}
                initial={false}
              />
            )}
          </AnimatePresence>

          {/* Dynamic Props */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {props}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Status Dot */}
        <motion.div
          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${statusColor} rounded-full border-2 border-neutral-900 z-30`}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </motion.div>

      {/* Status label intentionally removed — shown in chat header */}
    </div>
  );
}
