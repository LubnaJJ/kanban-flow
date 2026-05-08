'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, Calendar, Clock, Users, Trash2, Pencil, Video, Link } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/primitives';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/primitives';
import { toast } from '@/hooks/use-toast';
import { Meeting } from '@kanban/types';
import { format, isPast } from 'date-fns';

export default function MeetingsPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuthStore();
  const { meetings, fetchMeetings, createMeeting, updateMeeting, deleteMeeting, currentBoard, sprints, fetchSprints } = useBoardStore();
  const isPM = user?.role === 'PM';
  const [showCreate, setShowCreate] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', scheduledAt: '',
    sprintId: '', participantIds: [] as string[], meetingUrl: ''
  });
  const members = currentBoard?.members || [];

  useEffect(() => { fetchMeetings(boardId); fetchSprints(boardId); }, [boardId]);

  function resetForm() {
    setForm({ title: '', description: '', scheduledAt: '', sprintId: '', participantIds: [], meetingUrl: '' });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await createMeeting(boardId, {
        title: form.title, description: form.description,
        scheduledAt: form.scheduledAt, sprintId: form.sprintId || undefined,
        participantIds: form.participantIds,
        meetingUrl: form.meetingUrl || undefined,
      });
      toast({ title: 'Meeting scheduled!', variant: 'success' });
      setShowCreate(false); resetForm();
    } catch { toast({ title: 'Failed to schedule meeting', variant: 'destructive' }); }
    finally { setSaving(false); }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault(); if (!editMeeting) return; setSaving(true);
    try {
      await updateMeeting(boardId, editMeeting.id, {
        title: form.title, description: form.description,
        scheduledAt: form.scheduledAt, sprintId: form.sprintId || undefined,
        participantIds: form.participantIds,
        meetingUrl: form.meetingUrl || undefined,
      });
      toast({ title: 'Meeting updated!', variant: 'success' });
      setEditMeeting(null);
    } catch { toast({ title: 'Failed to update meeting', variant: 'destructive' }); }
    finally { setSaving(false); }
  }

  async function handleDelete(meetingId: string) {
    if (!confirm('Delete this meeting?')) return;
    try { await deleteMeeting(boardId, meetingId); toast({ title: 'Meeting deleted', variant: 'success' }); }
    catch { toast({ title: 'Failed to delete', variant: 'destructive' }); }
  }

  function openEdit(m: Meeting) {
    setForm({
      title: m.title, description: m.description || '',
      scheduledAt: m.scheduledAt.slice(0, 16), sprintId: m.sprintId || '',
      participantIds: (m.participants || []).map(p => p.userId),
      meetingUrl: (m as any).meetingUrl || '',
    });
    setEditMeeting(m);
  }

  function toggleParticipant(uid: string) {
    setForm(f => ({
      ...f,
      participantIds: f.participantIds.includes(uid)
        ? f.participantIds.filter(id => id !== uid)
        : [...f.participantIds, uid]
    }));
  }

  function initials(name: string) { return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; }

  function getMeetingPlatform(url: string) {
    if (url.includes('zoom.us')) return { label: 'Join Zoom', color: 'bg-blue-600 hover:bg-blue-700' };
    if (url.includes('meet.google')) return { label: 'Join Google Meet', color: 'bg-green-600 hover:bg-green-700' };
    if (url.includes('teams.microsoft')) return { label: 'Join Teams', color: 'bg-violet-600 hover:bg-violet-700' };
    return { label: 'Join Meeting', color: 'bg-slate-700 hover:bg-slate-800' };
  }

  const myMeetings = isPM
  ? meetings
  : meetings.filter(m =>
      (m.participants || []).some((p: any) => p.userId === user?.id)
    );

