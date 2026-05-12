'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import { X, Plus, Send, CheckSquare, Square, Trash2, MessageSquare, Clock, Tag, User, Pencil } from 'lucide-react';
import { Task } from '@kanban/types';
import { useAuthStore } from '@/store/auth.store';
import { useBoardStore } from '@/store/board.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, Progress, Separator } from '@/components/ui/primitives';
import { PriorityBadge } from './PriorityBadge';
import { CreateTaskModal } from './CreateTaskModal';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface TaskModalProps {
  task: Task;
  boardId: string;
  onClose: () => void;
}

export function TaskModal({ task, boardId, onClose }: TaskModalProps) {
  const { user } = useAuthStore();
  const { tasks, deleteTask } = useBoardStore();
  const liveTask = tasks.find(t => t.id === task.id) || task;
  const isPM = user?.role === 'PM';

  const [newSubtask, setNewSubtask] = useState('');
  const [newComment, setNewComment] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const completedSubtasks = (liveTask.subtasks || []).filter(s => s.completed).length;
  const totalSubtasks = (liveTask.subtasks || []).length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  async function handleToggleSubtask(subtaskId: string, completed: boolean) {
    try {
      const res = await api.patch(`/api/boards/${boardId}/tasks/${liveTask.id}/subtasks/${subtaskId}`, { completed: !completed });
      const updatedSubtask = res.data.data;
      const { tasks: allTasks } = useBoardStore.getState();
      useBoardStore.setState({
        tasks: allTasks.map(t => {
          if (t.id !== liveTask.id) return t;
          return { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtaskId ? updatedSubtask : st) };
        }),
      });
    } catch { toast({ title: 'Failed to update subtask', variant: 'destructive' }); }
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      const res = await api.post(`/api/boards/${boardId}/tasks/${liveTask.id}/subtasks`, { title: newSubtask.trim() });
      const newSub = res.data.data;
      const { tasks: allTasks } = useBoardStore.getState();
      useBoardStore.setState({
        tasks: allTasks.map(t => {
          if (t.id !== liveTask.id) return t;
          return { ...t, subtasks: [...(t.subtasks || []), newSub] };
        }),
      });
      setNewSubtask('');
    } catch { toast({ title: 'Failed to add subtask', variant: 'destructive' }); }
    finally { setAddingSubtask(false); }
  }

  async function handleDeleteSubtask(subtaskId: string) {
    try {
      await api.delete(`/api/boards/${boardId}/tasks/${liveTask.id}/subtasks/${subtaskId}`);
      const { tasks: allTasks } = useBoardStore.getState();
      useBoardStore.setState({
        tasks: allTasks.map(t => {
          if (t.id !== liveTask.id) return t;
          return { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) };
        }),
      });
    } catch { toast({ title: 'Failed to delete subtask', variant: 'destructive' }); }
  }

  async function handleEditSubtask(subtaskId: string, newTitle: string) {
    try {
      const res = await api.patch(`/api/boards/${boardId}/tasks/${liveTask.id}/subtasks/${subtaskId}`, { title: newTitle });
      const updated = res.data.data;
      const { tasks: allTasks } = useBoardStore.getState();
      useBoardStore.setState({
        tasks: allTasks.map(t => {
          if (t.id !== liveTask.id) return t;
          return { ...t, subtasks: (t.subtasks || []).map(st => st.id === subtaskId ? updated : st) };
        }),
      });
    } catch { toast({ title: 'Failed to update subtask', variant: 'destructive' }); }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await api.post(`/api/boards/${boardId}/tasks/${liveTask.id}/comments`, { content: newComment.trim() });
      const newCom = res.data.data;
      const { tasks: allTasks } = useBoardStore.getState();
      useBoardStore.setState({
        tasks: allTasks.map(t => {
          if (t.id !== liveTask.id) return t;
          return { ...t, comments: [...(t.comments || []), newCom] };
        }),
      });
      setNewComment('');
    } catch { toast({ title: 'Failed to add comment', variant: 'destructive' }); }
    finally { setSendingComment(false); }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment?')) return;
    try {
      await api.delete(`/api/boards/${boardId}/tasks/${liveTask.id}/comments/${commentId}`);
      const { tasks: allTasks } = useBoardStore.getState();
      useBoardStore.setState({
        tasks: allTasks.map(t => {
          if (t.id !== liveTask.id) return t;
          return { ...t, comments: (t.comments || []).filter((c: any) => c.id !== commentId) };
        }),
      });
    } catch { toast({ title: 'Failed to delete comment', variant: 'destructive' }); }
  }

  async function handleDeleteTask() {
    if (!confirm('Delete this task permanently?')) return;
    try {
      await deleteTask(boardId, liveTask.id);
      onClose();
      toast({ title: 'Task deleted', variant: 'success' });
    } catch { toast({ title: 'Failed to delete task', variant: 'destructive' }); }
  }

  function initials(name: string) { return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; }

  return (
    <>
      <style>{`
        @media (max-width: 640px) {
          .task-modal-body { flex-direction: column !important; }
          .task-modal-sidebar { width: 100% !important; border-left: none !important; border-top: 1px solid #f1f5f9; padding: 16px !important; }
          .task-modal-sidebar-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .task-modal-main { max-height: none !important; }
          .task-modal-container { margin: 0 !important; border-radius: 16px 16px 0 0 !important; position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; max-width: 100% !important; max-height: 92vh !important; overflow-y: auto !important; }
          .task-modal-overlay { padding: 0 !important; align-items: flex-end !important; }
        }
      `}</style>

      <div
        className="task-modal-overlay fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 pt-12 overflow-auto"
        onClick={onClose}
      >
        <div
          className="task-modal-container bg-white rounded-2xl shadow-2xl w-full max-w-3xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 pb-4 border-b">
            <div className="flex-1 mr-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <PriorityBadge priority={liveTask.priority} />
                {(liveTask.labels || []).map(label => (
                  <span key={label} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{label}</span>
                ))}
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{liveTask.title}</h2>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {isPM && (
                <button onClick={() => setShowEdit(true)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              {isPM && (
                <button onClick={handleDeleteTask} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body — stacks on mobile */}
          <div className="task-modal-body flex divide-x">

            {/* Left: main content */}
            <div className="task-modal-main flex-1 p-5 space-y-5 overflow-auto max-h-[60vh]">

              {liveTask.description && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{liveTask.description}</p>
                </div>
              )}

              {/* Subtasks */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <CheckSquare className="w-3.5 h-3.5" />
                  Subtasks {totalSubtasks > 0 && <span className="font-normal text-slate-400">({completedSubtasks}/{totalSubtasks})</span>}
                </h4>
                {totalSubtasks > 0 && <Progress value={subtaskProgress} className="mb-3 h-1.5" />}
                <div className="space-y-1.5">
                  {(liveTask.subtasks || []).map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2.5 group py-1">
                      <button onClick={() => handleToggleSubtask(subtask.id, subtask.completed)} className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors">
                        {subtask.completed
                          ? <CheckSquare className="w-4 h-4 text-blue-600" />
                          : <Square className="w-4 h-4" />}
                      </button>
                      <EditableText
                        value={subtask.title}
                        completed={subtask.completed}
                        onSave={(newTitle) => handleEditSubtask(subtask.id, newTitle)}
                      />
                      {isPM && (
                        <button onClick={() => handleDeleteSubtask(subtask.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddSubtask} className="flex gap-2 mt-2">
                  <Input placeholder="Add subtask..." value={newSubtask} onChange={e => setNewSubtask(e.target.value)} className="text-sm h-8" />
                  <Button type="submit" size="sm" variant="outline" disabled={addingSubtask || !newSubtask.trim()} className="shrink-0 h-8">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>

              <Separator />

              {/* Comments */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <MessageSquare className="w-3.5 h-3.5" />Comments
                </h4>
                <div className="space-y-3 mb-3">
                  {(liveTask.comments || []).map((comment: any) => (
                    <div key={comment.id} className="flex gap-2.5 group">
                      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px] font-bold">{initials(comment.author?.name || '')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-slate-50 rounded-xl px-3 py-2 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-semibold text-slate-700">{comment.author?.name}</span>
                          <span className="text-[10px] text-slate-400">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                          {(comment.authorId === user?.id || isPM) && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="ml-auto opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 break-words">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                  {(liveTask.comments || []).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No comments yet.</p>
                  )}
                </div>
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} className="text-sm" />
                  <Button type="submit" size="icon" disabled={sendingComment || !newComment.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>

              {/* Activity log */}
              {(liveTask.activityLogs || []).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Clock className="w-3.5 h-3.5" />Activity
                  </h4>
                  <div className="space-y-1.5">
                    {(liveTask.activityLogs || []).map((log: any) => (
                      <div key={log.id} className="flex items-center gap-2 text-xs text-slate-500">
                        <Avatar className="h-5 w-5 shrink-0">
                          <AvatarFallback className="bg-slate-200 text-slate-600 text-[9px]">{initials(log.user?.name || '')}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 min-w-0"><strong className="text-slate-700">{log.user?.name}</strong> {log.action}</span>
                        <span className="shrink-0">{format(new Date(log.createdAt), 'MMM d')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: meta sidebar */}
            <div className="task-modal-sidebar w-52 p-5 space-y-4 shrink-0">
              <div className="task-modal-sidebar-grid">
                <MetaItem icon={<User className="w-3.5 h-3.5" />} label="Assignees">
                  {(liveTask.assignees || []).length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(liveTask.assignees || []).map((a: any) => (
                        <div key={a.id} className="flex items-center gap-1.5 bg-slate-50 rounded-full px-2 py-0.5">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="bg-blue-500 text-white text-[8px]">{initials(a.user?.name || '')}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-600">{a.user?.name?.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-xs text-slate-400">Unassigned</span>}
                </MetaItem>

                <MetaItem icon={<Tag className="w-3.5 h-3.5" />} label="Sprint">
                  <span className="text-xs text-slate-700">{(liveTask as any).sprint?.name || <span className="text-slate-400">No sprint</span>}</span>
                </MetaItem>

                {liveTask.dueDate && (
                  <MetaItem icon={<Clock className="w-3.5 h-3.5" />} label="Due date">
                    <span className="text-xs text-slate-700">{format(new Date(liveTask.dueDate), 'MMM d, yyyy')}</span>
                  </MetaItem>
                )}

                {liveTask.storyPoints != null && (
                  <MetaItem icon={<Tag className="w-3.5 h-3.5" />} label="Story points">
                    <span className="text-xs font-bold text-slate-700">{liveTask.storyPoints} pts</span>
                  </MetaItem>
                )}

                <MetaItem icon={<Tag className="w-3.5 h-3.5" />} label="Column">
                  <span className="text-xs text-slate-700">{(liveTask as any).column?.name || '—'}</span>
                </MetaItem>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <CreateTaskModal
          boardId={boardId}
          columnId={liveTask.columnId}
          open={showEdit}
          onClose={async () => {
            setShowEdit(false);
            try {
              const fresh = await api.get(`/api/boards/${boardId}/tasks/${liveTask.id}`);
              const { tasks: allTasks } = useBoardStore.getState();
              useBoardStore.setState({
                tasks: allTasks.map(t => t.id === liveTask.id ? fresh.data.data : t),
              });
            } catch {}
          }}
          editTask={liveTask}
        />
      )}
    </>
  );
}

function MetaItem({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {icon}{label}
      </div>
      {children}
    </div>
  );
}

function EditableText({ value, completed, onSave }: { value: string; completed: boolean; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  if (editing) {
    return (
      <input
        className="text-sm flex-1 border border-blue-400 rounded px-2 py-0.5 focus:outline-none"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={() => { onSave(text); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(text); setEditing(false); }
          if (e.key === 'Escape') setEditing(false);
        }}
        autoFocus
      />
    );
  }

  return (
    <span
      onDoubleClick={() => setEditing(true)}
      className={cn('text-sm flex-1 cursor-text', completed ? 'line-through text-slate-400' : 'text-slate-700')}
      title="Double click to edit"
    >
      {value}
    </span>
  );
}