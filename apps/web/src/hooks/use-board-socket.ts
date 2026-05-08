'use client';
import { useEffect, useRef } from 'react';
import { connectSocket } from '@/lib/socket';
import { useBoardStore } from '@/store/board.store';

export function useBoardSocket(boardId: string | null) {
  const joinedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!boardId) return;

    const socket = connectSocket();

    function joinBoard() {
      socket.emit('join:board', boardId);
      joinedRef.current = boardId;
    }

    const onConnect = () => { joinBoard(); };
    if (socket.connected) joinBoard();
    socket.on('connect', onConnect);

    const get = () => useBoardStore.getState();
    const getMyId = () => {
      try { return JSON.parse(localStorage.getItem('kanban_user') || '{}')?.id; }
      catch { return null; }
    };

    // ─── Presence ────────────────────────────────────────────────────────────
    socket.on('presence:update', ({ onlineUsers }: { onlineUsers: string[] }) => {
      useBoardStore.setState({ onlineUsers });
    });

    // ─── Tasks ───────────────────────────────────────────────────────────────
    socket.on('task:created', ({ data }) => { get().handleTaskCreated(data); });

    socket.on('task:updated', ({ data, actorId }) => {
      get().handleTaskUpdated(data);
      const myId = getMyId();
      if (actorId && actorId !== myId) {
        setTimeout(() => get().refreshTask(boardId, data.id), 300);
      }
    });

    socket.on('task:deleted', ({ data }) => { get().handleTaskDeleted(data.taskId); });

    socket.on('task:moved', ({ data }) => {
      data.forEach((t: any) => get().handleTaskUpdated({ ...t }));
    });

    // ─── Columns ─────────────────────────────────────────────────────────────
    socket.on('column:created', ({ data }) => get().handleColumnCreated(data));
    socket.on('column:updated', ({ data }) => get().handleColumnUpdated(data));
    socket.on('column:deleted', ({ data }) => get().handleColumnDeleted(data.columnId));
    socket.on('column:reordered', ({ data }) => get().handleColumnReordered(data));

    // ─── Comments ────────────────────────────────────────────────────────────
    socket.on('comment:created', ({ data }) => {
      get().handleCommentCreated(data.taskId, data.comment);
      setTimeout(() => get().refreshTask(boardId, data.taskId), 200);
    });

    socket.on('comment:updated', ({ data }) => {
      useBoardStore.setState(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== data.taskId) return t;
          return { ...t, comments: (t.comments || []).map((c: any) => c.id === data.comment.id ? data.comment : c) };
        }),
      }));
    });

    socket.on('comment:deleted', ({ data }) => {
      useBoardStore.setState(s => ({
        tasks: s.tasks.map(t => {
          if (t.id !== data.taskId) return t;
          return { ...t, comments: (t.comments || []).filter((c: any) => c.id !== data.commentId) };
        }),
      }));
    });

    // ─── Subtasks ────────────────────────────────────────────────────────────
    socket.on('subtask:updated', ({ data }) => {
      get().handleSubtaskUpdated(data.taskId, data);
      setTimeout(() => get().refreshTask(boardId, data.taskId), 200);
    });

    // ─── Members ─────────────────────────────────────────────────────────────
    socket.on('member:added', ({ data }) => get().handleMemberAdded(data));
    socket.on('member:removed', ({ data }) => get().handleMemberRemoved(data.userId));

    // ─── Sprints & Meetings ───────────────────────────────────────────────────
    socket.on('sprint:created', ({ data }) => get().handleSprintCreated(data));
    socket.on('sprint:updated', ({ data }) => get().handleSprintUpdated(data));
    socket.on('meeting:created', ({ data }) => get().handleMeetingCreated(data));
    socket.on('meeting:updated', ({ data }) => get().handleMeetingUpdated(data));

    return () => {
      socket.off('connect', onConnect);
      [
        'presence:update',
        'task:created', 'task:updated', 'task:deleted', 'task:moved',
        'column:created', 'column:updated', 'column:deleted', 'column:reordered',
        'comment:created', 'comment:updated', 'comment:deleted',
        'subtask:updated', 'member:added', 'member:removed',
        'sprint:created', 'sprint:updated', 'meeting:created', 'meeting:updated',
      ].forEach(e => socket.off(e));

      if (joinedRef.current) {
        socket.emit('leave:board', joinedRef.current);
        joinedRef.current = null;
      }
      // Clear presence on leave
      useBoardStore.setState({ onlineUsers: [] });
    };
  }, [boardId]);
}