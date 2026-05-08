import { create } from 'zustand';
import { Board, Column, Task, Sprint, Meeting, AuthUser } from '@kanban/types';
import api from '@/lib/api';

interface BoardState {
  boards: Board[];
  currentBoard: Board | null;
  columns: Column[];
  tasks: Task[];
  sprints: Sprint[];
  meetings: Meeting[];
  allUsers: AuthUser[];
  isLoading: boolean;
  error: string | null;
  onlineUsers: string[];

  fetchBoards: () => Promise<void>;
  fetchBoard: (boardId: string) => Promise<void>;
  createBoard: (name: string, description?: string) => Promise<Board>;
  updateBoard: (boardId: string, data: { name?: string; description?: string }) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  addMember: (boardId: string, userId: string) => Promise<void>;
  removeMember: (boardId: string, userId: string) => Promise<void>;
  fetchAllUsers: () => Promise<void>;

  createColumn: (boardId: string, name: string) => Promise<void>;
  updateColumn: (boardId: string, columnId: string, name: string) => Promise<void>;
  deleteColumn: (boardId: string, columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columns: { id: string; order: number }[]) => Promise<void>;

  createTask: (boardId: string, data: any) => Promise<Task>;
  updateTask: (boardId: string, taskId: string, data: any) => Promise<void>;
  deleteTask: (boardId: string, taskId: string) => Promise<void>;
  reorderTasks: (boardId: string, tasks: { id: string; order: number; columnId: string }[]) => Promise<void>;
  refreshTask: (boardId: string, taskId: string) => Promise<void>;

  fetchSprints: (boardId: string) => Promise<void>;
  createSprint: (boardId: string, data: any) => Promise<void>;
  updateSprint: (boardId: string, sprintId: string, data: any) => Promise<void>;
  deleteSprint: (boardId: string, sprintId: string) => Promise<void>;

  fetchMeetings: (boardId: string) => Promise<void>;
  createMeeting: (boardId: string, data: any) => Promise<void>;
  updateMeeting: (boardId: string, meetingId: string, data: any) => Promise<void>;
  deleteMeeting: (boardId: string, meetingId: string) => Promise<void>;

  handleTaskCreated: (task: Task) => void;
  handleTaskUpdated: (task: Task) => void;
  handleTaskDeleted: (taskId: string) => void;
  handleColumnCreated: (column: Column) => void;
  handleColumnUpdated: (column: Column) => void;
  handleColumnDeleted: (columnId: string) => void;
  handleColumnReordered: (columns: { id: string; order: number }[]) => void;
  handleCommentCreated: (taskId: string, comment: unknown) => void;
  handleSubtaskUpdated: (taskId: string, data: unknown) => void;
  handleMemberAdded: (member: unknown) => void;
  handleMemberRemoved: (userId: string) => void;
  handleSprintCreated: (sprint: Sprint) => void;
  handleSprintUpdated: (sprint: Sprint) => void;
  handleMeetingCreated: (meeting: Meeting) => void;
  handleMeetingUpdated: (meeting: Meeting) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  currentBoard: null,
  columns: [],
  tasks: [],
  sprints: [],
  meetings: [],
  allUsers: [],
  isLoading: false,
  error: null,
  onlineUsers: [],

  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get('/api/boards');
      set({ boards: res.data.data, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to fetch boards' });
    }
  },

