'use client';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Task } from '@kanban/types';

interface CreateTaskModalProps {
  boardId: string;
  columnId: string;
  open: boolean;
  onClose: () => void;
  editTask?: Task;
}

export function CreateTaskModal({ boardId, columnId, open, onClose, editTask }: CreateTaskModalProps) {
  const { createTask, updateTask, currentBoard, sprints, fetchSprints } = useBoardStore();
  const members = currentBoard?.members || [];
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM',
    dueDate: '', storyPoints: '', labels: '', sprintId: '', assigneeIds: [] as string[],
  });

  useEffect(() => { if (boardId) fetchSprints(boardId); }, [boardId]);

  useEffect(() => {
    if (editTask) {
      setForm({
        title: editTask.title,
        description: editTask.description || '',
        priority: editTask.priority,
        dueDate: editTask.dueDate ? editTask.dueDate.slice(0, 10) : '',
        storyPoints: editTask.storyPoints != null ? String(editTask.storyPoints) : '',
        labels: (editTask.labels || []).join(', '),
        sprintId: editTask.sprintId || '',
        assigneeIds: (editTask.assignees || []).map((a: any) => a.userId),
      });
    } else {
      setForm({ title: '', description: '', priority: 'MEDIUM', dueDate: '', storyPoints: '', labels: '', sprintId: '', assigneeIds: [] });
    }
  }, [editTask, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        storyPoints: form.storyPoints ? Number(form.storyPoints) : undefined,
        labels: form.labels ? form.labels.split(',').map((l: string) => l.trim()).filter(Boolean) : [],
        columnId,
        sprintId: form.sprintId || null,
        assigneeIds: form.assigneeIds,
      };
      if (editTask) {
        await updateTask(boardId, editTask.id, payload);
        toast({ title: 'Task updated!', variant: 'success' });
      } else {
        await createTask(boardId, payload);
        toast({ title: 'Task created!', variant: 'success' });
      }
      onClose();
    } catch {
      toast({ title: editTask ? 'Failed to update task' : 'Failed to create task', variant: 'destructive' });
    } finally { setSaving(false); }
  }

  function toggleAssignee(userId: string) {
    setForm(f => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(userId)
        ? f.assigneeIds.filter(id => id !== userId)
        : [...f.assigneeIds, userId],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editTask ? 'Edit Task' : 'Create new task'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Title *</label>
            <Input placeholder="What needs to be done?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Textarea placeholder="Add more details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Story Points</label>
              <Input type="number" min="0" max="100" placeholder="e.g. 5" value={form.storyPoints} onChange={e => setForm(f => ({ ...f, storyPoints: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Labels</label>
              <Input placeholder="frontend, bug, ..." value={form.labels} onChange={e => setForm(f => ({ ...f, labels: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Sprint</label>
            <select value={form.sprintId} onChange={e => setForm(f => ({ ...f, sprintId: e.target.value }))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">No sprint (Backlog)</option>
              {sprints.map(s => <option key={s.id} value={s.id}>{s.name} — {s.status}</option>)}
            </select>
          </div>
          {members.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Assign to</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m: any) => {
                  const selected = form.assigneeIds.includes(m.userId);
                  return (
                    <button key={m.userId} type="button" onClick={() => toggleAssignee(m.userId)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                      {m.user?.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{editTask ? 'Saving...' : 'Creating...'}</> : editTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
