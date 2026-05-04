import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ActionMojiState = 
  | 'idle' | 'online' | 'offline' | 'away' | 'busy'
  | 'listening' | 'reading_chat' | 'thinking' | 'browsing_files' | 'browsing_vault' | 'viewing_notes' | 'timetable_open' | 'writing_code' | 'searching'
  | 'talking' | 'typing'
  | 'happy' | 'celebrating' | 'surprised' | 'mind_blown' | 'angry' | 'sad' | 'crying' | 'love' | 'heart_eyes' | 'wink' | 'sleepy' | 'excited' | 'starry_eyes' | 'magic';

interface ActionMojiProps {
  state: ActionMojiState | string;
  username: string;
  avatarUrl?: string;
  size?: AvatarSize;
  showStatus?: boolean;
  showStatusRing?: boolean;
  onClick?: () => void;
}

// --- Constants from Reference ---
const BASE = {
  blue:   { l:"#7db8ff", m:"#3a6ef5", d:"#1130cc", g:"rgba(58,110,245,.55)"  },
  purple: { l:"#b07aff", m:"#7b3af5", d:"#3e10cc", g:"rgba(123,58,245,.55)" },
  teal:   { l:"#5cf0d8", m:"#0ac8a8", d:"#057a62", g:"rgba(10,200,168,.55)"  },
  pink:   { l:"#ff8ec8", m:"#f53a90", d:"#aa0055", g:"rgba(245,58,144,.55)"  },
};

const S_COL: Record<string, any> = {
  angry: { l:"#ffaa88", m:"#e84030", d:"#8a0010", g:"rgba(232,64,48,.65)"  },
  sad:   { l:"#88aaff", m:"#3a50e0", d:"#102080", g:"rgba(58,80,224,.5)"   },
  crying: { l:"#88aaff", m:"#3a50e0", d:"#102080", g:"rgba(58,80,224,.5)"   },
  love:  { l:"#ffaacc", m:"#f03880", d:"#880040", g:"rgba(240,56,128,.6)"  },
  heart_eyes: { l:"#ffaacc", m:"#f03880", d:"#880040", g:"rgba(240,56,128,.6)" },
  excited: { l:"#ffdd88", m:"#f09830", d:"#a05010", g:"rgba(240,152,48,.55)" },
  starry_eyes: { l:"#ffdd88", m:"#f09830", d:"#a05010", g:"rgba(240,152,48,.55)" },
  mind_blown: { l:"#ffcc88", m:"#f06030", d:"#a02010", g:"rgba(240,96,48,.55)" },
};

const KF_ID = "ak4kf";
function injectKF() {
  if (typeof document === "undefined" || document.getElementById(KF_ID)) return;
  const el = document.createElement("style");
  el.id = KF_ID;
  el.textContent = `
    @keyframes ak4_f   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(var(--afy))} }
    @keyframes ak4_wb  { 0%{transform:translateY(0) rotate(-3.5deg)} 50%{transform:translateY(var(--awy)) rotate(3.5deg)} 100%{transform:translateY(0) rotate(-3.5deg)} }
    @keyframes ak4_sh  { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-6px)} 35%{transform:translateX(6px)} 55%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
    @keyframes ak4_bc  { 0%,100%{transform:translateY(0) scaleX(1) scaleY(1)} 40%{transform:translateY(var(--aby)) scaleX(1.06) scaleY(.95)} }
    @keyframes ak4_hf  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(var(--ahfy))} }
    @keyframes ak4_sdw { 0%,100%{transform:scaleX(1);opacity:.28} 50%{transform:scaleX(.7);opacity:.11} }
    @keyframes ak4_sp  { 0%,100%{transform:translateY(0) scale(1);opacity:.82} 50%{transform:translateY(var(--asy)) scale(1.2);opacity:1} }
    @keyframes ak4_rng { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:0;transform:scale(1.35)} }
    @keyframes ak4_dot { 0%,80%,100%{transform:scale(.55);opacity:.4} 40%{transform:scale(1.12);opacity:1} }
    @keyframes ak4_z   { 0%{transform:translateY(0) scale(.75);opacity:0} 25%{opacity:.9} 100%{transform:translateY(-44px) scale(1.35);opacity:0} }
    @keyframes ak4_tr  { 0%{transform:translateY(0) scaleY(1);opacity:.9} 100%{transform:translateY(26px) scaleY(1.4);opacity:0} }
    @keyframes ak4_ang { 0%,100%{opacity:.65;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
    @keyframes ak4_hrt { 0%{transform:translateY(0) scale(.75);opacity:0} 20%{opacity:1} 100%{transform:translateY(-44px) scale(1.35);opacity:0} }
    @keyframes ak4_bar { 0%,100%{transform:scaleY(.2);opacity:.45} 50%{transform:scaleY(1);opacity:1} }
  `;
  document.head.appendChild(el);
}

