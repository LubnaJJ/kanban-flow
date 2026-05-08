// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = 'PM' | 'ENGINEER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Board ────────────────────────────────────────────────────────────────────

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner?: AuthUser;
  members?: BoardMember[];
  columns?: Column[];
  sprints?: Sprint[];
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  user?: AuthUser;
  joinedAt: string;
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
}

// ─── Column ───────────────────────────────────────────────────────────────────

export interface Column {
  id: string;
  name: string;
  order: number;
  boardId: string;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateColumnRequest {
  name: string;
  boardId: string;
}

export interface UpdateColumnRequest {
  name?: string;
  order?: number;
}

export interface ReorderColumnsRequest {
  columns: { id: string; order: number }[];
}

// ─── Sprint ───────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  name: string;
  boardId: string;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSprintRequest {
  name: string;
  boardId: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintRequest {
  name?: string;
  status?: SprintStatus;
  startDate?: string;
  endDate?: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority: Priority;
  dueDate?: string | null;
  storyPoints?: number | null;
  labels: string[];
  columnId: string;
  boardId: string;
  sprintId?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  assignees?: TaskAssignee[];
  subtasks?: Subtask[];
  comments?: Comment[];
  activityLogs?: ActivityLog[];
  column?: Column;
  sprint?: Sprint;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  userId: string;
  user?: AuthUser;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  storyPoints?: number;
  labels?: string[];
  columnId: string;
  boardId: string;
  sprintId?: string;
  assigneeIds?: string[];
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  storyPoints?: number;
  labels?: string[];
  columnId?: string;
  sprintId?: string;
  assigneeIds?: string[];
  order?: number;
}

export interface MoveTaskRequest {
  columnId: string;
  order: number;
  sprintId?: string | null;
}

export interface ReorderTasksRequest {
  tasks: { id: string; order: number; columnId: string }[];
}

// ─── Subtask ──────────────────────────────────────────────────────────────────

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  taskId: string;
  assigneeId?: string | null;
  assignee?: AuthUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubtaskRequest {
  title: string;
  assigneeId?: string;
}

export interface UpdateSubtaskRequest {
  title?: string;
  completed?: boolean;
  assigneeId?: string | null;
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author?: AuthUser;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  action: string;
  taskId: string;
  userId: string;
  user?: AuthUser;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Meeting ──────────────────────────────────────────────────────────────────

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: string;
  boardId: string;
  sprintId?: string | null;
  organizerId: string;
  organizer?: AuthUser;
  participants?: MeetingParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  user?: AuthUser;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  scheduledAt: string;
  boardId: string;
  sprintId?: string;
  participantIds?: string[];
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  scheduledAt?: string;
  sprintId?: string;
  participantIds?: string[];
}

// ─── Real-time Events ─────────────────────────────────────────────────────────

export type SocketEvent =
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:moved'
  | 'column:created'
  | 'column:updated'
  | 'column:deleted'
  | 'column:reordered'
  | 'sprint:created'
  | 'sprint:updated'
  | 'comment:created'
  | 'comment:updated'
  | 'comment:deleted'
  | 'subtask:updated'
  | 'member:added'
  | 'member:removed'
  | 'meeting:created'
  | 'meeting:updated';

export interface SocketPayload<T = unknown> {
  event: SocketEvent;
  boardId: string;
  data: T;
  actorId: string;
}

// ─── API Response wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
