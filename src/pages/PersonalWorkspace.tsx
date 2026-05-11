import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { FileText, Calendar, Lock, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import SyncNotes from '../components/SyncNotes';
import SharedTimetable from '../components/SharedTimetable';
import SmartVault from '../components/SmartVault';

const TABS = [
  { id: 'notes' as const, label: 'Notes', icon: FileText, color: 'aura-primary' },
  { id: 'timetable' as const, label: 'Timetable', icon: Calendar, color: 'aura-pink' },
  { id: 'vault' as const, label: 'Vault', icon: Lock, color: 'aura-teal' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function PersonalWorkspace() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('notes');

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-aura-border bg-aura-panel flex items-center gap-3 shadow-sm relative z-10 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="md:hidden p-2 -ml-2 text-aura-lavender hover:text-white transition-colors rounded-lg active:scale-95"
          title="Back to Chats"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-aura-primary to-aura-pink flex items-center justify-center text-white shadow-lg shadow-aura-primary/20 shrink-0">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-base sm:text-lg truncate">
              Personal Space
            </h2>
            <p className="text-[11px] text-aura-lavender/50 flex items-center gap-1.5">
              <Lock size={10} /> Private — only visible to you
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden min-w-0">
        {/* Mobile Tab Bar — all 3 tabs always visible */}
        <div className="md:hidden flex w-full bg-aura-panel border-b border-aura-border p-1.5 gap-1 shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const activeColor =
              tab.color === 'aura-primary' ? { bg: 'rgba(155,89,182,0.18)', border: 'rgba(155,89,182,0.4)', text: '#b07aff' } :
                tab.color === 'aura-pink' ? { bg: 'rgba(236,72,153,0.18)', border: 'rgba(236,72,153,0.4)', text: '#f472b6' } :
                  { bg: 'rgba(0,212,170,0.18)', border: 'rgba(0,212,170,0.4)', text: '#2dd4bf' };
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 min-w-0 flex items-center justify-center gap-1 py-2 rounded-xl transition-all font-semibold text-xs"
                style={{
                  backgroundColor: isActive ? activeColor.bg : 'transparent',
                  border: isActive ? `1.5px solid ${activeColor.border}` : '1.5px solid transparent',
                  color: isActive ? activeColor.text : 'rgba(148,163,184,0.5)',
                }}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-56 bg-aura-panel border-r border-aura-border flex-col p-3 gap-1.5 shrink-0">
          <p className="text-[10px] text-aura-lavender/40 uppercase tracking-widest font-bold px-3 mb-2">
            Workspace
          </p>
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl transition-all font-medium text-sm',
                  isActive
                    ? 'bg-aura-primary text-white shadow-md shadow-aura-primary/20'
                    : 'text-aura-lavender/70 hover:bg-aura-border hover:text-white'
                )}
              >
                <Icon size={18} />
                {tab.label === 'Notes' ? 'Personal Notes' :
                  tab.label === 'Timetable' ? 'My Timetable' :
                    'My Vault'}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-aura-navy overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === 'notes' && <SyncNotes connectionId={undefined} />}
              {activeTab === 'timetable' && <SharedTimetable connectionId={undefined} />}
              {activeTab === 'vault' && <SmartVault connectionId="" messages={[]} partner={null} isPersonal={true} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
