'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Loader2, Zap, Calendar, CheckCircle2, Circle, Pencil, Trash2, BarChart2, X } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { PriorityBadge } from '@/components/task/PriorityBadge';
import { toast } from '@/hooks/use-toast';
import { Sprint } from '@kanban/types';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  PLANNED: 'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;',
  ACTIVE: 'background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0;',
  COMPLETED: 'background: #dbeafe; color: #2563eb; border: 1px solid #bfdbfe;',
};

export default function SprintsPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuthStore();
  const { sprints, fetchSprints, createSprint, updateSprint, deleteSprint, updateTask, tasks, columns } = useBoardStore();
  const isPM = user?.role === 'PM';
  const [showModal, setShowModal] = useState(false);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '' });
  const [chartSprint, setChartSprint] = useState<Sprint | null>(null);

  useEffect(() => { fetchSprints(boardId); }, [boardId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (editSprint) {
        await updateSprint(boardId, editSprint.id, { name: form.name, startDate: form.startDate || undefined, endDate: form.endDate || undefined });
        toast({ title: 'Sprint updated!', variant: 'success' });
      } else {
        await createSprint(boardId, { name: form.name, startDate: form.startDate || undefined, endDate: form.endDate || undefined });
        toast({ title: 'Sprint created!', variant: 'success' });
      }
      setShowModal(false); setEditSprint(null); setForm({ name: '', startDate: '', endDate: '' });
    } catch { toast({ title: 'Failed', variant: 'destructive' }); }
    finally { setSaving(false); }
  }

  async function handleDelete(sprintId: string) {
    if (!confirm('Delete this sprint? Tasks will be unassigned.')) return;
    try { await deleteSprint(boardId, sprintId); toast({ title: 'Sprint deleted', variant: 'success' }); }
    catch { toast({ title: 'Failed to delete sprint', variant: 'destructive' }); }
  }

  async function handleStatusChange(sprint: Sprint, status: string) {
    try { await updateSprint(boardId, sprint.id, { status: status as any }); }
    catch { toast({ title: 'Failed to update status', variant: 'destructive' }); }
  }

  async function handleMoveTask(taskId: string, sprintId: string | null) {
    try {
      await updateTask(boardId, taskId, { sprintId } as any);
      toast({ title: sprintId ? 'Task added to sprint' : 'Task removed from sprint', variant: 'success' });
    } catch { toast({ title: 'Failed to update task', variant: 'destructive' }); }
  }

  function openEdit(sprint: Sprint) {
    setForm({ name: sprint.name, startDate: sprint.startDate ? sprint.startDate.slice(0, 10) : '', endDate: sprint.endDate ? sprint.endDate.slice(0, 10) : '' });
    setEditSprint(sprint); setShowModal(true);
  }

  const inputStyle: React.CSSProperties = { width: '100%', height: '42px', borderRadius: '8px', padding: '0 12px', fontSize: '14px', border: '1px solid rgba(0,0,0,0.12)', background: '#f8fafc', color: '#0d1b35', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#f0f4fa', fontFamily: 'var(--font-sans)' }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} .mo{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.5);}`}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.08)', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 }}>
        <h2 style={{ color: '#0d1b35', fontSize: '15px', fontWeight: 700, margin: 0 }}>Sprints</h2>
        {isPM && (
          <button onClick={() => { setShowModal(true); setEditSprint(null); setForm({ name: '', startDate: '', endDate: '' }); }} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer' }}>
            <Plus size={14} /> New Sprint
          </button>
        )}
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sprints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Zap size={32} style={{ color: '#94a3b8', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#64748b', fontWeight: 600, margin: '0 0 6px' }}>No sprints yet</p>
            {isPM && <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Create your first sprint to start planning</p>}
          </div>
        ) : sprints.map(sprint => {
          const sprintTasks = tasks.filter(t => t.sprintId === sprint.id);
          const doneTasks = sprintTasks.filter(t => columns.find(c => c.id === t.columnId)?.name === 'Done');
          const progress = sprintTasks.length > 0 ? (doneTasks.length / sprintTasks.length) * 100 : 0;
          const totalPoints = sprintTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
          const donePoints = doneTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);

          return (
            <div key={sprint.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                      <h3 style={{ color: '#0d1b35', fontWeight: 700, fontSize: '16px', margin: 0 }}>{sprint.name}</h3>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, ...Object.fromEntries(statusColors[sprint.status].split(';').filter(Boolean).map(s => { const [k, v] = s.split(':'); return [k.trim().replace(/-([a-z])/g, (_, l) => l.toUpperCase()), v.trim()]; })) }}>
                        {sprint.status}
                      </span>
                    </div>
                    {(sprint.startDate || sprint.endDate) && (
                      <p style={{ color: '#64748b', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={12} />
                        {sprint.startDate && format(new Date(sprint.startDate), 'MMM d')}
                        {sprint.startDate && sprint.endDate && ' → '}
                        {sprint.endDate && format(new Date(sprint.endDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {/* Chart button */}
                    <button onClick={() => setChartSprint(chartSprint?.id === sprint.id ? null : sprint)} style={{ height: '30px', padding: '0 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: chartSprint?.id === sprint.id ? 'rgba(245,196,0,0.1)' : '#f1f5f9', border: chartSprint?.id === sprint.id ? '1px solid rgba(245,196,0,0.4)' : '1px solid rgba(0,0,0,0.08)', color: chartSprint?.id === sprint.id ? '#c98500' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <BarChart2 size={13} /> Chart
                    </button>
                    {isPM && sprint.status !== 'ACTIVE' && <button onClick={() => handleStatusChange(sprint, 'ACTIVE')} style={{ height: '30px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: '#dcfce7', border: '1px solid #bbf7d0', color: '#16a34a', cursor: 'pointer' }}>Start</button>}
                    {isPM && sprint.status === 'ACTIVE' && <button onClick={() => handleStatusChange(sprint, 'COMPLETED')} style={{ height: '30px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: '#dbeafe', border: '1px solid #bfdbfe', color: '#2563eb', cursor: 'pointer' }}>Complete</button>}
                    {isPM && <button onClick={() => openEdit(sprint)} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', color: '#94a3b8', cursor: 'pointer' }}><Pencil size={13} /></button>}
                    {isPM && <button onClick={() => handleDelete(sprint.id)} style={{ width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid rgba(0,0,0,0.08)', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={13} /></button>}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>{doneTasks.length}/{sprintTasks.length} tasks done</span>
                  {totalPoints > 0 && <span style={{ color: '#64748b', fontSize: '12px' }}>{donePoints}/{totalPoints} pts</span>}
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: '#f1f5f9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, progress)}%`, background: 'linear-gradient(90deg,#F5C400,#e6b800)', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                </div>
              </div>

              {/* Burndown chart */}
              {chartSprint?.id === sprint.id && (
                <BurndownChart sprint={sprint} sprintTasks={sprintTasks} columns={columns} />
              )}

              {/* Tasks */}
              <div style={{ padding: '12px 20px' }}>
                {sprintTasks.length > 0 ? sprintTasks.map(task => {
                  const isDone = columns.find(c => c.id === task.columnId)?.name === 'Done';
                  const col = columns.find(c => c.id === task.columnId);
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 8px', borderRadius: '8px', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {isDone ? <CheckCircle2 size={15} style={{ color: '#16a34a', flexShrink: 0 }} /> : <Circle size={15} style={{ color: '#cbd5e1', flexShrink: 0 }} />}
                      <span style={{ fontSize: '13px', flex: 1, color: isDone ? '#94a3b8' : '#1e293b', textDecoration: isDone ? 'line-through' : 'none' }}>{task.title}</span>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>{col?.name}</span>
                      <PriorityBadge priority={task.priority} />
                      {task.storyPoints && <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', padding: '1px 6px' }}>{task.storyPoints}pt</span>}
                      {isPM && (
                        <button onClick={() => handleMoveTask(task.id, null)} style={{ fontSize: '11px', color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', opacity: 0 }} className="remove-btn">Remove</button>
                      )}
                    </div>
                  );
                }) : <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '12px 0', margin: 0 }}>No tasks in this sprint yet</p>}

                {isPM && tasks.filter(t => !t.sprintId).length > 0 && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ color: '#F5C400', fontSize: '12px', cursor: 'pointer', fontWeight: 600, padding: '6px 0', userSelect: 'none' as const }}>
                      + Add tasks from backlog ({tasks.filter(t => !t.sprintId).length} available)
                    </summary>
                    <div style={{ marginTop: '8px', maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(245,196,0,0.3)', borderRadius: '10px', padding: '8px', background: 'rgba(245,196,0,0.04)' }}>
                      {tasks.filter(t => !t.sprintId).map(t => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'white')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontSize: '13px', color: '#1e293b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                          <PriorityBadge priority={t.priority} />
                          <button onClick={() => handleMoveTask(t.id, sprint.id)} style={{ fontSize: '11px', fontWeight: 700, color: '#060e1c', background: 'linear-gradient(135deg,#F5C400,#e6b800)', border: 'none', borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>+ Add</button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="mo" onClick={() => { setShowModal(false); setEditSprint(null); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', background: 'white', borderRadius: '16px', padding: '28px', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.2)' }}>
            <h2 style={{ color: '#0d1b35', fontSize: '17px', fontWeight: 700, margin: '0 0 20px' }}>{editSprint ? 'Edit Sprint' : 'New Sprint'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Sprint name *</label>
                <input placeholder="e.g. Sprint 2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(['startDate', 'endDate'] as const).map(key => (
                  <div key={key}>
                    <label style={{ display: 'block', color: '#64748b', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '6px' }}>{key === 'startDate' ? 'Start date' : 'End date'}</label>
                    <input type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditSprint(null); }} style={{ height: '40px', padding: '0 16px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: '#64748b', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={saving || !form.name.trim()} style={{ height: '40px', padding: '0 20px', borderRadius: '8px', background: saving || !form.name.trim() ? 'rgba(245,196,0,0.4)' : 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null}{editSprint ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `.remove-btn{opacity:0!important} div:hover>.remove-btn{opacity:1!important}` }} />
    </div>
  );
}

// ─── Burndown Chart Component ─────────────────────────────────────────────────
function BurndownChart({ sprint, sprintTasks, columns }: { sprint: Sprint; sprintTasks: any[]; columns: any[] }) {
  const totalPoints = sprintTasks.reduce((s, t) => s + (t.storyPoints || 0), 0);
  const donePoints = sprintTasks.filter(t => columns.find(c => c.id === t.columnId)?.name === 'Done').reduce((s, t) => s + (t.storyPoints || 0), 0);
  const remainingPoints = totalPoints - donePoints;

  const totalTasks = sprintTasks.length;
  const doneTasks = sprintTasks.filter(t => columns.find(c => c.id === t.columnId)?.name === 'Done').length;
  const inProgressTasks = sprintTasks.filter(t => columns.find(c => c.id === t.columnId)?.name === 'In Progress').length;
  const todoTasks = totalTasks - doneTasks - inProgressTasks;

  // Column distribution data
  const colData = columns.map(col => ({
    name: col.name,
    count: sprintTasks.filter(t => t.columnId === col.id).length,
    points: sprintTasks.filter(t => t.columnId === col.id).reduce((s, t) => s + (t.storyPoints || 0), 0),
  })).filter(d => d.count > 0);

  const maxCount = Math.max(...colData.map(d => d.count), 1);

  const colColors: Record<string, string> = {
    'Backlog': '#94a3b8', 'Sprint Ready': '#3b82f6', 'In Progress': '#F5C400',
    'Review': '#8b5cf6', 'QA': '#f97316', 'Done': '#22c55e',
  };

  return (
    <div style={{ padding: '16px 20px', background: '#fafbff', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 16px' }}>Sprint Progress Chart</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Stats */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { label: 'Total Tasks', value: totalTasks, color: '#64748b' },
              { label: 'Done', value: doneTasks, color: '#22c55e' },
              { label: 'Total Points', value: totalPoints, color: '#64748b' },
              { label: 'Remaining', value: remainingPoints, color: remainingPoints > 0 ? '#ef4444' : '#22c55e' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px' }}>
                <p style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{stat.label}</p>
                <p style={{ color: stat.color, fontSize: '22px', fontWeight: 800, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Completion ring */}
          <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                <circle cx="28" cy="28" r="22" fill="none" stroke="#F5C400" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - (totalTasks > 0 ? doneTasks / totalTasks : 0))}`}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0d1b35' }}>
                  {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%
                </span>
              </div>
            </div>
            <div>
              <p style={{ color: '#0d1b35', fontWeight: 700, fontSize: '13px', margin: '0 0 3px' }}>Completion</p>
              <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{doneTasks} of {totalTasks} tasks complete</p>
            </div>
          </div>
        </div>

        {/* Right: Bar chart by column */}
        <div style={{ background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px' }}>
          <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, margin: '0 0 12px' }}>Tasks by column</p>
          {colData.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>No tasks yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {colData.map(col => (
                <div key={col.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 500 }}>{col.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{col.count} task{col.count !== 1 ? 's' : ''}{col.points > 0 ? ` · ${col.points}pt` : ''}</span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: '#f1f5f9', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(col.count / maxCount) * 100}%`, background: colColors[col.name] || '#94a3b8', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}