import { motion } from 'motion/react';
import React from 'react';

interface ActionMojiProps {
  state: string; // 'typing' | 'reading_chat' | 'browsing_files' | 'viewing_notes' | 'idle' | 'online' | 'offline'
  username: string;
}

export default function ActionMojiAvatar({ state, username }: ActionMojiProps) {
  // Determine animations based on state
  
  let eyesAnim = {};
  let mouthAnim = {};
  let propsJsx = null;
  let bgGradient = "from-indigo-500 to-purple-500";

  if (state === 'typing') {
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
  } else if (state === 'reading_chat') {
    eyesAnim = { x: [-4, 4, -4], transition: { repeat: Infinity, duration: 3 } };
    mouthAnim = { width: 16, height: 2, borderRadius: "2px" };
    bgGradient = "from-yellow-200 to-yellow-400";
  } else if (state === 'browsing_files') {
    eyesAnim = { scale: [1, 1.2, 1], transition: { repeat: Infinity, duration: 2 } };
    mouthAnim = { width: 10, height: 10, borderRadius: "50%" }; // "o" face
    propsJsx = (
      <motion.div className="absolute top-2 right-2 text-2xl z-20" animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 4 }}>
        📂
      </motion.div>
    );
    bgGradient = "from-yellow-400 to-amber-500";
  } else if (state === 'viewing_notes') {
    eyesAnim = { x: [0, 4, 0], y: [0, 2, 0], transition: { repeat: Infinity, duration: 2 } };
    mouthAnim = { width: 14, height: 4, borderRadius: "0 0 10px 10px" }; 
    propsJsx = (
      <motion.div className="absolute top-2 -left-2 text-2xl z-20" animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
        📝
      </motion.div>
    );
    bgGradient = "from-yellow-300 to-green-400";
  } else if (state === 'timetable_open') {
    eyesAnim = { x: [2, -2, 2], transition: { repeat: Infinity, duration: 2 } };
    mouthAnim = { width: 10, height: 6, borderRadius: "50%" }; 
    propsJsx = (
      <motion.div className="absolute top-2 right-2 text-2xl z-20" animate={{ rotateY: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 4 }}>
        📅
      </motion.div>
    );
    bgGradient = "from-yellow-300 to-pink-400";
  } else if (state === 'idle') {
    eyesAnim = { height: [8, 2, 8], transition: { repeat: Infinity, duration: 4, times: [0, 0.9, 1] } }; // blinking
    mouthAnim = { width: 8, height: 4, borderRadius: "50%" };
    propsJsx = (
      <motion.div className="absolute -top-4 -right-2 text-xl font-bold text-neutral-400 z-20" animate={{ opacity: [0, 1, 0], y: [0, -10, -20] }} transition={{ repeat: Infinity, duration: 3 }}>
        Zzz
      </motion.div>
    );
    bgGradient = "from-neutral-300 to-yellow-200 mt-4";
  } else {
    // Online
    eyesAnim = { height: [8, 2, 8], transition: { repeat: Infinity, duration: 5, times: [0, 0.95, 1] } };
    mouthAnim = { width: 16, height: 6, borderRadius: "0 0 10px 10px" }; // smile
    bgGradient = "from-yellow-300 to-yellow-400";
  }

  // If this is AuraBot, apply nanobanana pro styles
  const isBot = username === 'AuraBot';

  return (
    <div className="relative w-20 h-20 perspective-1000">
      <motion.div 
        className={`w-full h-full ${isBot ? 'rounded-[50%_50%_50%_20%_/_20%_50%_50%_50%] rotate-12 scale-110 border-yellow-600 border-b-8' : 'rounded-2xl border-neutral-900 border-4'} bg-gradient-to-br ${bgGradient} shadow-inner flex flex-col items-center justify-center relative overflow-visible`}
        animate={{ rotateY: state === 'reading_chat' ? [-10, 10, -10] : 0, y: state === 'idle' ? 4 : 0 }}
        transition={{ repeat: Infinity, duration: 4 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {isBot && (
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-4 bg-green-500 rounded-full border-2 border-green-700 rotate-[30deg] -z-10 shadow-sm" />
        )}

        {/* Username Initial Watermark */}
        {!isBot && (
          <div className="absolute inset-0 flex items-center justify-center opacity-20 text-4xl font-black text-white pointer-events-none">
            {username[0].toUpperCase()}
          </div>
        )}

        {/* Eyes */}
        <div className="flex gap-4 mb-2 z-10 translate-z-10 mt-2">
          <motion.div className={`w-2 h-2 ${isBot ? 'bg-neutral-800' : 'bg-white'} rounded-full shadow-sm`} animate={eyesAnim} />
          <motion.div className={`w-2 h-2 ${isBot ? 'bg-neutral-800' : 'bg-white'} rounded-full shadow-sm`} animate={eyesAnim} />
        </div>

        {/* Mouth */}
        <motion.div className={`${isBot ? 'bg-neutral-800' : 'bg-white/80'} z-10 translate-z-10`} animate={mouthAnim} />

        {/* Dynamic Props overlay */}
        {propsJsx}
      </motion.div>
    </div>
  );
}