const upcoming = myMeetings.filter(m => !isPast(new Date(m.scheduledAt))).sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
const past = myMeetings.filter(m => isPast(new Date(m.scheduledAt))).sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const MeetingForm = (
    <form onSubmit={editMeeting ? handleUpdate : handleCreate} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Title *</label>
        <Input placeholder="e.g. Sprint Planning" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required autoFocus />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <Textarea placeholder="Meeting agenda..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Date & Time *</label>
          <Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Sprint</label>
          <select value={form.sprintId} onChange={e => setForm(f => ({ ...f, sprintId: e.target.value }))}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">No sprint</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Meeting link */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5" /> Meeting Link
        </label>
        <Input
          placeholder="Paste Zoom, Google Meet, or Teams link..."
          value={form.meetingUrl}
          onChange={e => setForm(f => ({ ...f, meetingUrl: e.target.value }))}
          type="url"
        />
        <p className="text-xs text-slate-400">Supports Zoom, Google Meet, Microsoft Teams</p>
      </div>

      {members.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Participants</label>
          <div className="flex flex-wrap gap-2">
            {members.map(m => {
              const selected = form.participantIds.includes(m.userId);
              return (
                <button key={m.userId} type="button" onClick={() => toggleParticipant(m.userId)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}>
                  {m.user?.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditMeeting(null); resetForm(); }}>Cancel</Button>
        <Button type="submit" disabled={saving || !form.title.trim() || !form.scheduledAt}>
          {saving ? 'Saving...' : editMeeting ? 'Save' : 'Schedule'}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="h-full overflow-auto">
      <div className="border-b bg-white px-8 py-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Meetings</h2>
        {isPM && (
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" />Schedule Meeting
          </Button>
        )}
      </div>

      <div className="p-8 max-w-3xl space-y-8">
        {meetings.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No meetings scheduled</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Upcoming</h3>
                <div className="space-y-3">
                  {upcoming.map(m => (
                    <MeetingCard key={m.id} meeting={m} isPM={isPM}
                      onEdit={() => openEdit(m)} onDelete={() => handleDelete(m.id)}
                      initials={initials} getMeetingPlatform={getMeetingPlatform} />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Past</h3>
                <div className="space-y-3 opacity-60">
                  {past.map(m => (
                    <MeetingCard key={m.id} meeting={m} isPM={isPM}
                      onEdit={() => openEdit(m)} onDelete={() => handleDelete(m.id)}
                      initials={initials} getMeetingPlatform={getMeetingPlatform} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showCreate || !!editMeeting} onOpenChange={() => { setShowCreate(false); setEditMeeting(null); resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editMeeting ? 'Edit Meeting' : 'Schedule Meeting'}</DialogTitle></DialogHeader>
          {MeetingForm}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MeetingCard({ meeting, isPM, onEdit, onDelete, initials, getMeetingPlatform }: {
  meeting: Meeting; isPM: boolean;
  onEdit: () => void; onDelete: () => void;
  initials: (n: string) => string;
  getMeetingPlatform: (url: string) => { label: string; color: string };
}) {
  const meetingUrl = (meeting as any).meetingUrl;
  const platform = meetingUrl ? getMeetingPlatform(meetingUrl) : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-blue-50 flex flex-col items-center justify-center shrink-0">
        <span className="text-xs font-bold text-blue-600">{format(new Date(meeting.scheduledAt), 'MMM').toUpperCase()}</span>
        <span className="text-lg font-black text-blue-700 leading-none">{format(new Date(meeting.scheduledAt), 'd')}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900">{meeting.title}</h3>
        {meeting.description && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{meeting.description}</p>}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />{format(new Date(meeting.scheduledAt), 'h:mm a')}
          </span>
          {(meeting as any).sprint && <span className="flex items-center gap-1">⚡ {(meeting as any).sprint.name}</span>}
          {(meeting.participants || []).length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <div className="flex -space-x-1">
                {(meeting.participants || []).slice(0, 4).map(p => (
                  <Avatar key={p.id} className="h-4 w-4 border border-white">
                    <AvatarFallback className="bg-violet-400 text-white text-[8px]">{initials(p.user?.name || '')}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {(meeting.participants || []).length > 4 && <span>+{(meeting.participants || []).length - 4}</span>}
            </span>
          )}
        </div>

        {/* Join Meeting button */}
        {meetingUrl && platform && (
          <div className="mt-3">
            <a href={meetingUrl} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors ${platform.color}`}>
              <Video className="w-3.5 h-3.5" />
              {platform.label}
            </a>
          </div>
        )}
      </div>
      {isPM && (
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}