FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY apps/api/package.json ./apps/api/package.json

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build
RUN pnpm --filter web build

WORKDIR /app/apps/web

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node_modules/.bin/next", "start"]