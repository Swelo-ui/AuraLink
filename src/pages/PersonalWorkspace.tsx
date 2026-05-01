import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { FileText, Calendar, Lock } from 'lucide-react';
import clsx from 'clsx';
import SyncNotes from '../components/SyncNotes';
import SharedTimetable from '../components/SharedTimetable';
import SmartVault from '../components/SmartVault';

export default function PersonalWorkspace() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'notes' | 'vault' | 'timetable'>('notes');

  if (!user) return null;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="p-4 border-b border-aura-border bg-aura-panel flex items-center justify-between shadow-sm relative z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-aura-primary flex items-center justify-center text-white font-bold text-lg shadow-inner">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              My Personal Space
              <span className="text-xs bg-aura-teal/20 text-aura-teal px-2 py-0.5 rounded-full font-medium border border-aura-teal/30">Private</span>
            </h2>
            <p className="text-xs text-aura-lavender/70 flex items-center gap-1.5">
              Only visible to you
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for tabs */}
        <div className="w-64 bg-aura-panel border-r border-aura-border flex flex-col p-4 gap-2">
          <button
            onClick={() => setActiveTab('notes')}
            className={clsx(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-medium",
              activeTab === 'notes' ? "bg-aura-primary text-white shadow-md shadow-aura-primary/20" : "text-aura-lavender hover:bg-aura-border hover:text-white"
            )}
          >
            <FileText size={20} /> Personal Notes
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={clsx(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-medium",
              activeTab === 'timetable' ? "bg-aura-primary text-white shadow-md shadow-aura-primary/20" : "text-aura-lavender hover:bg-aura-border hover:text-white"
            )}
          >
            <Calendar size={20} /> My Timetable
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={clsx(
              "flex items-center gap-3 p-3 rounded-xl transition-all font-medium",
              activeTab === 'vault' ? "bg-aura-primary text-white shadow-md shadow-aura-primary/20" : "text-aura-lavender hover:bg-aura-border hover:text-white"
            )}
          >
            <Lock size={20} /> My Vault
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-aura-navy">
          {activeTab === 'notes' && <SyncNotes connectionId="" />}
          {activeTab === 'timetable' && <SharedTimetable connectionId="" />}
          {activeTab === 'vault' && <SmartVault connectionId="" messages={[]} partner={null} isPersonal={true} />}
        </div>
      </div>
    </div>
  );
}