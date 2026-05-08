'use client';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react';
import { Column, Task } from '@kanban/types';
import { useBoardStore } from '@/store/board.store';
import { TaskCard } from '@/components/task/TaskCard';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { toast } from '@/hooks/use-toast';

interface KanbanColumnProps {
  column: Column;
  tasks: Task[];
  boardId: string;
  isPM: boolean;
  onTaskClick: (task: Task) => void;
  isDraggingColumn?: boolean;
}

export function KanbanColumn({ column, tasks, boardId, isPM, onTaskClick, isDraggingColumn }: KanbanColumnProps) {
  const { updateColumn, deleteColumn } = useBoardStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);

  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: { type: 'column', column },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  async function handleRename() {
    if (!editName.trim() || editName === column.name) { setEditing(false); return; }
    try { await updateColumn(boardId, column.id, editName.trim()); toast({ title: 'Column renamed', variant: 'success' }); }
    catch { toast({ title: 'Failed to rename column', variant: 'destructive' }); }
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete column "${column.name}"? Tasks will be lost.`)) return;
    try { await deleteColumn(boardId, column.id); toast({ title: 'Column deleted', variant: 'success' }); }
    catch { toast({ title: 'Failed to delete column', variant: 'destructive' }); }
    setShowMenu(false);
  }

  const columnColors: Record<string, string> = {
    'Backlog': '#64748b', 'Sprint Ready': '#3b82f6', 'In Progress': '#F5C400',
    'Review': '#8b5cf6', 'QA': '#f97316', 'Done': '#22c55e',
  };
  const dotColor = columnColors[column.name] || '#64748b';

  return (
    <div ref={setSortableRef} style={{ ...style, display: 'flex', flexDirection: 'column', width: '272px', flexShrink: 0, opacity: isDragging ? 0.4 : 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: '8px' }}
        className="group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {isPM && (
            <button {...attributes} {...listeners}
              style={{ color: '#cbd5e1', cursor: 'grab', background: 'none', border: 'none', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              title="Drag to reorder">
              <GripVertical size={14} />
            </button>
          )}
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          {editing ? (
            <input
              style={{ fontSize: '13px', fontWeight: 600, background: 'white', border: '1px solid #F5C400', borderRadius: '6px', padding: '2px 8px', color: '#0d1b35', outline: 'none', flex: 1, minWidth: 0 }}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
            />
          ) : (
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{column.name}</span>
          )}
          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, background: '#f1f5f9', borderRadius: '10px', padding: '1px 7px', flexShrink: 0 }}>{tasks.length}</span>
        </div>

        {isPM && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button onClick={() => setShowMenu(!showMenu)}
              style={{ padding: '4px', borderRadius: '6px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#cbd5e1', display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f1f5f9'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}>
              <MoreHorizontal size={15} />
            </button>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setShowMenu(false)} />
                <div style={{ position: 'absolute', right: 0, top: '28px', zIndex: 20, background: 'white', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', boxShadow: '0 6px 28px rgba(0,0,0,0.1)', overflow: 'hidden', width: '140px' }}>
                  <button onClick={() => { setEditing(true); setShowMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 14px', fontSize: '13px', color: '#334155', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f8faff')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Pencil size={12} /> Rename
                  </button>
                  <button onClick={handleDelete}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '9px 14px', fontSize: '13px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div ref={setDropRef}
        style={{ flex: 1, minHeight: '180px', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: isOver ? 'rgba(234,163,0,0.06)' : '#f1f5f9', border: isOver ? '2px dashed #F5C400' : '1px solid rgba(0,0,0,0.06)', transition: 'all 0.15s' }}>
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && !isOver && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px', color: '#cbd5e1', fontSize: '12px' }}>
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add task */}
      {isPM && (
        <button onClick={() => setShowCreate(true)}
          style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', width: '100%' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}>
          <Plus size={14} /> Add task
        </button>
      )}

      <CreateTaskModal boardId={boardId} columnId={column.id} open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}