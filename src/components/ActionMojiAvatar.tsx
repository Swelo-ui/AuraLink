import { motion } from 'motion/react';
import React from 'react';

interface ActionMojiProps {
  state: string;
  username: string;
}

export default function ActionMojiAvatar({ state, username }: ActionMojiProps) {
  let eyesAnim: any = {};
  let mouthAnim: any = {};
  let propsJsx: React.ReactNode = null;
  let bgGradient = "from-yellow-300 to-yellow-400";
  let bodyAnim: any = {};
  let isGrayscale = false;

  switch (state) {
    case 'offline':
      eyesAnim = { height: 2, y: 2 };
      mouthAnim = { width: 10, height: 2, borderRadius: "2px", y: 2 };
      bgGradient = "from-neutral-300 to-neutral-500";
      isGrayscale = true;
      propsJsx = (
        <div className="absolute inset-0 flex items-center justify-center opacity-40 z-20 pointer-events-none">
          <div className="w-16 h-1 bg-neutral-800 rotate-45 absolute" />
        </div>
      );
      break;
    case 'typing':
      eyesAnim = { y: [0, 4, 0], transition: { repeat: Infinity, duration: 1 } };
      mouthAnim = { width: 12, height: 4, borderRadius: "50%" };
      propsJsx = (
        <motion.div 
          className="absolute bottom-2 right-2 w-8 h-4 bg-neutral-800 rounded flex gap-1 justify-center items-center shadow-lg border border-neutral-700 z-20"
          animate={{ y: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 0.3 }}
        >
          <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></span>
          <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></span>
          <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full"></span>
        </motion.div>
      );
      bgGradient = "from-yellow-300 to-amber-500";
      break;
    case 'reading_chat':
      eyesAnim = { x: [-4, 4, -4], transition: { repeat: Infinity, duration: 3 } };
      mouthAnim = { width: 16, height: 2, borderRadius: "2px" };
      bodyAnim = { rotateY: [-10, 10, -10] };
      bgGradient = "from-yellow-200 to-yellow-400";
      break;
    case 'browsing_files':
      eyesAnim = { scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 2 } };
      mouthAnim = { width: 10, height: 10, borderRadius: "50%" }; 
      propsJsx = <motion.div className="absolute top-2 right-2 text-2xl z-20" animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>📂</motion.div>;
      bgGradient = "from-yellow-400 to-amber-500";
      break;
    case 'viewing_notes':
      eyesAnim = { x: [0, 4, 0], y: [0, 2, 0], transition: { repeat: Infinity, duration: 2 } };
      mouthAnim = { width: 14, height: 4, borderRadius: "0 0 10px 10px" }; 
      propsJsx = <motion.div className="absolute top-2 -left-2 text-2xl z-20" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>📝</motion.div>;
      bgGradient = "from-yellow-300 to-green-400";
      break;
    case 'timetable_open':
      eyesAnim = { x: [2, -2, 2], transition: { repeat: Infinity, duration: 2 } };
      mouthAnim = { width: 10, height: 6, borderRadius: "50%" }; 
      propsJsx = <motion.div className="absolute top-2 right-2 text-2xl z-20" animate={{ rotateY: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 4 }}>📅</motion.div>;
      bgGradient = "from-yellow-300 to-pink-400";
      break;
    case 'idle':
      eyesAnim = { height: [8, 2, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.9, 1] } }; 
      mouthAnim = { width: 8, height: 4, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute -top-4 -right-2 text-xl font-bold text-neutral-400 z-20" animate={{ opacity: [0, 1, 0], y: [0, -10, -20] }} transition={{ repeat: Infinity, duration: 3 }}>Zzz</motion.div>;
      bodyAnim = { y: 4 };
      bgGradient = "from-neutral-300 to-yellow-200";
      break;
    case 'happy':
      eyesAnim = { height: [8, 8, 2, 8], transition: { repeat: Infinity, duration: 3 } }; 
      mouthAnim = { width: 18, height: 8, borderRadius: "0 0 10px 10px" }; 
      bodyAnim = { y: [0, -5, 0], transition: { repeat: Infinity, duration: 1 } };
      bgGradient = "from-yellow-300 to-orange-400";
      break;
    case 'sad':
      eyesAnim = { height: 4, y: 2 };
      mouthAnim = { width: 16, height: 6, borderRadius: "10px 10px 0 0" };
      propsJsx = <motion.div className="absolute top-4 left-2 w-2 h-3 bg-blue-300 rounded-full z-20" animate={{ y: [0, 10, 20], opacity: [1, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} />;
      bgGradient = "from-blue-300 to-indigo-400";
      break;
    case 'angry':
      eyesAnim = { height: 2, y: 2, rotate: [-10, 10] }; // Angry eyes
      mouthAnim = { width: 16, height: 4, borderRadius: "2px", rotate: [-2, 2] };
      bodyAnim = { x: [-2, 2, -2, 2, 0], transition: { repeat: Infinity, duration: 0.5 } };
      propsJsx = <motion.div className="absolute top-0 right-0 text-2xl z-20" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>💢</motion.div>;
      bgGradient = "from-red-400 to-orange-500";
      break;
    case 'confused':
      eyesAnim = { height: [8, 4], y: [0, 2] }; // One eye squint
      mouthAnim = { width: 12, height: 6, borderRadius: "50%", x: 4 };
      propsJsx = <motion.div className="absolute -top-3 right-0 text-xl font-black text-neutral-800 z-20" animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>?</motion.div>;
      bgGradient = "from-purple-300 to-fuchsia-400";
      break;
    case 'surprised':
      eyesAnim = { width: 12, height: 12, borderRadius: "50%" };
      mouthAnim = { width: 10, height: 14, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute -top-4 right-1 text-2xl z-20" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>❗</motion.div>;
      bgGradient = "from-teal-300 to-cyan-500";
      break;
    case 'partying':
      eyesAnim = { height: [2, 8, 2], transition: { repeat: Infinity, duration: 1 } };
      mouthAnim = { width: 16, height: 10, borderRadius: "0 0 10px 10px" };
      propsJsx = <motion.div className="absolute -top-4 left-1 text-2xl z-20" animate={{ rotate: [0, 20, -20, 0] }} transition={{ repeat: Infinity, duration: 0.5 }}>🎉</motion.div>;
      bgGradient = "from-fuchsia-400 to-rose-500";
      break;
    case 'thinking':
      eyesAnim = { x: [-4, 0], y: [-4, 0] }; // Looking up
      mouthAnim = { width: 14, height: 2, borderRadius: "2px", x: -2 };
      propsJsx = <motion.div className="absolute -top-6 right-2 text-2xl z-20" animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>💭</motion.div>;
      bgGradient = "from-sky-300 to-blue-400";
      break;
    case 'mind_blown':
      eyesAnim = { width: 12, height: 12, scale: [1, 1.5, 1], transition: { repeat: Infinity, duration: 1 } };
      mouthAnim = { width: 14, height: 14, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute -top-6 right-0 text-3xl z-20" animate={{ y: [0, -10, -20], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }}>🤯</motion.div>;
      bgGradient = "from-orange-400 to-pink-500";
      break;
    case 'heart_eyes':
      eyesAnim = { opacity: 0 }; // Hide normal eyes
      mouthAnim = { width: 16, height: 10, borderRadius: "0 0 10px 10px" };
      propsJsx = (
        <div className="absolute top-4 w-full flex justify-center gap-4 z-20 px-4">
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-xl">❤️</motion.div>
          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="text-xl">❤️</motion.div>
        </div>
      );
      bgGradient = "from-pink-300 to-rose-400";
      break;
    case 'starry_eyes':
      eyesAnim = { opacity: 0 };
      mouthAnim = { width: 16, height: 8, borderRadius: "0 0 10px 10px" };
      propsJsx = (
        <div className="absolute top-4 w-full flex justify-center gap-4 z-20 px-4">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="text-xl">⭐</motion.div>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="text-xl">⭐</motion.div>
        </div>
      );
      bgGradient = "from-yellow-200 to-yellow-500";
      break;
    case 'cool':
      eyesAnim = { opacity: 0 };
      mouthAnim = { width: 16, height: 4, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute top-3 text-3xl z-20" animate={{ y: [-20, 0] }} transition={{ duration: 0.5 }}>😎</motion.div>;
      bgGradient = "from-cyan-300 to-blue-500";
      break;
    case 'crying':
      eyesAnim = { height: 4, y: 2 };
      mouthAnim = { width: 14, height: 10, borderRadius: "10px 10px 0 0" };
      propsJsx = (
        <div className="absolute top-6 w-full flex justify-center gap-8 z-20">
          <motion.div className="w-1.5 h-3 bg-blue-400 rounded-full" animate={{ y: [0, 15], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} />
          <motion.div className="w-1.5 h-3 bg-blue-400 rounded-full" animate={{ y: [0, 15], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} />
        </div>
      );
      bgGradient = "from-blue-400 to-indigo-600";
      break;
    case 'freezing':
      eyesAnim = { x: [-1, 1, -1], transition: { repeat: Infinity, duration: 0.1 } };
      mouthAnim = { width: 16, height: 2, x: [-1, 1, -1], transition: { repeat: Infinity, duration: 0.1 } };
      propsJsx = <motion.div className="absolute top-0 right-0 text-2xl z-20">🥶</motion.div>;
      bgGradient = "from-cyan-200 to-blue-300";
      break;
    case 'hot':
      eyesAnim = { height: 4 };
      mouthAnim = { width: 16, height: 10, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute -top-2 right-0 text-xl z-20" animate={{ y: [0, 5, 0] }}>💧</motion.div>;
      bgGradient = "from-red-300 to-red-500";
      break;
    case 'running':
      eyesAnim = { x: 4 };
      mouthAnim = { width: 10, height: 8, borderRadius: "50%", x: 4 };
      bodyAnim = { x: [-2, 2], rotate: 10, transition: { repeat: Infinity, duration: 0.2 } };
      propsJsx = <motion.div className="absolute -left-4 top-4 text-xl z-20" animate={{ x: [-10, 0], opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 0.4 }}>💨</motion.div>;
      bgGradient = "from-green-400 to-teal-500";
      break;
    case 'gym':
      eyesAnim = { height: 2, y: 2 };
      mouthAnim = { width: 16, height: 6, borderRadius: "2px" };
      bodyAnim = { y: [-2, 2], transition: { repeat: Infinity, duration: 0.5 } };
      propsJsx = <motion.div className="absolute -top-4 right-0 text-2xl z-20" animate={{ y: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 1 }}>🏋️</motion.div>;
      bgGradient = "from-stone-500 to-stone-700";
      break;
    case 'listening_music':
      eyesAnim = { height: [8, 2, 8], transition: { repeat: Infinity, duration: 4 } };
      mouthAnim = { width: 14, height: 6, borderRadius: "0 0 10px 10px" };
      bodyAnim = { rotate: [-5, 5, -5], transition: { repeat: Infinity, duration: 1 } };
      propsJsx = <motion.div className="absolute -top-4 -left-2 text-2xl z-20" animate={{ y: [-5, -15], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>🎵</motion.div>;
      bgGradient = "from-violet-400 to-fuchsia-500";
      break;
    case 'playing_games':
      eyesAnim = { x: [-2, 2, -2], y: [-2, 2, -2], transition: { repeat: Infinity, duration: 0.5 } };
      mouthAnim = { width: 12, height: 4, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute top-2 right-2 text-2xl z-20" animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 0.2 }}>🎮</motion.div>;
      bgGradient = "from-green-500 to-lime-600";
      break;
    case 'reading_book':
      eyesAnim = { y: 4, x: [-2, 2, -2], transition: { repeat: Infinity, duration: 2 } };
      mouthAnim = { width: 14, height: 2, borderRadius: "2px" };
      propsJsx = <motion.div className="absolute top-6 right-2 text-2xl z-20">📖</motion.div>;
      bgGradient = "from-amber-600 to-yellow-700";
      break;
    case 'writing_code':
      eyesAnim = { x: [-4, 4, -4], transition: { repeat: Infinity, duration: 0.5 } };
      mouthAnim = { width: 10, height: 4, borderRadius: "2px" };
      propsJsx = <motion.div className="absolute top-1 right-1 text-xl z-20 font-mono text-green-400 bg-neutral-900 rounded px-1">{'/>'}</motion.div>;
      bgGradient = "from-slate-700 to-slate-900";
      break;
    case 'coffee_break':
      eyesAnim = { height: [8, 2, 8], transition: { repeat: Infinity, duration: 3 } };
      mouthAnim = { width: 12, height: 6, borderRadius: "50%" };
      propsJsx = <motion.div className="absolute top-4 -right-2 text-2xl z-20" animate={{ y: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 1 }}>☕</motion.div>;
      bgGradient = "from-amber-700 to-orange-900";
      break;
    case 'magic':
      eyesAnim = { scale: [1, 1.5, 1], transition: { repeat: Infinity, duration: 1 } };
      mouthAnim = { width: 16, height: 8, borderRadius: "0 0 10px 10px" };
      propsJsx = <motion.div className="absolute -top-4 -right-2 text-3xl z-20" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2 }}>✨</motion.div>;
      bgGradient = "from-indigo-500 to-purple-600";
      break;
    case 'ghost':
      eyesAnim = { height: 12, width: 8, borderRadius: "50%" };
      mouthAnim = { width: 10, height: 12, borderRadius: "50%" };
      bodyAnim = { y: [-5, 5, -5], opacity: 0.8, transition: { repeat: Infinity, duration: 2 } };
      bgGradient = "from-neutral-200 to-neutral-400";
      break;
    case 'ninja':
      eyesAnim = { height: 4, width: 12, rotate: [-5, 5] };
      mouthAnim = { opacity: 0 };
      propsJsx = <div className="absolute bottom-2 w-full h-8 bg-neutral-900 z-10" />;
      bgGradient = "from-neutral-800 to-black";
      break;
    case 'alien':
      eyesAnim = { width: 16, height: 20, rotate: [-10, 10], borderRadius: "50%" };
      mouthAnim = { width: 6, height: 2, borderRadius: "2px" };
      bgGradient = "from-lime-400 to-green-600";
      break;
    case 'robot':
      eyesAnim = { width: 10, height: 10, borderRadius: "2px", bg: "bg-red-500" };
      mouthAnim = { width: 16, height: 4, borderRadius: "2px" };
      propsJsx = <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-4 bg-neutral-400"><div className="w-4 h-4 bg-red-500 rounded-full absolute -top-3 -left-1" /></div>;
      bgGradient = "from-slate-400 to-slate-600";
      break;
    case 'detective':
      eyesAnim = { height: 4 };
      mouthAnim = { width: 14, height: 2, borderRadius: "2px" };
      propsJsx = <motion.div className="absolute top-0 right-0 text-3xl z-20" animate={{ x: [-5, 5, -5] }} transition={{ repeat: Infinity, duration: 3 }}>🕵️</motion.div>;
      bgGradient = "from-stone-600 to-stone-800";
      break;
    case 'superhero':
      eyesAnim = { height: 6, width: 10, borderRadius: "2px" };
      mouthAnim = { width: 16, height: 6, borderRadius: "0 0 10px 10px" };
      bodyAnim = { y: [-2, 2, -2], transition: { repeat: Infinity, duration: 1 } };
      propsJsx = <div className="absolute top-2 w-full h-6 bg-red-500 opacity-80 z-20" mask="url(#mask)" />;
      bgGradient = "from-blue-500 to-blue-700";
      break;
    case 'online':
    default:
      eyesAnim = { height: [8, 2, 8], transition: { repeat: Infinity, duration: 5, times: [0, 0.95, 1] } };
      mouthAnim = { width: 16, height: 6, borderRadius: "0 0 10px 10px" };
      bgGradient = "from-yellow-300 to-yellow-400";
      break;
  }

  const isBot = username === 'AuraBot';

  return (
    <div className="relative w-20 h-20 perspective-1000">
      <motion.div 
        className={`w-full h-full ${isBot ? 'rounded-[50%_50%_50%_20%_/_20%_50%_50%_50%] rotate-12 scale-110 border-yellow-600 border-b-8' : 'rounded-2xl border-neutral-900 border-4'} bg-gradient-to-br ${bgGradient} ${isGrayscale ? 'grayscale' : ''} shadow-inner flex flex-col items-center justify-center relative overflow-visible`}
        animate={bodyAnim}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {isBot && (
          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-4 ${isGrayscale ? 'bg-neutral-500 border-neutral-700' : 'bg-green-500 border-green-700'} rounded-full border-2 rotate-[30deg] -z-10 shadow-sm`} />
        )}

        {!isBot && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 text-4xl font-black text-white pointer-events-none">
            {username[0].toUpperCase()}
          </div>
        )}

        {/* Eyes */}
        <div className="flex gap-4 mb-2 z-10 translate-z-10 mt-2">
          {!eyesAnim.opacity && (
             <>
               <motion.div className={`w-2 h-2 ${isBot ? 'bg-neutral-800' : 'bg-white'} rounded-full shadow-sm`} animate={eyesAnim} />
               <motion.div className={`w-2 h-2 ${isBot ? 'bg-neutral-800' : 'bg-white'} rounded-full shadow-sm`} animate={eyesAnim} />
             </>
          )}
        </div>

        {/* Mouth */}
        {mouthAnim.opacity !== 0 && (
          <motion.div className={`${isBot ? 'bg-neutral-800' : 'bg-white/80'} z-10 translate-z-10`} animate={mouthAnim} />
        )}

        {/* Dynamic Props overlay */}
        {propsJsx}
      </motion.div>
    </div>
  );
}

