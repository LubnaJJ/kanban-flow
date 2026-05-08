'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MessageSquare, CheckSquare } from 'lucide-react';
import { Task } from '@kanban/types';
import { PriorityBadge } from './PriorityBadge';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, onClick, isDragOverlay }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task', task },
  });

  const completedSubtasks = (task.subtasks || []).filter(s => s.completed).length;
  const totalSubtasks = (task.subtasks || []).length;
  const commentCount = (task.comments || []).length || (task as any)._count?.comments || 0;

  function initials(name: string) { return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && (task as any).column?.name !== 'Done';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragOverlay ? 'none' : transition,
        background: 'white',
        border: `1px solid ${isDragOverlay ? '#F5C400' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: '10px',
        opacity: isDragging ? 0.4 : 1,
        boxShadow: isDragOverlay
          ? '0 20px 40px rgba(0,0,0,0.15), 0 0 0 2px #F5C400'
          : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      {...attributes}
      {...listeners}
      onMouseEnter={e => {
        if (!isDragging && !isDragOverlay) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(245,196,0,0.4)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        }
      }}
      onMouseLeave={e => {
        if (!isDragging && !isDragOverlay) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        }
      }}
    >
      <div style={{ padding: '10px 12px' }}>
        {/* Click to open modal — stops drag event from triggering modal */}
        <div
          onClick={e => { e.stopPropagation(); onClick(); }}
          style={{ cursor: 'pointer' }}
        >
          {(task.labels || []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
              {task.labels.map(label => (
                <span key={label} style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'rgba(245,196,0,0.08)', color: '#c98500', border: '1px solid rgba(245,196,0,0.2)' }}>
                  {label}
                </span>
              ))}
            </div>
          )}

          <p style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.4 }}>
            {task.title}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', marginBottom: '6px' }}>
            <PriorityBadge priority={task.priority} />
            {task.storyPoints != null && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '5px', padding: '1px 6px' }}>
                {task.storyPoints}pt
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {commentCount > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: '#94a3b8' }}>
                  <MessageSquare size={11} />{commentCount}
                </span>
              )}
              {totalSubtasks > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: completedSubtasks === totalSubtasks ? '#16a34a' : '#94a3b8' }}>
                  <CheckSquare size={11} />{completedSubtasks}/{totalSubtasks}
                </span>
              )}
              {task.dueDate && (
                <span style={{ fontSize: '11px', color: isOverdue ? '#ef4444' : '#94a3b8', fontWeight: isOverdue ? 600 : 400 }}>
                  {format(new Date(task.dueDate), 'MMM d')}
                </span>
              )}
            </div>

            {(task.assignees || []).length > 0 && (
              <div style={{ display: 'flex' }}>
                {(task.assignees || []).slice(0, 3).map((a: any) => (
                  <div key={a.id} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg,#F5C400,#e6b800)', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#060e1c', fontSize: '8px', fontWeight: 800, marginLeft: '-4px' }}>
                    {initials(a.user?.name || '')}
                  </div>
                ))}
                {(task.assignees || []).length > 3 && (
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '8px', fontWeight: 700, marginLeft: '-4px' }}>
                    +{(task.assignees || []).length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}