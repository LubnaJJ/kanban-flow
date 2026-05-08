# KanbanFlow — Real-Time Collaborative Project Management

**Submitted by:** Lubna Jiffry  
**Assessment:** OuterSpace Digital — Practical Assessment  
**Stack:** Next.js 14 · Fastify · PostgreSQL · Prisma · Socket.io · Zustand · dnd-kit

---

## Live Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Project Manager | lubna@outerspace.dev | 123456 |
| Engineer | atheek@outerspace.dev | password123 |
| Engineer | sarah@outerspace.dev | password123 |
| Engineer | ahmad@outerspace.dev | password123 |

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL running locally
- pnpm installed (`npm install -g pnpm`)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/kanban-flow.git
cd kanban-flow
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Configure environment variables

Create `apps/api/.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kanban_db"
JWT_SECRET="super-secret-jwt-key"
FRONTEND_URL="http://localhost:3000"
PORT=4000
```

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 4. Set up the database
```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed
cd ../..
```

### 5. Start the application
```bash
pnpm dev
```

- Frontend runs at: http://localhost:3000  
- Backend API runs at: http://localhost:4000  
- Prisma Studio (DB viewer): `cd apps/api && npx prisma studio`

---

## Architecture & Design

### Monorepo Structure
```
kanban-flow/
├── apps/
│   ├── api/                    # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/         # auth, boards, columns, tasks, extras
│   │   │   ├── middleware/     # authenticate, requireBoardMember
│   │   │   ├── lib/            # prisma client, activity logger
│   │   │   └── index.ts        # server entry + Socket.io setup
│   │   └── prisma/
│   │       ├── schema.prisma   # full data model
│   │       ├── migrations/     # full migration history
│   │       └── seed.ts         # demo data
│   └── web/                    # Next.js 14 frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # UI components
│           ├── store/          # Zustand state management
│           ├── hooks/          # useTheme, useBoardSocket, useAuth
│           └── lib/            # axios client, socket singleton
└── packages/
    └── types/                  # shared TypeScript types
```

### Tech Stack Decisions

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) | Server components, file-based routing, production ready |
| UI State | Zustand | Lightweight, no boilerplate, works great with real-time updates |
| Drag & Drop | dnd-kit | Accessible, performant, supports sortable lists and columns |
| Backend | Fastify | Faster than Express, built-in TypeScript support, plugin system |
| Database | PostgreSQL | Relational structure fits the board/task hierarchy perfectly |
| ORM | Prisma | Type-safe queries, auto-generated types, clean migration system |
| Real-time | Socket.io | Reliable WebSocket with polling fallback, room-based broadcasting |
| Auth | JWT | Stateless authentication, works for both REST and WebSocket |

### Data Model
```
User → BoardMember → Board → Column → Task → Subtask
                                    → Comment
                                    → ActivityLog
                                    → TaskAssignee → User
Board → Sprint → Task
Board → Meeting → MeetingParticipant → User
```

### API Design

All endpoints follow RESTful conventions and are protected by two middleware layers:

1. `authenticate` — verifies the JWT token and attaches user to request
2. `requireBoardMember` — verifies the user is a member of the requested board

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/users

GET    /api/boards
POST   /api/boards
GET    /api/boards/:boardId
PATCH  /api/boards/:boardId
DELETE /api/boards/:boardId
POST   /api/boards/:boardId/members
DELETE /api/boards/:boardId/members/:userId

POST   /api/boards/:boardId/columns
PATCH  /api/boards/:boardId/columns/:columnId
DELETE /api/boards/:boardId/columns/:columnId
PUT    /api/boards/:boardId/columns/reorder

GET    /api/boards/:boardId/tasks
POST   /api/boards/:boardId/tasks
GET    /api/boards/:boardId/tasks/:taskId
PATCH  /api/boards/:boardId/tasks/:taskId
DELETE /api/boards/:boardId/tasks/:taskId
PUT    /api/boards/:boardId/tasks/reorder