  fetchBoard: async (boardId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/api/boards/${boardId}`);
      const board = res.data.data;
      const columns = board.columns || [];
      const tasks = columns.flatMap((c: any) => c.tasks || []);
      set({ currentBoard: board, columns, tasks, isLoading: false });
    } catch {
      set({ isLoading: false, error: 'Failed to fetch board' });
    }
  },

  createBoard: async (name, description) => {
    const res = await api.post('/api/boards', { name, description });
    const board = res.data.data;
    set((s) => ({ boards: [board, ...s.boards] }));
    return board;
  },

  updateBoard: async (boardId, data) => {
    const res = await api.patch(`/api/boards/${boardId}`, data);
    const updated = res.data.data;
    set((s) => ({
      boards: s.boards.map((b) => (b.id === boardId ? updated : b)),
      currentBoard: s.currentBoard?.id === boardId ? updated : s.currentBoard,
    }));
  },

  deleteBoard: async (boardId) => {
    await api.delete(`/api/boards/${boardId}`);
    set((s) => ({ boards: s.boards.filter((b) => b.id !== boardId) }));
  },

  addMember: async (boardId, userId) => {
    await api.post(`/api/boards/${boardId}/members`, { userId });
  },

  removeMember: async (boardId, userId) => {
    await api.delete(`/api/boards/${boardId}/members/${userId}`);
  },

  fetchAllUsers: async () => {
    const res = await api.get('/api/auth/users');
    set({ allUsers: res.data.data });
  },

  createColumn: async (boardId, name) => {
    const res = await api.post(`/api/boards/${boardId}/columns`, { name });
    const column = res.data.data;
    set((s) => ({
      columns: [...s.columns, column].sort((a, b) => a.order - b.order),
    }));
  },

  updateColumn: async (boardId, columnId, name) => {
    const res = await api.patch(`/api/boards/${boardId}/columns/${columnId}`, { name });
    const updated = res.data.data;
    set((s) => ({
      columns: s.columns.map((c) => (c.id === columnId ? { ...c, name: updated.name } : c)),
    }));
  },

  deleteColumn: async (boardId, columnId) => {
    await api.delete(`/api/boards/${boardId}/columns/${columnId}`);
    set((s) => ({
      columns: s.columns.filter((c) => c.id !== columnId),
      tasks: s.tasks.filter((t) => t.columnId !== columnId),
    }));
  },

  reorderColumns: async (boardId, columns) => {
    set((s) => ({
      columns: s.columns
        .map((c) => {
          const u = columns.find((uc) => uc.id === c.id);
          return u ? { ...c, order: u.order } : c;
        })
        .sort((a, b) => a.order - b.order),
    }));
    await api.put(`/api/boards/${boardId}/columns/reorder`, { columns });
  },

  createTask: async (boardId, data) => {
    const res = await api.post(`/api/boards/${boardId}/tasks`, data);
    const task = res.data.data;
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  updateTask: async (boardId, taskId, data) => {
    const res = await api.patch(`/api/boards/${boardId}/tasks/${taskId}`, data);
    const updated = res.data.data;
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
    }));
    try {
      const fresh = await api.get(`/api/boards/${boardId}/tasks/${taskId}`);
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? fresh.data.data : t)),
      }));
    } catch {}
  },

  deleteTask: async (boardId, taskId) => {
    await api.delete(`/api/boards/${boardId}/tasks/${taskId}`);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  reorderTasks: async (boardId, tasks) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        const updated = tasks.find((u) => u.id === t.id);
        return updated ? { ...t, order: updated.order, columnId: updated.columnId } : t;
      }),
    }));
    await api.put(`/api/boards/${boardId}/tasks/reorder`, { tasks });
  },

  refreshTask: async (boardId, taskId) => {
    try {
      const res = await api.get(`/api/boards/${boardId}/tasks/${taskId}`);
      const updated = res.data.data;
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === taskId ? updated : t)),
      }));
    } catch {}
  },

  fetchSprints: async (boardId) => {
    const res = await api.get(`/api/boards/${boardId}/sprints`);
    set({ sprints: res.data.data });
  },

  createSprint: async (boardId, data) => {
    await api.post(`/api/boards/${boardId}/sprints`, data);
  },

  updateSprint: async (boardId, sprintId, data) => {
    const res = await api.patch(`/api/boards/${boardId}/sprints/${sprintId}`, data);
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === sprintId ? res.data.data : sp)) }));
  },

  deleteSprint: async (boardId, sprintId) => {
    await api.delete(`/api/boards/${boardId}/sprints/${sprintId}`);
    set((s) => ({ sprints: s.sprints.filter((sp) => sp.id !== sprintId) }));
  },

  fetchMeetings: async (boardId) => {
    const res = await api.get(`/api/boards/${boardId}/meetings`);
    set({ meetings: res.data.data });
  },

  createMeeting: async (boardId, data) => {
    await api.post(`/api/boards/${boardId}/meetings`, data);
  },

  updateMeeting: async (boardId, meetingId, data) => {
    const res = await api.patch(`/api/boards/${boardId}/meetings/${meetingId}`, data);
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === meetingId ? res.data.data : m)) }));
  },

  deleteMeeting: async (boardId, meetingId) => {
    await api.delete(`/api/boards/${boardId}/meetings/${meetingId}`);
    set((s) => ({ meetings: s.meetings.filter((m) => m.id !== meetingId) }));
  },

  // ─── Real-time socket handlers ────────────────────────────────────────────

  handleTaskCreated: (task) => {
    set((s) => {
      const exists = s.tasks.find((t) => t.id === task.id);
      if (exists) return s;
      return { tasks: [...s.tasks, task] };
    });
  },

  handleTaskUpdated: (task) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === task.id ? task : t)) }));
  },

  handleTaskDeleted: (taskId) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== taskId) }));
  },

  handleColumnCreated: (column) => {
    set((s) => {
      const exists = s.columns.find((c) => c.id === column.id);
      if (exists) return s;
      return { columns: [...s.columns, column].sort((a, b) => a.order - b.order) };
    });
  },

  handleColumnUpdated: (column) => {
    set((s) => ({ columns: s.columns.map((c) => (c.id === column.id ? { ...c, ...column } : c)) }));
  },

  handleColumnDeleted: (columnId) => {
    set((s) => ({ columns: s.columns.filter((c) => c.id !== columnId) }));
  },

  handleColumnReordered: (updates) => {
    set((s) => ({
      columns: s.columns
        .map((c) => {
          const u = updates.find((u) => u.id === c.id);
          return u ? { ...c, order: u.order } : c;
        })
        .sort((a, b) => a.order - b.order),
    }));
  },

  handleCommentCreated: (taskId, comment) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const comments = t.comments || [];
        const exists = comments.find((c: any) => c.id === (comment as any).id);
        if (exists) return t;
        return { ...t, comments: [...comments, comment as any] };
      }),
    }));
  },

  handleSubtaskUpdated: (taskId, data: any) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        if (data.deleted) {
          return { ...t, subtasks: (t.subtasks || []).filter((st) => st.id !== data.subtaskId) };
        }
        const subtask = data.subtask;
        if (!subtask) return t;
        const exists = (t.subtasks || []).find((st) => st.id === subtask.id);
        return {
          ...t,
          subtasks: exists
            ? (t.subtasks || []).map((st) => (st.id === subtask.id ? subtask : st))
            : [...(t.subtasks || []), subtask],
        };
      }),
    }));
  },

  handleMemberAdded: (member: any) => {
    set((s) => ({
      currentBoard: s.currentBoard
        ? {
            ...s.currentBoard,
            members: [...(s.currentBoard.members || []).filter((m) => m.userId !== member.userId), member],
          }
        : s.currentBoard,
    }));
  },

  handleMemberRemoved: (userId) => {
    set((s) => ({
      currentBoard: s.currentBoard
        ? { ...s.currentBoard, members: (s.currentBoard.members || []).filter((m) => m.userId !== userId) }
        : s.currentBoard,
    }));
  },

  handleSprintCreated: (sprint) => {
    set((s) => {
      const exists = s.sprints.find((sp) => sp.id === sprint.id);
      if (exists) return s;
      return { sprints: [sprint, ...s.sprints] };
    });
  },

  handleSprintUpdated: (sprint) => {
    set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === sprint.id ? sprint : sp)) }));
  },

  handleMeetingCreated: (meeting) => {
    set((s) => {
      const exists = s.meetings.find((m) => m.id === meeting.id);
      if (exists) return s;
      return { meetings: [...s.meetings, meeting] };
    });
  },

  handleMeetingUpdated: (meeting) => {
    set((s) => ({ meetings: s.meetings.map((m) => (m.id === meeting.id ? meeting : m)) }));
  },
}));