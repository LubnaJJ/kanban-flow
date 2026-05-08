'use client';
import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  DragOverlay, PointerSensor, useSensor, useSensors, closestCorners,
  MeasuringStrategy,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Loader2, Search, X, Filter } from 'lucide-react';
import { useBoardStore } from '@/store/board.store';
import { useAuthStore } from '@/store/auth.store';
import { KanbanColumn } from '@/components/board/KanbanColumn';
import { TaskCard } from '@/components/task/TaskCard';
import { TaskModal } from '@/components/task/TaskModal';
import { Task, Column } from '@kanban/types';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/use-theme';
import api from '@/lib/api';

type DragType = 'task' | 'column' | null;
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { user } = useAuthStore();
  const { columns, tasks, createColumn, reorderColumns, isLoading, currentBoard } = useBoardStore();
  const { t } = useTheme();
  const isPM = user?.role === 'PM';

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [dragType, setDragType] = useState<DragType>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [localColumns, setLocalColumns] = useState<Column[]>([]);

  // Search & filter state
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | ''>('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const displayTasks = dragType === 'task' ? localTasks : tasks;
  const displayColumns = dragType === 'column' ? localColumns : columns;

  // All unique assignees for filter dropdown
  const allAssignees = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(task => {
      (task.assignees || []).forEach((a: any) => {
        const id = a.userId || a.user?.id;
        const name = a.user?.name;
        if (id && name) map.set(id, name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  // Apply search and filters
  function filterTasks(allTasks: Task[]): Task[] {
    return allTasks.filter(task => {
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchLabel = (task.labels || []).some(l => l.toLowerCase().includes(q));
        const matchAssignee = (task.assignees || []).some((a: any) => a.user?.name?.toLowerCase().includes(q));
        if (!matchTitle && !matchLabel && !matchAssignee) return false;
      }
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterAssignee) {
        const hasAssignee = (task.assignees || []).some((a: any) =>
          (a.userId || a.user?.id) === filterAssignee
        );
        if (!hasAssignee) return false;
      }
      return true;
    });
  }

  function getColumnTasks(allTasks: Task[], columnId: string) {
    let filtered = allTasks.filter(t => {
      if (t.columnId !== columnId) return false;
      if (isPM) return true;
      return (t.assignees || []).some(
        (a: any) => a.userId === user?.id || a.user?.id === user?.id
      );
    });
    filtered = filterTasks(filtered);
    return filtered.sort((a, b) => a.order - b.order);
  }

  const hasActiveFilters = search || filterPriority || filterAssignee;
  const filteredTaskCount = filterTasks(tasks).length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type;
    if (type === 'column') {
      const col = columns.find(c => c.id === event.active.id);
      if (col) { setActiveColumn(col); setDragType('column'); setLocalColumns([...columns]); }
    } else {
      const task = tasks.find(t => t.id === event.active.id);
      if (task) { setActiveTask(task); setDragType('task'); setLocalTasks([...tasks]); }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    if (dragType === 'column') {
      const activeId = active.id as string;
      const overId = over.id as string;
      if (activeId === overId || over.data.current?.type !== 'column') return;
      setLocalColumns(prev => {
        const ai = prev.findIndex(c => c.id === activeId);
        const oi = prev.findIndex(c => c.id === overId);
        if (ai === -1 || oi === -1) return prev;
        return arrayMove(prev, ai, oi);
      });
      return;
    }

    if (dragType === 'task') {
      const activeId = active.id as string;
      const overId = over.id as string;
      const activeTaskData = active.data.current?.task as Task;
      if (!activeTaskData) return;

      const overIsColumn = over.data.current?.type === 'column';
      const overTask = over.data.current?.task as Task | undefined;
      const targetColumnId = overIsColumn ? overId : overTask?.columnId;
      if (!targetColumnId) return;

      setLocalTasks(prev => {
        const activeIndex = prev.findIndex(t => t.id === activeId);
        if (activeIndex === -1) return prev;
        const newTasks = [...prev];
        newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: targetColumnId };
        if (!overIsColumn) {
          const overIndex = prev.findIndex(t => t.id === overId);
          if (overIndex !== -1) return arrayMove(newTasks, activeIndex, overIndex);
        }
        return newTasks;
      });
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (dragType === 'column') {
      setActiveColumn(null);
      setDragType(null);
      if (!over || active.id === over.id) { setLocalColumns([]); return; }
      const reordered = localColumns.map((col, index) => ({ id: col.id, order: index }));
      try { await reorderColumns(boardId, reordered); }
      catch { toast({ title: 'Failed to reorder columns', variant: 'destructive' }); }
      setLocalColumns([]);
      return;
    }

    setActiveTask(null);
    setDragType(null);
    if (!over) { setLocalTasks([]); return; }

    const snapshot = [...localTasks];

    const columnGroups: Record<string, Task[]> = {};
    snapshot.forEach(t => {
      if (!columnGroups[t.columnId]) columnGroups[t.columnId] = [];
      columnGroups[t.columnId].push(t);
    });

    const reordered = Object.entries(columnGroups).flatMap(([colId, colTasks]) =>
      colTasks.map((t, index) => ({ id: t.id, order: index, columnId: colId }))
    );

    useBoardStore.setState(s => ({
      tasks: s.tasks.map(t => {
        const updated = reordered.find(r => r.id === t.id);
        return updated ? { ...t, order: updated.order, columnId: updated.columnId } : t;
      }),
    }));

    setLocalTasks([]);

    try {
      await api.put(`/api/boards/${boardId}/tasks/reorder`, { tasks: reordered });
      await new Promise(r => setTimeout(r, 300));
      const res = await api.get(`/api/boards/${boardId}/tasks`);
      if (res.data.data) {
        useBoardStore.setState({ tasks: res.data.data });
      }
    } catch {
      toast({ title: 'Failed to save order', variant: 'destructive' });
      useBoardStore.setState({ tasks: snapshot });
    }
  }

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColName.trim()) return;
    try {
      await createColumn(boardId, newColName.trim());
      setNewColName(''); setAddingCol(false);
      toast({ title: 'Column added', variant: 'success' });
    } catch { toast({ title: 'Failed to add column', variant: 'destructive' }); }
  }

  if (isLoading && columns.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: t.bg }}>
        <Loader2 size={24} style={{ color: t.gold, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: t.bg }}>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .ks { overflow-x: auto; scrollbar-width: thin; scrollbar-color: ${t.border} transparent; }
        .ks::-webkit-scrollbar { height: 6px; }
        .ks::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 3px; }
        .filter-select { height: 34px; border-radius: 8px; padding: 0 10px; font-size: 12px; border: 1px solid ${t.border}; background: ${t.surface}; color: ${t.text}; outline: none; cursor: pointer; }
        .filter-select:focus { border-color: #F5C400; }
      `}</style>

      {/* Search & Filter Bar */}
      <div style={{ background: t.headerBg, borderBottom: `1px solid ${t.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: t.textFaint, pointerEvents: 'none' }} />
          <input
            placeholder="Search tasks, labels, assignees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: '34px', borderRadius: '8px', padding: '0 32px 0 32px', fontSize: '13px', background: t.inputBg, border: `1px solid ${t.border}`, color: t.inputText, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
            onFocus={e => (e.target.style.borderColor = '#F5C400')}
            onBlur={e => (e.target.style.borderColor = t.border)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: t.textFaint, display: 'flex', alignItems: 'center', padding: '2px' }}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ height: '34px', padding: '0 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: showFilters ? t.goldBg : 'transparent', border: `1px solid ${showFilters ? t.goldBorder : t.border}`, color: showFilters ? t.gold : t.textMuted }}
        >
          <Filter size={13} /> Filters {hasActiveFilters && <span style={{ background: t.gold, color: '#060e1c', borderRadius: '10px', padding: '0 6px', fontSize: '10px', fontWeight: 800 }}>ON</span>}
        </button>

        {/* Filter dropdowns */}
        {showFilters && (
          <>
            <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | '')}>
              <option value="">All priorities</option>
              <option value="CRITICAL">🔴 Critical</option>
              <option value="HIGH">🟠 High</option>
              <option value="MEDIUM">🟡 Medium</option>
              <option value="LOW">🟢 Low</option>
            </select>

            {allAssignees.length > 0 && (
              <select className="filter-select" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
                <option value="">All assignees</option>
                {allAssignees.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(''); setFilterPriority(''); setFilterAssignee(''); }}
                style={{ height: '34px', padding: '0 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
              >
                Clear all
              </button>
            )}
          </>
        )}

        {/* Results count when filtering */}
        {hasActiveFilters && (
          <span style={{ fontSize: '12px', color: t.textMuted, marginLeft: 'auto' }}>
            {filteredTaskCount} task{filteredTaskCount !== 1 ? 's' : ''} found
          </span>
        )}

        {/* Presence indicators */}
        <PresenceIndicators boardId={boardId} currentUserId={user?.id || ''} members={currentBoard?.members || []} t={t} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      >
        <div className="ks" style={{ flex: 1, overflowY: 'hidden' }}>
          <div style={{ display: 'flex', gap: '16px', padding: '24px', minWidth: 'max-content', alignItems: 'flex-start' }}>
            <SortableContext items={displayColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
              {displayColumns.map(column => {
                const columnTasks = getColumnTasks(displayTasks, column.id);
                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    boardId={boardId}
                    isPM={isPM}
                    onTaskClick={setSelectedTask}
                    isDraggingColumn={activeColumn?.id === column.id}
                  />
                );
              })}
            </SortableContext>

            {isPM && (
              <div style={{ width: '272px', flexShrink: 0 }}>
                {addingCol ? (
                  <form onSubmit={handleAddColumn} style={{ background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input placeholder="Column name..." value={newColName} onChange={e => setNewColName(e.target.value)} autoFocus
                      style={{ height: '38px', borderRadius: '8px', padding: '0 12px', fontSize: '13px', background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText, outline: 'none' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" disabled={!newColName.trim()} style={{ flex: 1, height: '34px', borderRadius: '8px', background: 'linear-gradient(135deg,#F5C400,#e6b800)', color: '#060e1c', fontWeight: 700, fontSize: '12px', border: 'none', cursor: 'pointer' }}>Add</button>
                      <button type="button" onClick={() => { setAddingCol(false); setNewColName(''); }} style={{ flex: 1, height: '34px', borderRadius: '8px', background: 'transparent', border: `1px solid ${t.border}`, color: t.textMuted, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setAddingCol(true)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', border: `2px dashed ${t.goldBorder}`, background: t.goldBg, color: t.gold, fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = t.gold)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = t.goldBorder)}>
                    <Plus size={16} /> Add column
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask && <TaskCard task={activeTask} onClick={() => {}} isDragOverlay />}
          {activeColumn && (
            <div style={{ width: '272px', background: t.surface, border: `2px solid ${t.gold}`, borderRadius: '12px', padding: '12px', opacity: 0.9, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.gold }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: t.text }}>{activeColumn.name}</span>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedTask && (
        <TaskModal task={selectedTask} boardId={boardId} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  );
}

// ─── Presence Indicators Component ───────────────────────────────────────────
function PresenceIndicators({ boardId, currentUserId, members, t }: {
  boardId: string; currentUserId: string; members: any[]; t: any;
}) {
  const { onlineUsers } = useBoardStore();
  const online = (onlineUsers || []).filter((id: string) => id !== currentUserId);
  if (online.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
      <span style={{ fontSize: '11px', color: t.textFaint }}>Online:</span>
      <div style={{ display: 'flex', gap: '-4px' }}>
        {online.slice(0, 5).map((userId: string) => {
          const member = members.find(m => m.userId === userId);
          const name = member?.user?.name || 'User';
          const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
          return (
            <div key={userId} title={`${name} is viewing`} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5C400,#e6b800)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060e1c', fontSize: '10px', fontWeight: 800, marginLeft: '-4px', position: 'relative' }}>
              {initials}
              <div style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', border: '1.5px solid white' }} />
            </div>
          );
        })}
        {online.length > 5 && (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: t.surfaceAlt, border: `2px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted, fontSize: '10px', fontWeight: 700, marginLeft: '-4px' }}>
            +{online.length - 5}
          </div>
        )}
      </div>
    </div>
  );
}