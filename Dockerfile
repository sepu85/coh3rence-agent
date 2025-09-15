# ---- builder ----
FROM node:22-bullseye AS builder
WORKDIR /app

# OS deps for native modules (sqlite)
RUN apt-get update \
  && apt-get install -y python3 make g++ sqlite3 \
  && rm -rf /var/lib/apt/lists/*

# package manager
RUN npm i -g pnpm

# lockfile + tsconfig first for better caching
COPY package.json pnpm-lock.yaml* tsconfig.json ./

# install deps
RUN pnpm config set allow-scripts true && pnpm install

# copy sources
COPY src ./src
COPY characters ./characters

# build TS -> JS
RUN pnpm build

# ---- runtime (slim) ----
FROM node:22-bullseye AS runtime
WORKDIR /app

ENV NODE_ENV=production

# copy build artifacts and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/characters ./characters

# data dir for sqlite
RUN mkdir -p /app/data

# default command
CMD ["node", "dist/main.js"]
