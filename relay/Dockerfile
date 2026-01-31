FROM oven/bun:latest AS base

WORKDIR /app

COPY server.ts tsconfig.json ./

EXPOSE 3100

CMD ["bun", "run", "server.ts"]