const ER = 9;
const SS: React.CSSProperties = { position:"absolute", width:"74%", height:"58%", top:"20%", left:"13%", overflow:"visible" };

// --- Sub-components ---
function Glare({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const R = r || ER;
  return <>
    <circle cx={cx - R*.28} cy={cy - R*.32} r={R*.33} fill="rgba(255,255,255,.95)" />
    <circle cx={cx + R*.30} cy={cy + R*.30} r={R*.14} fill="rgba(255,255,255,.4)"  />
  </>;
}

function FaceSVG({ state, vx, vy, mOpen, blinking, lidColor }: any) {
  const lx = 28 + vx, ly = 30 + vy;
  const rx = 72 + vx, ry = 30 + vy;

  const eNormal = (cx: number, cy: number, r?: number) => {
    const R = r || ER;
    return <g><circle cx={cx} cy={cy} r={R} fill="#0e0420"/><Glare cx={cx} cy={cy} r={R}/></g>;
  };

  const eArch = (cx: number, cy: number) => (
    <g>
      <path d={"M"+(cx-ER-.5)+","+(cy+.5)+" A"+(ER+.5)+","+(ER+.5)+" 0 0,0 "+(cx+ER+.5)+","+(cy+.5)+"Z"} fill="#0e0420"/>
      <ellipse cx={cx-1.5} cy={cy-2.5} rx={3.2} ry={2} fill="rgba(255,255,255,.92)"/>
    </g>
  );

  const eWink = (cx: number, cy: number) => (
    <g>
      <path d={"M"+(cx-ER-1)+","+(cy+1)+" A"+(ER+1)+","+(ER+1)+" 0 0,0 "+(cx+ER+1)+","+(cy+1)+"Z"} fill="#0e0420"/>
      <line x1={cx-5.5} y1={cy-5} x2={cx-8} y2={cy-10} stroke="#0e0420" strokeWidth={2.2} strokeLinecap="round"/>
      <line x1={cx}     y1={cy-7} x2={cx}   y2={cy-12} stroke="#0e0420" strokeWidth={2.2} strokeLinecap="round"/>
      <line x1={cx+5.5} y1={cy-5} x2={cx+8} y2={cy-10} stroke="#0e0420" strokeWidth={2.2} strokeLinecap="round"/>
    </g>
  );

  const eSquint = (cx: number, cy: number) => (
    <g>
      <circle cx={cx} cy={cy} r={ER*.78} fill="#0e0420"/>
      <path d={"M"+(cx-ER*.78-1)+","+(cy-2)+" Q"+cx+","+(cy-ER*.78-3)+" "+(cx+ER*.78+1)+","+(cy-2)+" L"+(cx+ER*.78+3)+","+(cy-ER-8)+" L"+(cx-ER*.78-3)+","+(cy-ER-8)+"Z"} fill={lidColor}/>
      <circle cx={cx-3} cy={cy+1.5} r={2.8} fill="rgba(255,255,255,.92)"/>
    </g>
  );

  const eHeart = (cx: number, cy: number) => (
    <g>
      <path d={"M"+cx+","+(cy+2.5)+" C"+(cx-4)+","+(cy-3.5)+" "+(cx-9.5)+","+(cy+.5)+" "+cx+","+(cy+8)+" C"+(cx+9.5)+","+(cy+.5)+" "+(cx+4)+","+(cy-3.5)+" "+cx+","+(cy+2.5)+"Z"} fill="#ff3070"/>
      <circle cx={cx-3} cy={cy} r={2.5} fill="rgba(255,255,255,.8)"/>
    </g>
  );

  const eStar = (cx: number, cy: number) => (
    <g>
      <path d={"M"+cx+","+(cy-10)+" L"+(cx+2.4)+","+(cy-2.4)+" L"+(cx+10)+","+cy+" L"+(cx+2.4)+","+(cy+2.4)+" L"+cx+","+(cy+10)+" L"+(cx-2.4)+","+(cy+2.4)+" L"+(cx-10)+","+cy+" L"+(cx-2.4)+","+(cy-2.4)+"Z"} fill="rgba(255,230,20,.96)"/>
      <circle cx={cx} cy={cy} r={2.8} fill="rgba(255,255,255,.94)"/>
    </g>
  );

  const eSleepy = (cx: number, cy: number) => {
    const lidY = cy + ER * .18;
    return (
      <g>
        <circle cx={cx} cy={cy} r={ER} fill="#0e0420"/>
        <circle cx={cx - 2} cy={cy + ER * .55} r={ER * .22} fill="rgba(255,255,255,.7)"/>
        <path
          d={
            "M" + (cx - ER - .5) + "," + lidY +
            " Q" + cx + "," + (lidY - ER * .5) + " " + (cx + ER + .5) + "," + lidY +
            " Q" + cx + "," + (cy - ER * 1.05) + " " + (cx - ER - .5) + "," + lidY + "Z"
          }
          fill={lidColor}
        />
        <path
          d={"M"+(cx-ER-.5)+","+lidY+" Q"+cx+","+(lidY-ER*.5)+" "+(cx+ER+.5)+","+lidY}
          fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={.8}
        />
      </g>
    );
  };

  const eBlink = (cx: number, cy: number) => (
    <path d={"M"+(cx-ER-1)+","+cy+" A"+(ER+1)+","+(ER+1)+" 0 0,0 "+(cx+ER+1)+","+cy+"Z"} fill="#0e0420"/>
  );

  const bOp = ["happy","love","heart_eyes","excited","wink"].includes(state) ? .9
            : ["surprised","listening","reading_chat","listening_music"].includes(state) ? .6
            : state==="angry" ? 0 : .52;

  const cheeks = <>
    <ellipse cx={12} cy={43} rx={7.5} ry={5} fill="rgba(255,118,168,1)" opacity={bOp} />
    <ellipse cx={88} cy={43} rx={7.5} ry={5} fill="rgba(255,118,168,1)" opacity={bOp} />
  </>;

  if (blinking) return (
    <svg viewBox="0 0 100 80" style={SS}>
      {eBlink(lx,ly)}{eBlink(rx,ry)}
      <path d="M37,55 Q50,63 63,55" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>
      {cheeks}
    </svg>
  );

  let le, re, brows=null, mouth, extras=null;

  switch(state) {
    case "idle":
    case "online":
      le=eNormal(lx,ly); re=eNormal(rx,ry);
      mouth=<path d="M38,56 Q50,64 62,56" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
      break;
    case "listening":
    case "reading_chat":
      le=eNormal(lx,ly,ER+1.5); re=eNormal(rx,ry,ER+1.5);
      brows=<>
        <path d="M17,17 Q28,13 39,17" fill="none" stroke="#0e0420" strokeWidth={2.8} strokeLinecap="round"/>
        <path d="M61,17 Q72,13 83,17" fill="none" stroke="#0e0420" strokeWidth={2.8} strokeLinecap="round"/>
      </>;
      mouth=<path d="M40,57 Q50,63 60,57" fill="none" stroke="#0e0420" strokeWidth={2.8} strokeLinecap="round"/>;
      break;
    case "thinking":
    case "browsing_files":
    case "browsing_vault":
    case "viewing_notes":
    case "timetable_open":
    case "writing_code":
    case "searching":
    case "uploading":
    case "reading_book":
      le=eNormal(lx-2,ly-3.5);
      re=eSquint(rx,ry);
      brows=<>
        <path d="M17,19 Q28,17 39,19" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>
        <path d="M61,15 Q72,11 83,16" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>
      </>;
      mouth=<path d="M39,57 Q54,64 65,55" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
      break;
    case "talking":
    case "typing":
      le=eNormal(lx,ly); re=eNormal(rx,ry);
      mouth=mOpen
        ? <><ellipse cx={50} cy={57} rx={10} ry={9} fill="#0e0420"/><ellipse cx={50} cy={60} rx={7} ry={4} fill="rgba(255,255,255,.88)"/></>
        : <path d="M40,56 Q50,61 60,56" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
      break;
    case "happy":
    case "celebrating":
      le=eArch(lx,ly); re=eArch(rx,ry);
      brows=<>
        <path d="M17,18 Q28,14 39,18" fill="none" stroke="#0e0420" strokeWidth={2.4} strokeLinecap="round"/>
        <path d="M61,18 Q72,14 83,18" fill="none" stroke="#0e0420" strokeWidth={2.4} strokeLinecap="round"/>
      </>;
      mouth=<path d="M20,52 Q50,72 80,52" fill="none" stroke="#0e0420" strokeWidth={4} strokeLinecap="round"/>;
      break;
    case "surprised":
    case "mind_blown":
      le=eNormal(lx,ly,ER+3); re=eNormal(rx,ry,ER+3);
      brows=<>
        <path d="M17,10 Q28,6 39,10" fill="none" stroke="#0e0420" strokeWidth={3.2} strokeLinecap="round"/>
        <path d="M61,10 Q72,6 83,10" fill="none" stroke="#0e0420" strokeWidth={3.2} strokeLinecap="round"/>
      </>;
      mouth=<ellipse cx={50} cy={59} rx={8} ry={10} fill="#0e0420"/>;
      break;
    case "angry":
      le=eNormal(lx,ly,ER-1); re=eNormal(rx,ry,ER-1);
      brows=<>
        <line x1={16} y1={14} x2={37} y2={22} stroke="#5a0010" strokeWidth={4.5} strokeLinecap="round"/>
        <line x1={63} y1={22} x2={84} y2={14} stroke="#5a0010" strokeWidth={4.5} strokeLinecap="round"/>
      </>;
      mouth=<path d="M33,60 Q50,54 67,60" fill="none" stroke="#0e0420" strokeWidth={3.2} strokeLinecap="round"/>;
      extras=<>
        <text x={6}  y={27} fontSize={13} fill="#ff1010" fontWeight="900" style={{animation:"ak4_ang .8s ease-in-out infinite",fontFamily:"sans-serif"}}>✕</text>
        <text x={80} y={27} fontSize={13} fill="#ff1010" fontWeight="900" style={{animation:"ak4_ang .8s ease-in-out .18s infinite",fontFamily:"sans-serif"}}>✕</text>
      </>;
      break;
    case "sad":
    case "crying":
      le=eNormal(lx,ly); re=eNormal(rx,ry);
      brows=<>
        <line x1={17} y1={20} x2={38} y2={13} stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>
        <line x1={62} y1={13} x2={83} y2={20} stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>
      </>;
      mouth=<path d="M34,62 Q50,52 66,62" fill="none" stroke="#0e0420" strokeWidth={3.2} strokeLinecap="round"/>;
      extras=<g style={{animation:"ak4_tr 2.4s ease-in infinite .5s"}}>
        <ellipse cx={30} cy={41} rx={3} ry={4.5} fill="rgba(120,180,255,.95)"/>
        <path d="M27,44 Q30,50 33,44" fill="rgba(120,180,255,.95)"/>
      </g>;
      break;
    case "love":
    case "heart_eyes":
      le=eHeart(lx,ly); re=eHeart(rx,ry);
      brows=<>
        <path d="M17,18 Q28,14 39,18" fill="none" stroke="#0e0420" strokeWidth={2.4} strokeLinecap="round"/>
        <path d="M61,18 Q72,14 83,18" fill="none" stroke="#0e0420" strokeWidth={2.4} strokeLinecap="round"/>
      </>;
      mouth=<ellipse cx={50} cy={57} rx={5} ry={6} fill="#ff7eb3"/>;
      break;
    case "wink":
      le=eNormal(lx,ly);
      re=eWink(rx,ry);
      brows=<path d="M61,13 Q72,9 83,14" fill="none" stroke="#0e0420" strokeWidth={2.8} strokeLinecap="round"/>;
      mouth=<path d="M36,55 Q52,65 65,53" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
      break;
    case "sleepy":
    case "offline":
      le=eSleepy(lx,ly); re=eSleepy(rx,ry);
      brows=<>
        <path d="M17,21 Q28,18 39,21" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>
        <path d="M61,21 Q72,18 83,21" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>
      </>;
      mouth=<path d="M41,57 Q50,62 59,57" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>;
      break;
    case "excited":
    case "starry_eyes":
    case "magic":
      le=eStar(lx,ly); re=eStar(rx,ry);
      brows=<>
        <path d="M17,13 Q28,9 39,13" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>
        <path d="M61,13 Q72,9 83,13" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>
      </>;
      mouth=<>
        <path d="M20,51 Q50,72 80,51 L80,60 Q50,74 20,60Z" fill="#0e0420"/>
        <path d="M25,54 Q50,70 75,54 Q71,62 50,68 Q29,62 25,54Z" fill="rgba(255,255,255,.9)"/>
      </>;
      break;
    case "cool":
      le=<rect x={lx-14} y={ly-6} width={28} height={12} rx={3} fill="#0e0420"/>;
      re=<rect x={rx-14} y={ly-6} width={28} height={12} rx={3} fill="#0e0420"/>;
      brows=<path d="M43,30 L57,30" stroke="#0e0420" strokeWidth={2.5} strokeLinecap="round"/>;
      mouth=<path d="M38,60 Q50,64 62,60" fill="none" stroke="#0e0420" strokeWidth={3.5} strokeLinecap="round"/>;
      break;
    case "confused":
      le=eNormal(lx,ly,ER-1); re=eNormal(rx,ry,ER-1);
      brows=<>
        <path d="M17,16 Q28,22 39,18" fill="none" stroke="#0e0420" strokeWidth={2.8} strokeLinecap="round"/>
        <path d="M61,14 Q72,10 83,14" fill="none" stroke="#0e0420" strokeWidth={2.8} strokeLinecap="round"/>
      </>;
      mouth=<path d="M42,58 Q50,55 58,58" fill="none" stroke="#0e0420" strokeWidth={2.6} strokeLinecap="round"/>;
      break;
    case "listening_music":
      le=eArch(lx,ly); re=eArch(rx,ry);
      brows=<>
        <path d="M17,18 Q28,15 39,18" fill="none" stroke="#0e0420" strokeWidth={2.4} strokeLinecap="round"/>
        <path d="M61,18 Q72,15 83,18" fill="none" stroke="#0e0420" strokeWidth={2.4} strokeLinecap="round"/>
      </>;
      mouth=<path d="M40,58 Q50,65 60,58" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
      break;
    case "playing_games":
      le=eNormal(lx,ly,ER-2); re=eNormal(rx,ry,ER-2);
      brows=<>
        <line x1={18} y1={18} x2={38} y2={22} stroke="#0e0420" strokeWidth={3.5} strokeLinecap="round"/>
        <line x1={62} y1={22} x2={82} y2={18} stroke="#0e0420" strokeWidth={3.5} strokeLinecap="round"/>
      </>;
      mouth=<path d="M40,58 Q50,64 60,58" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
      break;
      mouth=<path d="M38,62 Q50,58 62,62" fill="none" stroke="#0e0420" strokeWidth={3.2} strokeLinecap="round"/>;
      break;
    case "partying":
      le=eArch(lx,ly); re=eArch(rx,ry);
      brows=<>
        <path d="M17,12 Q28,8 39,12" fill="none" stroke="#0e0420" strokeWidth={2.5} strokeLinecap="round"/>
        <path d="M61,12 Q72,8 83,12" fill="none" stroke="#0e0420" strokeWidth={2.5} strokeLinecap="round"/>
      </>;
      mouth=<ellipse cx={50} cy={61} rx={8} ry={10} fill="#0e0420"/>;
      break;
    default:
      le=eNormal(lx,ly); re=eNormal(rx,ry);
      mouth=<path d="M38,56 Q50,64 62,56" fill="none" stroke="#0e0420" strokeWidth={3} strokeLinecap="round"/>;
  }

  return (
    <svg viewBox="0 0 100 80" style={SS}>
      {brows}{le}{re}{mouth}{cheeks}{extras}
    </svg>
  );
}

function Sparkle({ x, y, delay, sz, col }: any) {
  return (
    <div style={{position:"absolute",left:x,top:y,animation:"ak4_sp "+(2.8+delay*.4)+"s ease-in-out "+delay+"s infinite",pointerEvents:"none",lineHeight:0}}>
      <svg width={sz} height={sz} viewBox="0 0 20 20" fill={col}>
        <path d="M10 0L11.9 8.1 20 10l-8.1 1.9L10 20l-1.9-8.1L0 10l8.1-1.9Z"/>
      </svg>
    </div>
  );
}
function HeartDeco({ x, y, delay, sz }: any) {
  return (
    <div style={{position:"absolute",left:x,top:y,animation:"ak4_sp 3.4s ease-in-out "+delay+"s infinite",pointerEvents:"none",lineHeight:0}}>
      <svg width={sz} height={sz*.9} viewBox="0 0 24 22">
        <path fill="#ff7eb3" d="M12 21.6C6.4 16 1 11.3 1 7.2 1 3.4 4.1 2 6.3 2c1.3 0 4.2.5 5.7 4.5C13.6 2.5 16.5 2 17.7 2c2.5 0 5.3 1.6 5.3 5.2 0 4.1-5.1 8.6-11 14.4z"/>
      </svg>
    </div>
  );
}

// --- Main ActionMojiAvatar Component ---
export default function ActionMojiAvatar({ 
  state, 
  username = 'User', 
  avatarUrl,
  size = 'md',
  showStatus = false,
  showStatusRing = true,
  onClick,
}: ActionMojiProps) {
  const isBot = username === 'AuraBot';

  // Size mapping: AvatarSize -> pixel value
  const sizeMap: Record<AvatarSize, number> = { xs: 32, sm: 48, md: 64, lg: 80, xl: 120 };
  const s = sizeMap[size] ?? 80;

  // Handle composite states (e.g. "typing_happy")
  const activeState = useMemo(() => {
    if (state.startsWith('typing_')) return state.replace('typing_', '');
    if (state.startsWith('aura_')) return state.replace('aura_', '');
    const sLow = state.toLowerCase();
    if (sLow === 'offline' || sLow === 'away' || sLow === 'busy') return 'offline';
    return state;
  }, [state]);

  const isOffline = activeState === 'offline';
  const isTypingEffect = state.includes('typing') || state.includes('thinking');
  
  // Mapping colors based on username or state
  const colorKey = isBot ? 'purple' : 'blue';
  const T = S_COL[activeState] || BASE[colorKey];
  const fp = (n: number) => n.toFixed(1) + "px";

  const rootRef = useRef<HTMLDivElement>(null);
  const blinkTmr = useRef<any>(null);
  const talkTmr = useRef<any>(null);

  const [eyeOff, setEyeOff] = useState({ x: 0, y: 0 });
  const [blinking, setBlinking] = useState(false);
  const [mOpen, setMOpen] = useState(false);

  useEffect(() => { injectKF(); }, []);

  const schedBlink = useCallback(() => {
    blinkTmr.current = setTimeout(() => {
      setBlinking(true);
      setTimeout(() => {
        setBlinking(false);
        schedBlink();
      }, 110);
    }, 2800 + Math.random() * 3200);
  }, []);

  useEffect(() => {
    schedBlink();
    return () => { if (blinkTmr.current) clearTimeout(blinkTmr.current); };
  }, [schedBlink]);

  useEffect(() => {
    const isActiveState = ["talking", "typing", "thinking"].some(s => state.includes(s));
    if (isActiveState) {
      talkTmr.current = setInterval(() => {
        setMOpen(v => !v);
      }, 190);
    } else {
      if (talkTmr.current) clearInterval(talkTmr.current);
      setMOpen(false);
    }
    return () => { if (talkTmr.current) clearInterval(talkTmr.current); };
  }, [state]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const m = Math.hypot(dx, dy) || 1;
      const str = Math.min(m / 420, 1);
      const mx = s * 0.052;
      setEyeOff({ x: (dx / m) * str * mx, y: (dy / m) * str * mx });
    };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => { window.removeEventListener("mousemove", fn); };
  }, [s]);

  const vbS = 100 / (s * 0.74);
  const vx = Math.max(-3, Math.min(3, eyeOff.x * vbS));
  const vy = Math.max(-3, Math.min(3, eyeOff.y * vbS));

  const cv: any = {
    "--afy": fp(-s * 0.065),
    "--awy": fp(-s * 0.035),
    "--aby": fp(-s * 0.055),
    "--ahfy": fp(-s * 0.036),
    "--asy": fp(-s * 0.09),
  };

  const ANIM: Record<string, string> = {
    idle: "ak4_f 3.3s ease-in-out infinite",
    online: "ak4_f 3.3s ease-in-out infinite",
    listening: "ak4_f 3.3s ease-in-out infinite",
    reading_chat: "ak4_f 3.3s ease-in-out infinite",
    thinking: "ak4_wb 3s ease-in-out infinite",
    browsing_files: "ak4_wb 3s ease-in-out infinite",
    talking: "ak4_f .9s ease-in-out infinite",
    typing: "ak4_f .9s ease-in-out infinite",
    happy: "ak4_f 2.8s ease-in-out infinite",
    surprised: "ak4_f 3.3s ease-in-out infinite",
    angry: "ak4_sh .5s ease-in-out infinite",
    sad: "ak4_hf 5s ease-in-out infinite",
    love: "ak4_f 3.6s ease-in-out infinite",
    wink: "ak4_f 3.3s ease-in-out infinite",
    sleepy: "ak4_hf 5.5s ease-in-out infinite",
    offline: "ak4_hf 5.5s ease-in-out infinite",
    excited: "ak4_bc .42s ease-in-out infinite",
  };

  const currentAnim = ANIM[activeState] || ANIM["idle"];

  const ListenBars = (activeState === "listening" || activeState === "reading_chat") && (
    <div style={{position:"absolute",right:fp(-s*.3),top:fp(s*.34),display:"flex",gap:fp(s*.022),alignItems:"flex-end"}}>
      {[s*.07,s*.12,s*.16,s*.12,s*.07].map((h,i) => (
        <div key={i} style={{width:fp(s*.032),height:fp(h),borderRadius:fp(s*.016),background:T.l,animation:"ak4_bar .6s ease-in-out "+(i*.13).toFixed(2)+"s infinite",transformOrigin:"center bottom"}}/>
      ))}
    </div>
  );

  const ThinkDots = isTypingEffect && (
    <div style={{position:"absolute",bottom:fp(-s*.08),right:fp(s*.05),display:"flex",gap:fp(s*.05),zIndex:2}}>
      {[0,1,2].map((i) => (
        <div key={i} style={{width:s*.08,height:s*.08,borderRadius:"50%",background:T.l,animation:"ak4_dot 1.1s ease-in-out "+(i*.22).toFixed(2)+"s infinite"}}/>
      ))}
    </div>
  );

  const Zs = (activeState === "sleepy" || activeState === "offline") && (
    [{r:s*.07,t:s*.1,d:0,fs:s*.19},{r:s*.16,t:.01*s,d:.6,fs:s*.145},{r:s*.24,t:-s*.06,d:1.2,fs:s*.11}]
      .map((p,i) => (
        <div key={i} style={{position:"absolute",right:fp(-p.r),top:fp(p.t),color:"rgba(255,255,255,.8)",fontSize:fp(p.fs),fontWeight:"900",fontFamily:"system-ui,sans-serif",lineHeight:1,zIndex:5,animation:"ak4_z 1.8s ease-in-out "+p.d+"s infinite",pointerEvents:"none"}}>Z</div>
      ))
  );

  const ActivityProp = useMemo(() => {
    const props: Record<string, any> = {
      browsing_vault: { emoji: "📂", pos: { right: fp(-s*.1), top: fp(s*.1) } },
      browsing_files: { emoji: "📂", pos: { right: fp(-s*.1), top: fp(s*.1) } },
      timetable_open: { emoji: "📅", pos: { right: fp(-s*.1), top: fp(s*.1) } },
      viewing_notes:  { emoji: "📝", pos: { left: fp(-s*.1), top: fp(s*.1) } },
      writing_code:   { emoji: "💻", pos: { right: fp(-s*.1), bottom: fp(s*.1) } },
      searching:      { emoji: "🔍", pos: { right: fp(-s*.1), top: fp(s*.1) } },
      celebrating:    { emoji: "🎉", pos: { right: fp(-s*.1), top: fp(-s*.1) } },
      partying:       { emoji: "🎊", pos: { left: fp(-s*.1), top: fp(-s*.1) } },
      magic:          { emoji: "✨", pos: { right: fp(-s*.15), top: fp(-s*.1) } },
      reading_book:   { emoji: "📖", pos: { left: fp(-s*.1), bottom: fp(s*.1) } },
      playing_games:  { emoji: "🎮", pos: { right: fp(-s*.15), bottom: fp(0) } },
      listening_music:{ emoji: "🎵", pos: { right: fp(-s*.1), top: fp(s*.05) } },
      uploading:      { emoji: "⬆️", pos: { right: fp(-s*.1), top: fp(s*.1) } },
    };
    const act = props[activeState];
    if (!act) return null;
    return (
      <div style={{position:"absolute", ...act.pos, zIndex:10, pointerEvents:"none", animation:"ak4_sp 3s ease-in-out infinite"}}>
        <span style={{fontSize:fp(s*.25)}}>{act.emoji}</span>
      </div>
    );
  }, [activeState, s]);

  const Hearts = (activeState === "love" || activeState === "heart_eyes") && (
    [{x:-s*.09,y:s*.12,d:0,sz:s*.15,f:"#ff7eb3"},{x:s*.9,y:s*.04,d:.65,sz:s*.12,f:"#ffaacc"},{x:-s*.04,y:s*.44,d:1.2,sz:s*.09,f:"#ff9ec8"}]
      .map((p,i) => (
        <div key={i} style={{position:"absolute",left:fp(p.x),top:fp(p.y),lineHeight:0,zIndex:5,animation:"ak4_hrt 1.9s ease-in-out "+p.d+"s infinite",pointerEvents:"none"}}>
          <svg width={p.sz} height={p.sz*.9} viewBox="0 0 24 22">
            <path fill={p.f} d="M12 21.6C6.4 16 1 11.3 1 7.2 1 3.4 4.1 2 6.3 2c1.3 0 4.2.5 5.7 4.5C13.6 2.5 16.5 2 17.7 2c2.5 0 5.3 1.6 5.3 5.2 0 4.1-5.1 8.6-11 14.4z"/>
          </svg>
        </div>
      ))
  );

  const isGrayscale = activeState === 'offline';

  return (
    <div className="flex flex-col items-center gap-1 group">
      <div 
        ref={rootRef} 
        onClick={onClick}
        className={`relative inline-flex flex-col items-center user-select-none cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95 ${isGrayscale ? 'grayscale opacity-70' : ''}`}
        style={{ ...cv as React.CSSProperties }}
      >
        {/* Sparkles and Decorations */}
        {!isGrayscale && (
          <>
            <Sparkle x={fp(-s*.34)} y={fp(s*.08)} delay={0} sz={s*.135} col="rgba(255,255,255,.9)"/>
            <Sparkle x={fp(s*.74)} y={fp(s*.28)} delay={.9} sz={s*.09} col="rgba(255,255,255,.62)"/>
            <HeartDeco x={fp(s*.77)} y={fp(-s*.06)} delay={.42} sz={s*.18}/>
            <div style={{position:"absolute",left:fp(-s*.22),top:fp(s*.6),width:s*.068,height:s*.068,borderRadius:"50%",background:T.l,opacity:.7,animation:"ak4_sp 3s ease-in-out 1.2s infinite"}}/>
            <div style={{position:"absolute",right:fp(-s*.1),top:fp(s*.75),width:s*.05,height:s*.05,borderRadius:"50%",background:"#ffb3d1",opacity:.82,animation:"ak4_sp 3.4s ease-in-out .5s infinite"}}/>
          </>
        )}
        
        {Zs}
        {Hearts}
        {ActivityProp}

        {/* Listening Arcs */}
        {(activeState === "listening" || activeState === "reading_chat") && (
          <div style={{position:"absolute",right:fp(-s*.38),top:"50%",transform:"translateY(-50%)",display:"flex",flexDirection:"column",justifyContent:"center",gap:fp(s*.028),pointerEvents:"none"}}>
            {[s*.11,s*.17,s*.23].map((w,i) => (
              <div key={i} style={{width:fp(w),height:fp(w),borderRadius:"50%",border:fp(s*.025)+" solid "+T.l,borderLeft:"none",borderBottom:"none",transform:"rotate(45deg)",opacity:1-i*.22,animation:"ak4_rng "+(1.1+i*.25)+"s ease-in-out "+(i*.18)+"s infinite"}}/>
            ))}
          </div>
        )}

        {/* Main Body */}
        <div style={{position:"relative", animation: currentAnim}}>
          {ListenBars}
          {ThinkDots}
          
          {/* Base Shadow / Blob */}
          <div style={{position:"absolute",bottom:fp(-s*.135),left:fp(s*.09),width:fp(s*.235),height:fp(s*.22),borderRadius:"4% 40% 60% 70%",background:"radial-gradient(circle at 40% 28%, "+T.m+", "+T.d+")",boxShadow:fp(s*.012)+" "+fp(s*.022)+" "+fp(s*.03)+" rgba(0,0,60,.3)",transform:"rotate(-18deg)",zIndex:0}}/>
          
          {/* Main Face Container */}
          <div style={{
            position:"relative",
            width:s,
            height:s,
            zIndex:1,
            borderRadius: "50%",
            WebkitMaskImage: "-webkit-radial-gradient(white, black)",
            background: avatarUrl ? "transparent" : "radial-gradient(circle at 64% 26%, "+T.m+" 0%, "+T.d+" 100%)",
            boxShadow: avatarUrl ? "none" : "0 "+fp(s*.03)+" "+fp(s*.08)+" rgba(0,0,40,.4), inset -"+fp(s*.01)+" -"+fp(s*.015)+" "+fp(s*.03)+" rgba(0,0,100,.15)",
            filter: isOffline ? "grayscale(1) opacity(0.8)" : "none",
            overflow:"hidden",
            transition:"background .4s ease, box-shadow .4s ease, border-radius .4s ease, filter .4s ease"
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              <>
                <div style={{position:"absolute",top:"-7%",right:"5%",width:"55%",height:"45%",borderRadius:"50%",background:"radial-gradient(ellipse at 52% 46%, rgba(255,255,255,.5) 0%, rgba(255,255,255,0) 100%)",pointerEvents:"none"}}/>
                <div style={{position:"absolute",top:"13%",left:"18%",width:"16%",height:"12%",borderRadius:"50%",background:"radial-gradient(ellipse, rgba(255,255,255,.88) 0%, rgba(255,255,255,0) 100%)",pointerEvents:"none"}}/>
                <FaceSVG state={activeState} vx={vx} vy={vy} mOpen={mOpen} blinking={blinking} lidColor={T.m}/>
              </>
            )}
          </div>
        </div>

        {/* Floor Shadow */}
        <div style={{width:fp(s*.6),height:fp(s*.08),marginTop:fp(s*.05),borderRadius:"50%",background:"rgba(0,5,60,.22)",animation:"ak4_sdw 3.3s ease-in-out infinite"}}/>
      </div>

      {/* Status Ring */}
      {showStatusRing && (
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-neutral-950 ${isOffline ? 'bg-neutral-500' : 'bg-green-500'}`} />
      )}

      {/* Status Label (Snapchat Style) */}
      {showStatus && (
        <div className="mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <span className="text-[10px] font-medium text-neutral-400 capitalize">
            {activeState.replace('_', ' ')}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Intelligent mood analyzer for chat messages (supports Hinglish)
 */
export function getMoodFromMessage(msg: string): ActionMojiState {
  const m = msg.toLowerCase();
  
  // Sleepy / Night
  if (m.includes('gn') || m.includes('good night') || m.includes('so raha') || m.includes('sleep') || m.includes('bye')) return 'sleepy';
  
  // Happy / Positive
  if (m.includes('haha') || m.includes('lol') || m.includes('happy') || m.includes('mast') || m.includes('badhiya') || m.includes('nice') || m.includes('good') || m.includes('thanks') || m.includes('shukriya')) return 'happy';
  
  // Love / Appreciation
  if (m.includes('love') || m.includes('heart') || m.includes('dil') || m.includes('cute') || m.includes('wow') || m.includes('amazing')) return 'love';
  
  // Surprise
  if (m.includes('!') || m.includes('shock') || m.includes('kya') || m.includes('what') || m.includes('really') || m.includes('omg')) return 'surprised';
  
  // Magic / Aura
  if (m.includes('magic') || m.includes('jadu') || m.includes('aura') || m.includes('star')) return 'magic';
  
  // Sad / Sorry
  if (m.includes('sad') || m.includes('sorry') || m.includes('dukhi') || m.includes('maaf') || m.includes('crying') || m.includes('ro raha')) return 'sad';
  
  // Angry
  if (m.includes('angry') || m.includes('gussa') || m.includes('pagal') || m.includes('hate') || m.includes('stupid')) return 'angry';
  
  // Thinking / Questions
  if (m.includes('?') || m.includes('thinking') || m.includes('soch') || m.includes('how') || m.includes('why')) return 'thinking';
  
  return 'idle';
}