POST   /api/boards/:boardId/tasks/:taskId/subtasks
PATCH  /api/boards/:boardId/tasks/:taskId/subtasks/:subtaskId
DELETE /api/boards/:boardId/tasks/:taskId/subtasks/:subtaskId

POST   /api/boards/:boardId/tasks/:taskId/comments
PATCH  /api/boards/:boardId/tasks/:taskId/comments/:commentId
DELETE /api/boards/:boardId/tasks/:taskId/comments/:commentId

GET    /api/boards/:boardId/sprints
POST   /api/boards/:boardId/sprints
PATCH  /api/boards/:boardId/sprints/:sprintId
DELETE /api/boards/:boardId/sprints/:sprintId

GET    /api/boards/:boardId/meetings
POST   /api/boards/:boardId/meetings
PATCH  /api/boards/:boardId/meetings/:meetingId
DELETE /api/boards/:boardId/meetings/:meetingId
```

### Real-Time Architecture
```
Client performs action
  → REST API call persists change to PostgreSQL
  → Backend emits Socket.io event to board room
  → All clients in that room receive the event
  → Zustand store updates instantly via event handler
  → React re-renders only affected components
```

Socket.io events used:
- `task:created` `task:updated` `task:deleted`
- `column:created` `column:updated` `column:deleted` `column:reordered`
- `comment:created` `comment:updated` `comment:deleted`
- `subtask:updated`
- `member:added` `member:removed`
- `sprint:created` `sprint:updated`
- `meeting:created` `meeting:updated`
- `presence:update`

### Role-Based Access Control

**PM:**
- Full CRUD on boards, columns, tasks, sprints, meetings
- Add and remove team members
- Assign tasks to engineers
- Sees all tasks on their boards

**Engineer:**
- Views only boards they are members of
- Views only tasks assigned to them
- Can drag tasks between columns to update status
- Can add comments and complete subtasks
- Can view sprint and meeting schedules

---

## Bonus Features Implemented

| Feature | Details |
|---------|---------|
| Search & Filtering | Real-time search by title, label, assignee — plus priority filter dropdown |
| Presence Indicators | Live avatars with green dot showing who is currently viewing the board |
| Burndown / Progress Charts | Sprint completion ring + task distribution bar chart by column |
| Meeting Links | Zoom, Google Meet, and Teams URL support with platform-specific Join button |

---

## Key Assumptions & Tradeoffs

**Authentication**  
JWT stored in localStorage for simplicity. In production I would use httpOnly cookies to prevent XSS attacks.

**Real-time sync strategy**  
Optimistic UI updates are applied immediately to give instant feedback, then the server confirms and the store is refreshed. If the server call fails, the state reverts to the previous snapshot.

**Role model**  
Kept to two roles (PM and Engineer) as specified. The middleware is designed to be extensible if more granular permissions are needed in future.

**Database IDs**  
Used `cuid()` for all primary keys — collision-resistant, URL-safe, and sortable by creation time without a separate `createdAt` index needed for ordering.

**Activity logs**  
Logs are append-only. Fetches return the latest 20 entries per task to keep response payload sizes manageable while still showing meaningful history.

**Monorepo with shared types**  
The `packages/types` package is shared between frontend and backend. Any schema change immediately surfaces as a TypeScript compiler error in both apps, preventing drift.

**Socket.io transport**  
Configured `websocket` first with `polling` as fallback. This ensures compatibility across corporate proxies and restrictive network environments.

**File attachments not implemented**  
Excluded because it requires cloud storage infrastructure (AWS S3 or similar) which is outside the scope of this assessment. The architecture supports adding it as a future extension.

**No dark mode**  
Kept the UI in light mode only to avoid hydration complexity in Next.js. The design matches OuterSpace Digital branding with their gold (#F5C400) color scheme throughout.