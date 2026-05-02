import { motion, AnimatePresence } from 'motion/react';
import React, { useMemo } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type EyeAnim = Record<string, any>;
type MouthAnim = Record<string, any>;
type BodyAnim = Record<string, any>;

interface AnimationConfig {
  eyes: EyeAnim;
  mouth: MouthAnim;
  body: BodyAnim;
  bgGradient: string;
  borderColor: string;
  isGrayscale: boolean;
  props: React.ReactNode;
  statusText: string;
  statusColor: string;
  blush: boolean;
}

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ActionMojiProps {
  state: string;
  username: string;
  size?: AvatarSize;
  showStatus?: boolean;
  showStatusRing?: boolean;
  onClick?: () => void;
}

// ─── Size Config ───────────────────────────────────────────────────────────────

const SIZE = {
  xs: { container: 'w-8 h-8',   eye: 'w-1.5 h-1.5', fontSize: 'text-[8px]',  dot: 'w-2 h-2',   dotOff: '-bottom-0.5 -right-0.5' },
  sm: { container: 'w-12 h-12', eye: 'w-2 h-2',     fontSize: 'text-[10px]', dot: 'w-2.5 h-2.5', dotOff: '-bottom-0.5 -right-0.5' },
  md: { container: 'w-16 h-16', eye: 'w-2.5 h-2.5', fontSize: 'text-xs',     dot: 'w-3 h-3',   dotOff: '-bottom-0.5 -right-0.5' },
  lg: { container: 'w-20 h-20', eye: 'w-3 h-3',     fontSize: 'text-sm',     dot: 'w-3.5 h-3.5', dotOff: '-bottom-0.5 -right-0.5' },
  xl: { container: 'w-24 h-24', eye: 'w-3.5 h-3.5', fontSize: 'text-base',   dot: 'w-4 h-4',   dotOff: '-bottom-1 -right-1' },
} as const;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * FIX: Safely scale a motion value that can be a number OR an array.
 * Original code did `(eyes.x || 0) * 0.3` which is NaN when eyes.x is an array.
 */
function scalePupil(val: number | number[] | undefined, factor: number): number | number[] {
  if (val === undefined || val === null) return 0;
  if (Array.isArray(val)) return val.map((v) => v * factor);
  return val * factor;
}

/** Typing bubble with speech-tail */
const TypingDots = () => (
  <motion.div
    className="absolute -top-4 -right-3 w-9 h-5 bg-white rounded-2xl flex gap-1 justify-center items-center shadow-lg border border-neutral-200 z-20 px-1.5"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0, opacity: 0 }}
    style={{ transformOrigin: 'bottom left' }}
  >
    <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-b border-l border-neutral-200 rotate-45" />
    {[0, 0.15, 0.3].map((delay, i) => (
      <motion.span
        key={i}
        className="w-1 h-1 bg-neutral-400 rounded-full relative z-10"
        animate={{ y: [0, -2.5, 0], opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 0.8, delay }}
      />
    ))}
  </motion.div>
);

