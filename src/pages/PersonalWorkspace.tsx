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
  { id: 'notes' as const, label: 'Notes', icon: FileText },
  { id: 'vault' as const, label: 'Vault', icon: Lock },
  { id: 'timetable' as const, label: 'Schedule', icon: Calendar },
] as const;

type TabId = typeof TABS[number]['id'];

export default function PersonalWorkspace() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('notes');

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-full relative bg-aura-navy">
      {/* Header */}
      <div className="px-4 py-3 border-b border-aura-border/50 bg-aura-panel/95 backdrop-blur-md flex items-center gap-3 shrink-0 z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="md:hidden p-2 -ml-2 text-aura-lavender/60 hover:text-white transition-colors rounded-xl active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-md shadow-aura-primary/20 shrink-0">
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="text-white font-bold text-base truncate">
              Personal Space
            </h2>
            <p className="text-[11px] text-aura-lavender/40 flex items-center gap-1 font-medium">
              <Lock size={9} /> Private — only visible to you
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row overflow-hidden min-w-0 w-full">
        {/* Mobile Tab Bar - all 3 tabs always visible */}
        <div className="md:hidden grid grid-cols-3 w-full bg-aura-panel border-b border-aura-border/50 p-1.5 gap-1 shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all font-semibold text-xs",
                  isActive
                    ? "bg-aura-primary/12 text-aura-primary-light border border-aura-primary/20"
                    : "text-aura-lavender/40 border border-transparent"
                )}
              >
                <Icon size={14} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-52 bg-aura-panel border-r border-aura-border/50 flex-col p-3 gap-1 shrink-0">
          <p className="text-[10px] text-aura-lavender/30 uppercase tracking-widest font-bold px-3 mb-2 mt-1">
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
                    ? 'gradient-primary text-white shadow-md shadow-aura-primary/20'
                    : 'text-aura-lavender/60 hover:bg-aura-surface hover:text-white'
                )}
              >
                <Icon size={18} />
                {tab.label === 'Notes' ? 'Personal Notes' :
                  tab.label === 'Schedule' ? 'My Schedule' :
                    'My Vault'}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-aura-navy overflow-hidden relative min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full overflow-hidden"
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
