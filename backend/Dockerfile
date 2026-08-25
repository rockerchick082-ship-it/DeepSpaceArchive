# DeepSpace Archive backend
# Production image

FROM node:26-bookworm AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build


FROM node:26-bookworm-slim AS runtime

ARG DEEPSPACE_ARCHIVE_VERSION=development
ARG DEEPSPACE_ARCHIVE_CHANNEL=development
ARG DEEPSPACE_ARCHIVE_COMMIT=
ARG DEEPSPACE_ARCHIVE_BUILD_DATE=

ENV NODE_ENV=production
ENV DEEPSPACE_ARCHIVE_VERSION=${DEEPSPACE_ARCHIVE_VERSION}
ENV DEEPSPACE_ARCHIVE_CHANNEL=${DEEPSPACE_ARCHIVE_CHANNEL}
ENV DEEPSPACE_ARCHIVE_COMMIT=${DEEPSPACE_ARCHIVE_COMMIT}
ENV DEEPSPACE_ARCHIVE_BUILD_DATE=${DEEPSPACE_ARCHIVE_BUILD_DATE}

WORKDIR /app

# FFmpeg/ffprobe are used by media inspection and thumbnail generation.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY LICENSE ./LICENSE

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=build /app/dist ./dist

RUN mkdir -p /app/data /app/cache /media

EXPOSE 3001

HEALTHCHECK \
  --interval=10s \
  --timeout=5s \
  --start-period=15s \
  --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
