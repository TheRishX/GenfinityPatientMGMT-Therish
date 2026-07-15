import React, { useState } from 'react';
import { FabricationItem } from '../types';

interface FabricationViewProps {
  items: FabricationItem[];
  onUpdateItem: (itemId: string, updateData: any) => Promise<void>;
}

export default function FabricationView({
  items,
  onUpdateItem
}: FabricationViewProps) {
  const stages: { id: FabricationItem['stage']; label: string; icon: string }[] = [
    { id: 'Layout', label: 'Layout & Correct', icon: 'draw' },
    { id: 'Thermoforming', label: 'Thermoforming', icon: 'waves' },
    { id: 'Grinding', label: 'Grinding/Buffing', icon: 'blur_on' },
    { id: 'Assembly', label: 'Assembly & Straps', icon: 'build_circle' },
    { id: 'QA', label: 'Quality Audit', icon: 'workspace_premium' }
  ];

  const [selectedItem, setSelectedItem] = useState<FabricationItem | null>(null);
  const [editStage, setEditStage] = useState<FabricationItem['stage']>('Layout');
  const [editNotes, setEditNotes] = useState('');
  const [editPriority, setEditPriority] = useState<'Urgent' | 'Standard'>('Standard');

  const getItemsByStage = (stage: FabricationItem['stage']) => {
    return items.filter(it => it.stage === stage);
  };

  const handleUpdateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    await onUpdateItem(selectedItem.id, {
      stage: editStage,
      techNotes: editNotes,
      priority: editPriority
    });

    setSelectedItem(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header Area */}
      <div className="border-b border-surface-container-highest/20 pb-6">
        <h2 className="text-3xl font-extrabold text-on-surface tracking-tight">O&amp;P Lab Fabrication</h2>
        <p className="text-sm font-semibold text-on-surface-variant opacity-85 mt-1">
          Monitor customized physical devices currently progressing in the clinical workshop
        </p>
      </div>

      {/* Fabrication Grid Lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto min-w-max lg:min-w-0">
        {stages.map(st => {
          const stageItems = getItemsByStage(st.id);
          return (
            <div key={st.id} className="bg-surface-container-low/30 rounded-2xl p-4 border border-surface-container-highest/20 flex flex-col min-h-[400px] w-72 lg:w-auto">
              {/* Lane Header */}
              <div className="flex items-center gap-2 border-b border-surface-container pb-3 mb-4">
                <span className="material-symbols-outlined text-secondary text-base shrink-0">{st.icon}</span>
                <h3 className="font-extrabold text-xs text-on-surface tracking-tight truncate flex-1">{st.label}</h3>
                <span className="bg-surface-container-high text-on-surface-variant text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                  {stageItems.length}
                </span>
              </div>

              {/* Lane Content */}
              <div className="space-y-3.5 flex-1 overflow-y-auto">
                {stageItems.map(item => {
                  const isUrgent = item.priority === 'Urgent';
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setEditStage(item.stage);
                        setEditNotes(item.techNotes);
                        setEditPriority(item.priority);
                      }}
                      className="bg-surface-container-lowest border border-surface-container-highest rounded-xl p-3.5 shadow-xs hover:border-primary/45 transition-all cursor-pointer relative group flex flex-col justify-between min-h-[140px]"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isUrgent ? 'bg-primary-container/10 text-primary' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {item.priority}
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-bold">{item.updatedAt}</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-on-surface group-hover:text-primary transition-colors line-clamp-1">{item.patientName}</h4>
                        <p className="text-[10px] text-on-surface-variant font-bold mt-0.5 truncate">{item.device}</p>
                        
                        {item.techNotes && (
                          <p className="text-[10px] font-medium text-on-surface bg-surface p-2 rounded-lg border border-surface-container mt-2.5 line-clamp-2">
                            {item.techNotes}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 text-right">
                        <span className="text-[9px] font-extrabold text-secondary hover:underline flex items-center justify-end gap-1">
                          Update Specs <span className="material-symbols-outlined text-[10px]">edit</span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {stageItems.length === 0 && (
                  <div className="h-28 rounded-xl border border-dashed border-surface-container-highest flex items-center justify-center p-4 text-center">
                    <p className="text-[10px] font-bold text-on-surface-variant opacity-60">Ready for job</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* UPDATE FABRICATION ITEM MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 modal-backdrop-blur">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-lg overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-surface-container bg-surface-bright flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base text-on-surface">Update Lab Specifications</h3>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                  Patient: {selectedItem.patientName} • Device: {selectedItem.device}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateItemSubmit} className="p-6 space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Active Lab Stage</label>
                <select
                  value={editStage}
                  onChange={e => setEditStage(e.target.value as FabricationItem['stage'])}
                  className="w-full px-4 py-2.5 bg-surface rounded-full border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none"
                >
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Priority Rank</label>
                <div className="flex gap-2">
                  {(['Standard', 'Urgent'] as const).map(pr => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setEditPriority(pr)}
                      className={`flex-1 py-2 text-xs font-bold rounded-full border transition-all cursor-pointer ${
                        editPriority === pr
                          ? pr === 'Urgent'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-secondary text-white border-secondary shadow-xs'
                          : 'bg-surface-container-low border-surface-container-highest text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide">Technical/Lab Notes</label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-surface rounded-2xl border border-surface-container-highest text-xs text-on-surface focus:border-secondary outline-none resize-none"
                  placeholder="E.g., Check scan measurements. Needs custom joint pin size."
                />
              </div>

              <div className="pt-4 border-t border-surface-container flex justify-end gap-2.5 bg-surface-bright">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4.5 py-2 border border-surface-container-highest rounded-full text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5.5 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-container transition-all cursor-pointer"
                >
                  Save Tech Specs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