/** Floating emoji prop (emoji + animation config) */
interface FloatEmojiProps {
  emoji: string;
  className?: string;
  animate?: Record<string, any>;
  transition?: Record<string, any>;
  style?: React.CSSProperties;
}
const FloatEmoji = ({ emoji, className = '', animate, transition, style }: FloatEmojiProps) => (
  <motion.div
    className={`absolute z-20 pointer-events-none select-none ${className}`}
    animate={animate}
    transition={transition}
    style={style}
  >
    {emoji}
  </motion.div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ActionMojiAvatar({
  state,
  username,
  size = 'lg',
  showStatus = false,
  showStatusRing = true,
  onClick,
}: ActionMojiProps) {
  // FIX: username added to useMemo deps because isBot depends on it
  const isBot = username === 'AuraBot';
  const s = SIZE[size];

  const config: AnimationConfig = useMemo(() => {
    let activeState = state;
    let isTypingExtra = false;

    if (state.startsWith('typing_')) {
      isTypingExtra = true;
      activeState = state.replace('typing_', '');
    }

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
      blush: false,
    };

    const getConfig = (): AnimationConfig => {
      switch (activeState) {

      // ─── ONLINE ────────────────────────────────────────────────────────────
      case 'online':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.95, 1] } },
          mouth: { width: 14, height: 5, borderRadius: '0 0 8px 8px' },
          blush: true,
          statusText: 'Online',
          statusColor: 'bg-green-500',
        };

      // ─── OFFLINE ───────────────────────────────────────────────────────────
      case 'offline':
        return {
          ...base,
          eyes: { height: 2, y: 3, opacity: 0.5 },
          mouth: { width: 10, height: 2, borderRadius: '2px', y: 2 },
          bgGradient: 'from-neutral-400 to-neutral-600',
          borderColor: 'border-neutral-700',
          isGrayscale: true,
          statusText: 'Offline',
          statusColor: 'bg-neutral-500',
          props: (
            <FloatEmoji
              emoji="🌙"
              className="-top-1 -right-1 text-sm opacity-70"
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
          ),
        };

      // ─── TYPING ────────────────────────────────────────────────────────────
      case 'typing':
        return {
          ...base,
          eyes: {
            x: [-1.5, 1.5, -1.5],
            y: 1,
            transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' },
          },
          mouth: { width: 5, height: 5, borderRadius: '50%', y: 1 },
          body: { y: [0, 2, 0], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } },
          bgGradient: 'from-cyan-300 to-blue-400',
          borderColor: 'border-blue-500',
          statusText: 'Typing…',
          statusColor: 'bg-blue-500',
          props: <TypingDots />,
        };

      // ─── READING CHAT ──────────────────────────────────────────────────────
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
              className="-top-1 -right-1 text-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── BROWSING FILES ────────────────────────────────────────────────────
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

      // ─── VIEWING NOTES ─────────────────────────────────────────────────────
      case 'viewing_notes':
        return {
          ...base,
          eyes: { x: [0, 3, 0], y: [0, 2, 0], transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 12, height: 4, borderRadius: '0 0 8px 8px' },
          bgGradient: 'from-yellow-300 to-green-400',
          borderColor: 'border-green-500',
          statusText: 'Viewing Notes',
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

      // ─── TIMETABLE OPEN ────────────────────────────────────────────────────
      case 'timetable_open':
        return {
          ...base,
          eyes: { x: [2, -2, 2], transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 10, height: 6, borderRadius: '50%' },
          bgGradient: 'from-yellow-300 to-pink-400',
          borderColor: 'border-pink-400',
          statusText: 'Checking Schedule',
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

      // ─── IDLE / SLEEPING ───────────────────────────────────────────────────
      case 'idle':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.9, 1] } },
          mouth: { width: 8, height: 3, borderRadius: '50%' },
          body: { y: [0, 3, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } },
          bgGradient: 'from-neutral-200 to-yellow-200',
          borderColor: 'border-yellow-300',
          statusText: 'Idle',
          statusColor: 'bg-yellow-400',
          props: (
            <div className="absolute -top-3 -right-1 z-20 pointer-events-none">
              <motion.span
                className="text-sm font-bold text-neutral-400 absolute"
                animate={{ opacity: [0, 1, 0], y: [0, -8, -16] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
              >Z</motion.span>
              <motion.span
                className="text-xs font-bold text-neutral-400 absolute -top-2 -left-2"
                animate={{ opacity: [0, 1, 0], y: [0, -6, -12] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              >z</motion.span>
            </div>
          ),
        };

      // ─── HAPPY ─────────────────────────────────────────────────────────────
      case 'happy':
        return {
          ...base,
          eyes: { height: [8, 8, 2, 8], transition: { repeat: Infinity, duration: 3 } },
          mouth: { width: 16, height: 8, borderRadius: '0 0 10px 10px' },
          body: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 1, ease: 'easeInOut' } },
          bgGradient: 'from-yellow-300 to-orange-400',
          borderColor: 'border-orange-400',
          blush: true,
          statusText: 'Happy 😄',
          statusColor: 'bg-orange-500',
          props: (
            <FloatEmoji
              emoji="✨"
              className="-top-2 left-1/2 -translate-x-1/2 text-lg"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── SAD ───────────────────────────────────────────────────────────────
      case 'sad':
        return {
          ...base,
          eyes: { height: 4, y: 2, opacity: 0.7 },
          mouth: { width: 14, height: 5, borderRadius: '10px 10px 0 0' },
          bgGradient: 'from-blue-300 to-indigo-400',
          borderColor: 'border-indigo-500',
          statusText: 'Sad 😢',
          statusColor: 'bg-blue-500',
          props: (
            <div className="absolute top-5 w-full flex justify-center gap-6 z-20 pointer-events-none">
              <motion.div
                className="w-1.5 h-2.5 bg-blue-300 rounded-full"
                animate={{ y: [0, 12], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
              />
              <motion.div
                className="w-1.5 h-2.5 bg-blue-300 rounded-full"
                animate={{ y: [0, 12], opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              />
            </div>
          ),
        };

      // ─── ANGRY ─────────────────────────────────────────────────────────────
      case 'angry':
        return {
          ...base,
          eyes: { height: 3, y: 1, rotate: [-5, 5, -5], transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' } },
          mouth: { width: 14, height: 3, borderRadius: '2px' },
          body: { x: [-1.5, 1.5, -1.5], transition: { repeat: Infinity, duration: 0.35, ease: 'easeInOut' } },
          bgGradient: 'from-red-400 to-orange-500',
          borderColor: 'border-red-600',
          statusText: 'Angry 😠',
          statusColor: 'bg-red-600',
          props: (
            <FloatEmoji
              emoji="💢"
              className="-top-1 -right-1 text-xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          ),
        };

      // ─── CONFUSED ──────────────────────────────────────────────────────────
      case 'confused':
        return {
          ...base,
          eyes: {
            height: [8, 4, 8],
            y: [0, 2, 0],
            transition: { repeat: Infinity, duration: 1.5 },
          },
          mouth: { width: 10, height: 5, borderRadius: '50%', x: 3 },
          bgGradient: 'from-purple-300 to-fuchsia-400',
          borderColor: 'border-fuchsia-500',
          statusText: 'Confused 🤔',
          statusColor: 'bg-purple-500',
          props: (
            <FloatEmoji
              emoji="❓"
              className="-top-2 -right-1 text-lg"
              animate={{ rotate: [0, 15, -15, 0], y: [0, -3, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── SURPRISED ─────────────────────────────────────────────────────────
      case 'surprised':
        return {
          ...base,
          eyes: { width: 10, height: 10, borderRadius: '50%', scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 0.9 } },
          mouth: { width: 8, height: 12, borderRadius: '50%' },
          body: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-teal-300 to-cyan-500',
          borderColor: 'border-cyan-500',
          statusText: 'Surprised!',
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

      // ─── THINKING ──────────────────────────────────────────────────────────
      case 'thinking':
        return {
          ...base,
          eyes: { x: [-4, 0, -4], y: [-3, 0, -3], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } },
          mouth: { width: 12, height: 2, borderRadius: '2px', x: -3 },
          bgGradient: 'from-sky-300 to-blue-400',
          borderColor: 'border-blue-500',
          statusText: 'Thinking…',
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

      // ─── MIND BLOWN ────────────────────────────────────────────────────────
      case 'mind_blown':
        return {
          ...base,
          eyes: { width: 10, height: 10, scale: [1, 1.4, 1], transition: { repeat: Infinity, duration: 0.8 } },
          mouth: { width: 12, height: 12, borderRadius: '50%' },
          body: { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-orange-400 to-pink-500',
          borderColor: 'border-pink-500',
          statusText: 'Mind Blown 🤯',
          statusColor: 'bg-orange-500',
          props: (
            <FloatEmoji
              emoji="🤯"
              className="-top-5 -right-1 text-2xl"
              animate={{ y: [0, -10, -20], opacity: [1, 0.5, 0], scale: [1, 1.5, 2] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          ),
        };

      // ─── HEART EYES ────────────────────────────────────────────────────────
      case 'heart_eyes':
        return {
          ...base,
          // FIX: Use explicit opacity 0 — handled by showEyes check below
          eyes: { opacity: 0 },
          mouth: { width: 14, height: 8, borderRadius: '0 0 10px 10px' },
          body: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 1.2 } },
          bgGradient: 'from-pink-300 to-rose-400',
          borderColor: 'border-rose-400',
          blush: true,
          statusText: 'In Love 💕',
          statusColor: 'bg-pink-500',
          props: (
            <div className="absolute top-2 w-full flex justify-center gap-2.5 z-20 px-2 pointer-events-none">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.7 }}
              >❤️</motion.div>
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.7, delay: 0.25 }}
              >❤️</motion.div>
            </div>
          ),
        };

      // ─── STARRY EYES ───────────────────────────────────────────────────────
      case 'starry_eyes':
        return {
          ...base,
          eyes: { opacity: 0 },
          mouth: { width: 14, height: 6, borderRadius: '0 0 10px 10px' },
          blush: true,
          bgGradient: 'from-yellow-200 to-yellow-500',
          borderColor: 'border-yellow-500',
          statusText: 'Amazed ⭐',
          statusColor: 'bg-yellow-500',
          props: (
            <div className="absolute top-2 w-full flex justify-center gap-2.5 z-20 px-2 pointer-events-none">
              <motion.div
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >⭐</motion.div>
              <motion.div
                animate={{ rotate: -360, scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
              >⭐</motion.div>
            </div>
          ),
        };

      // ─── COOL ──────────────────────────────────────────────────────────────
      case 'cool':
        return {
          ...base,
          eyes: { opacity: 0 },
          mouth: { width: 14, height: 3, borderRadius: '50%' },
          bgGradient: 'from-cyan-300 to-blue-500',
          borderColor: 'border-blue-500',
          statusText: 'Cool 😎',
          statusColor: 'bg-cyan-500',
          props: (
            <motion.div
              className="absolute top-1 z-20 text-2xl pointer-events-none select-none"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            >😎</motion.div>
          ),
        };

      // ─── PARTYING ──────────────────────────────────────────────────────────
      case 'partying':
        return {
          ...base,
          eyes: { height: [4, 8, 4], transition: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } },
          mouth: { width: 14, height: 8, borderRadius: '0 0 10px 10px' },
          body: { rotate: [-3, 3, -3], transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' } },
          bgGradient: 'from-fuchsia-400 to-rose-500',
          borderColor: 'border-rose-500',
          blush: true,
          statusText: 'Partying 🎊',
          statusColor: 'bg-fuchsia-600',
          props: (
            <FloatEmoji
              emoji="🎉"
              className="-top-3 left-1 text-xl"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            />
          ),
        };

      // ─── CRYING ────────────────────────────────────────────────────────────
      case 'crying':
        return {
          ...base,
          eyes: { height: 3, y: 2, opacity: 0.6 },
          mouth: { width: 12, height: 8, borderRadius: '10px 10px 0 0' },
          bgGradient: 'from-blue-400 to-indigo-600',
          borderColor: 'border-indigo-600',
          statusText: 'Crying 😭',
          statusColor: 'bg-blue-600',
          props: (
            <div className="absolute top-5 w-full flex justify-center gap-7 z-20 pointer-events-none">
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

      // ─── FREEZING ──────────────────────────────────────────────────────────
      case 'freezing':
        return {
          ...base,
          eyes: { x: [-0.8, 0.8, -0.8], transition: { repeat: Infinity, duration: 0.12, ease: 'easeInOut' } },
          mouth: { width: 14, height: 2, borderRadius: '2px' },
          body: { x: [-0.8, 0.8, -0.8], transition: { repeat: Infinity, duration: 0.12, ease: 'easeInOut' } },
          bgGradient: 'from-cyan-200 to-blue-300',
          borderColor: 'border-cyan-400',
          statusText: 'Freezing 🥶',
          statusColor: 'bg-cyan-400',
          props: (
            <FloatEmoji
              emoji="🥶"
              className="-top-1 -right-1 text-xl"
              animate={{ y: [0, -2, 0], rotate: [0, 4, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          ),
        };

      // ─── HOT ───────────────────────────────────────────────────────────────
      case 'hot':
        return {
          ...base,
          eyes: { height: 3, opacity: 0.7 },
          mouth: { width: 14, height: 8, borderRadius: '50%' },
          bgGradient: 'from-red-300 to-red-500',
          borderColor: 'border-red-600',
          blush: true,
          statusText: 'Too Hot 🥵',
          statusColor: 'bg-red-500',
          props: (
            <FloatEmoji
              emoji="💧"
              className="-top-1 -right-1 text-lg"
              animate={{ y: [0, 5, 0], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── RUNNING ───────────────────────────────────────────────────────────
      case 'running':
        return {
          ...base,
          eyes: { x: 2 },
          mouth: { width: 10, height: 6, borderRadius: '50%', x: 2 },
          body: { x: [-2, 2, -2], rotate: 4, transition: { repeat: Infinity, duration: 0.5, ease: 'easeInOut' } },
          bgGradient: 'from-green-400 to-teal-500',
          borderColor: 'border-teal-500',
          statusText: 'On the Move 🏃',
          statusColor: 'bg-green-500',
          props: (
            <FloatEmoji
              emoji="💨"
              className="-left-3 top-4 text-lg"
              animate={{ x: [-6, 0], opacity: [0, 0.8, 0] }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'easeOut' }}
            />
          ),
        };

      // ─── GYM ───────────────────────────────────────────────────────────────
      case 'gym':
        return {
          ...base,
          eyes: { height: 2, y: 2 },
          mouth: { width: 14, height: 5, borderRadius: '2px' },
          body: { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 0.9, ease: 'easeInOut' } },
          bgGradient: 'from-stone-500 to-stone-700',
          borderColor: 'border-stone-700',
          statusText: 'Working Out 💪',
          statusColor: 'bg-stone-600',
          props: (
            <FloatEmoji
              emoji="🏋️"
              className="-top-3 -right-1 text-xl"
              animate={{ y: [-3, 3, -3] }}
              transition={{ repeat: Infinity, duration: 1.0 }}
            />
          ),
        };

      // ─── LISTENING MUSIC ───────────────────────────────────────────────────
      case 'listening_music':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 3 } },
          mouth: { width: 12, height: 5, borderRadius: '0 0 8px 8px' },
          body: { rotate: [-4, 4, -4], transition: { repeat: Infinity, duration: 0.8 } },
          blush: true,
          bgGradient: 'from-violet-400 to-fuchsia-500',
          borderColor: 'border-fuchsia-500',
          statusText: 'Vibing 🎶',
          statusColor: 'bg-violet-500',
          props: (
            <div className="absolute -top-4 -left-2 z-20 pointer-events-none">
              <motion.span
                className="text-lg absolute"
                animate={{ y: [-4, -14], opacity: [1, 0], x: [0, 3] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
              >🎵</motion.span>
              <motion.span
                className="text-sm absolute left-3"
                animate={{ y: [-4, -12], opacity: [1, 0], x: [0, -2] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }}
              >🎶</motion.span>
            </div>
          ),
        };

      // ─── PLAYING GAMES ─────────────────────────────────────────────────────
      case 'playing_games':
        return {
          ...base,
          eyes: {
            x: [-1.5, 1.5, -1.5],
            y: [-1.5, 1.5, -1.5],
            transition: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' },
          },
          mouth: { width: 10, height: 3, borderRadius: '50%' },
          bgGradient: 'from-green-500 to-lime-600',
          borderColor: 'border-lime-600',
          statusText: 'Gaming 🕹️',
          statusColor: 'bg-green-600',
          props: (
            <FloatEmoji
              emoji="🎮"
              className="top-1 right-1 text-xl"
              animate={{ scale: [1, 1.1, 1], rotate: [0, 4, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          ),
        };

      // ─── READING BOOK ──────────────────────────────────────────────────────
      case 'reading_book':
        return {
          ...base,
          eyes: { y: 3, x: [-2, 2, -2], transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 12, height: 2, borderRadius: '2px' },
          bgGradient: 'from-amber-600 to-yellow-700',
          borderColor: 'border-yellow-700',
          statusText: 'Reading 📖',
          statusColor: 'bg-amber-700',
          props: (
            <FloatEmoji
              emoji="📖"
              className="top-4 right-1 text-xl"
              animate={{ y: [0, -3, 0], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── WRITING CODE ──────────────────────────────────────────────────────
      case 'writing_code':
        return {
          ...base,
          eyes: { x: [-2, 2, -2], transition: { repeat: Infinity, duration: 1.0, ease: 'easeInOut' } },
          mouth: { width: 10, height: 3, borderRadius: '2px' },
          bgGradient: 'from-slate-700 to-slate-900',
          borderColor: 'border-slate-800',
          statusText: 'Coding 💻',
          statusColor: 'bg-slate-700',
          props: (
            <motion.div
              className="absolute top-0.5 right-0.5 text-xs z-20 font-mono text-green-400 bg-neutral-900/90 rounded px-1 py-0.5 border border-green-500/30 pointer-events-none"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >{'</>'}</motion.div>
          ),
        };

      // ─── COFFEE BREAK ──────────────────────────────────────────────────────
      case 'coffee_break':
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 3 } },
          mouth: { width: 10, height: 5, borderRadius: '50%' },
          blush: true,
          bgGradient: 'from-amber-700 to-orange-900',
          borderColor: 'border-orange-900',
          statusText: 'Coffee Break ☕',
          statusColor: 'bg-amber-800',
          props: (
            <FloatEmoji
              emoji="☕"
              className="top-2 -right-2 text-xl"
              animate={{ y: [0, -2, 0], rotate: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── MAGIC ─────────────────────────────────────────────────────────────
      case 'magic':
        return {
          ...base,
          eyes: { scale: [1, 1.3, 1], transition: { repeat: Infinity, duration: 0.8 } },
          mouth: { width: 14, height: 6, borderRadius: '0 0 10px 10px' },
          blush: true,
          bgGradient: 'from-indigo-500 to-purple-600',
          borderColor: 'border-purple-600',
          statusText: 'Working Magic ✨',
          statusColor: 'bg-indigo-600',
          props: (
            <FloatEmoji
              emoji="✨"
              className="-top-3 -right-2 text-2xl"
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── GHOST ─────────────────────────────────────────────────────────────
      case 'ghost':
        return {
          ...base,
          eyes: { height: 10, width: 6, borderRadius: '50%', opacity: 0.85 },
          mouth: { width: 8, height: 10, borderRadius: '50%', opacity: 0.85 },
          body: { y: [-4, 4, -4], opacity: 0.85, transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } },
          bgGradient: 'from-neutral-200 to-neutral-400',
          borderColor: 'border-neutral-400',
          statusText: 'Ghosting 👻',
          statusColor: 'bg-neutral-400',
        };

      // ─── NINJA ─────────────────────────────────────────────────────────────
      case 'ninja':
        return {
          ...base,
          eyes: { height: 3, width: 10, rotate: [-4, 4], transition: { repeat: Infinity, duration: 0.5 } },
          mouth: { opacity: 0 },
          bgGradient: 'from-neutral-800 to-black',
          borderColor: 'border-neutral-900',
          statusText: 'Ninja Mode 🥷',
          statusColor: 'bg-neutral-800',
          props: (
            <motion.div
              className="absolute bottom-2 w-full h-7 bg-neutral-900 z-10 rounded-sm pointer-events-none"
              animate={{ opacity: [0.9, 1, 0.9] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          ),
        };

      // ─── ALIEN ─────────────────────────────────────────────────────────────
      case 'alien':
        return {
          ...base,
          eyes: { width: 14, height: 16, rotate: [-8, 8], borderRadius: '50%', transition: { repeat: Infinity, duration: 2 } },
          mouth: { width: 5, height: 2, borderRadius: '2px' },
          body: { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 2 } },
          bgGradient: 'from-lime-400 to-green-600',
          borderColor: 'border-green-600',
          statusText: 'Not From Here 👽',
          statusColor: 'bg-lime-500',
        };

      // ─── ROBOT ─────────────────────────────────────────────────────────────
      case 'robot':
        return {
          ...base,
          eyes: { width: 8, height: 8, borderRadius: '2px' },
          mouth: { width: 14, height: 3, borderRadius: '2px' },
          bgGradient: 'from-slate-400 to-slate-600',
          borderColor: 'border-slate-600',
          statusText: 'Bot Mode 🤖',
          statusColor: 'bg-slate-500',
          props: (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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

      // ─── DETECTIVE ─────────────────────────────────────────────────────────
      case 'detective':
        return {
          ...base,
          eyes: { height: 3, width: 8 },
          mouth: { width: 12, height: 2, borderRadius: '2px' },
          bgGradient: 'from-stone-600 to-stone-800',
          borderColor: 'border-stone-800',
          statusText: 'Investigating 🕵️',
          statusColor: 'bg-stone-700',
          props: (
            <FloatEmoji
              emoji="🕵️"
              className="-top-1 -right-1 text-2xl"
              animate={{ x: [-4, 4, -4], rotate: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />
          ),
        };

      // ─── SUPERHERO ─────────────────────────────────────────────────────────
      case 'superhero':
        return {
          ...base,
          eyes: { height: 5, width: 8, borderRadius: '2px' },
          mouth: { width: 14, height: 5, borderRadius: '0 0 8px 8px' },
          body: { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 0.8 } },
          bgGradient: 'from-blue-500 to-blue-700',
          borderColor: 'border-blue-700',
          statusText: 'Hero Mode 🦸',
          statusColor: 'bg-blue-600',
          props: (
            <motion.div
              className="absolute top-2 w-full h-5 bg-red-500/80 z-20 rounded-sm pointer-events-none"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }}
            />
          ),
        };

      // ─── SEARCHING ─────────────────────────────────────────────────────────
      case 'searching':
        return {
          ...base,
          eyes: { x: [-4, 4, -4], scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 1.2 } },
          mouth: { width: 8, height: 8, borderRadius: '50%' },
          bgGradient: 'from-violet-400 to-indigo-500',
          borderColor: 'border-indigo-500',
          statusText: 'Searching 🔍',
          statusColor: 'bg-violet-500',
          props: (
            <FloatEmoji
              emoji="🔍"
              className="-top-2 -right-1 text-xl"
              animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
          ),
        };

      // ─── UPLOADING ─────────────────────────────────────────────────────────
      case 'uploading':
        return {
          ...base,
          eyes: { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 1 } },
          mouth: { width: 12, height: 5, borderRadius: '0 0 8px 8px' },
          bgGradient: 'from-teal-400 to-emerald-500',
          borderColor: 'border-emerald-500',
          statusText: 'Uploading ⬆️',
          statusColor: 'bg-teal-500',
          props: (
            <FloatEmoji
              emoji="⬆️"
              className="-top-4 left-1/2 -translate-x-1/2 text-lg"
              animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
          ),
        };

      // ─── CELEBRATING ───────────────────────────────────────────────────────
      case 'celebrating':
        return {
          ...base,
          eyes: { height: [8, 2, 8], transition: { repeat: Infinity, duration: 0.8 } },
          mouth: { width: 16, height: 10, borderRadius: '0 0 12px 12px' },
          body: { rotate: [-5, 5, -5], scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 0.7 } },
          blush: true,
          bgGradient: 'from-yellow-300 to-orange-400',
          borderColor: 'border-orange-400',
          statusText: 'Celebrating! 🎊',
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
                className="-top-3 -right-2 text-xl"
                animate={{ rotate: [0, -20, 20, 0], y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.0, delay: 0.3 }}
              />
            </>
          ),
        };

      // ─── DEFAULT / ONLINE FALLBACK ──────────────────────────────────────────
      default:
        return {
          ...base,
          eyes: { height: [8, 1, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.95, 1] } },
          mouth: { width: 14, height: 5, borderRadius: '0 0 8px 8px' },
          blush: true,
          statusText: 'Online',
          statusColor: 'bg-green-500',
        };
      }
    };

    const result = getConfig();

    // Modifier for composite typing states (e.g. typing_happy)
    if (isTypingExtra) {
      result.statusText = 'Typing…';
      result.statusColor = 'bg-blue-500';
      result.props = (
        <>
          {result.props}
          <TypingDots />
        </>
      );
      // Small bounce to body to simulate typing while holding mood
      result.body = { ...result.body, y: [0, 2, 0], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } };
    }

    // Ensure smooth default transitions so they don't snap
    if (!result.eyes.transition) result.eyes.transition = { type: 'spring', bounce: 0.4, duration: 0.6 };
    if (!result.mouth.transition) result.mouth.transition = { type: 'spring', bounce: 0.4, duration: 0.6 };
    if (!result.body.transition) result.body.transition = { type: 'spring', bounce: 0.4, duration: 0.6 };

    return result;
  // FIX: username added so isBot-dependent states re-compute correctly
  }, [state, username]);

  const { eyes, mouth, body, bgGradient, borderColor, isGrayscale, props, statusText, statusColor, blush } = config;

  // FIX: Proper opacity check — only hide when explicitly set to 0
  const showEyes = eyes?.opacity !== 0;
  const showMouth = mouth?.opacity !== 0;

  // FIX: Safely scale pupil — handles both number and array types
  const pupilX = scalePupil(eyes?.x, 0.3);
  const pupilY = scalePupil(eyes?.y, 0.3);
  const hasPupilAnim = (eyes?.x !== undefined || eyes?.y !== undefined) && showEyes;

  // FIX: Bot gets blob shape, user gets rounded-2xl
  const faceShapeClass = isBot
    ? 'rounded-[50%_50%_50%_20%_/_20%_50%_50%_50%] rotate-12 scale-110 border-b-[6px]'
    : 'rounded-2xl border-4';

  // FIX: Status ring should use matching shape
  const ringShapeClass = isBot ? 'rounded-[50%_50%_50%_20%_/_20%_50%_50%_50%] rotate-12 scale-110' : 'rounded-2xl';

  const isTypingExtra = state.startsWith('typing_');

  return (
    <div className="relative inline-flex flex-col items-center gap-1 group">

      {/* ── Status Ring Glow ─────────────────────────────────────────────── */}
      {showStatusRing && (
        <motion.div
          // FIX: Shape matches bot vs user
          className={`absolute -inset-1 ${ringShapeClass} ${statusColor} opacity-25 blur-sm pointer-events-none`}
          animate={{ scale: [1, 1.05, 1], opacity: [0.15, 0.35, 0.15] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        />
      )}

      {/* ── Avatar Wrapper ───────────────────────────────────────────────── */}
      <motion.div
        className={`relative ${s.container} cursor-pointer`}
        onClick={onClick}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* Typing Dots Indicator */}
        {isTypingExtra && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-1 bg-aura-panel/80 backdrop-blur-sm px-2 py-1 rounded-full border border-aura-border shadow-sm z-50"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 bg-aura-primary rounded-full"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        )}

        {/* Bot Antenna */}
        {isBot && (
          <motion.div
            className={`absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-3.5 ${
              isGrayscale ? 'bg-neutral-500 border-neutral-700' : 'bg-green-400 border-green-600'
            } rounded-full border-2 rotate-[25deg] -z-10 shadow-sm`}
            animate={{ rotate: [25, 35, 25] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}

        {/* ── Face ─────────────────────────────────────────────────────── */}
        <motion.div
          className={`
            w-full h-full ${faceShapeClass}
            bg-gradient-to-br ${bgGradient} ${borderColor}
            ${isGrayscale ? 'grayscale' : ''}
            shadow-lg shadow-black/20
            flex flex-col items-center justify-center
            relative overflow-visible
          `}
          animate={body}
          style={{ transformStyle: 'preserve-3d' }}
        >

          {/* Blush cheeks */}
          {blush && (
            <>
              <div className="absolute left-1 bottom-5 w-5 h-3 rounded-full bg-pink-400/30 blur-[2px] pointer-events-none" />
              <div className="absolute right-1 bottom-5 w-5 h-3 rounded-full bg-pink-400/30 blur-[2px] pointer-events-none" />
            </>
          )}

          {/* Username watermark for non-bot */}
          {!isBot && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10 text-3xl font-black text-white pointer-events-none select-none">
              {username[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          {/* ── Eyes ──────────────────────────────────────────────────── */}
          <div className="flex gap-3 mb-1.5 z-10 mt-1">
            <AnimatePresence mode="popLayout">
              {showEyes && (
                <>
                  {/* Left Eye */}
                  <motion.div
                    key="eye-left"
                    className={`${s.eye} bg-neutral-800 rounded-full shadow-sm relative overflow-hidden`}
                    animate={eyes}
                    initial={false}
                  >
                    {/* FIX: Pupil uses scalePupil() — no more NaN from array × number */}
                    {hasPupilAnim && (
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-neutral-600 rounded-full"
                        animate={{ x: pupilX, y: pupilY }}
                        transition={eyes?.transition}
                      />
                    )}
                  </motion.div>

                  {/* Right Eye */}
                  <motion.div
                    key="eye-right"
                    className={`${s.eye} bg-neutral-800 rounded-full shadow-sm relative overflow-hidden`}
                    animate={eyes}
                    initial={false}
                  >
                    {hasPupilAnim && (
                      <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] bg-neutral-600 rounded-full"
                        animate={{ x: pupilX, y: pupilY }}
                        transition={eyes?.transition}
                      />
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* ── Mouth ─────────────────────────────────────────────────── */}
          {showMouth && (
            <motion.div
              className="bg-neutral-800 z-10 shadow-sm"
              animate={mouth}
              initial={false}
            />
          )}

          {/* ── Dynamic Props ─────────────────────────────────────────── */}
          {/* FIX: Removed the layout-breaking motion.div wrapper.
               Props already use absolute positioning internally.
               Instead, use AnimatePresence directly around the fragment. */}
          <AnimatePresence mode="wait">
            {props && (
              <motion.div
                key={state}
                className="absolute inset-0 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {props}
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

        {/* ── Status Dot ───────────────────────────────────────────────── */}
        <motion.div
          className={`absolute ${s.dotOff} ${s.dot} ${statusColor} rounded-full border-2 border-neutral-900 z-30`}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2.2 }}
        />
      </motion.div>

      {/* ── Snapchat-style Status Label ───────────────────────────────────── */}
      {showStatus && (
        <motion.div
          key={`status-${state}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.25 }}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${statusColor} bg-opacity-20 border border-current/20`}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusColor} flex-shrink-0`} />
          <span className={`${s.fontSize} font-medium text-neutral-700 dark:text-neutral-200 whitespace-nowrap`}>
            {statusText}
          </span>
        </motion.div>
      )}

    </div>
  );
}
