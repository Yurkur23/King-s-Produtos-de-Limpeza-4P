FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY index.html tsconfig.json vite.config.ts ./
COPY src ./src
COPY public ./public
COPY scripts/build-sw.mjs ./scripts/build-sw.mjs
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production API_PORT=3001
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY scripts/create-user.mjs ./scripts/create-user.mjs
COPY database ./database
USER node
EXPOSE 3001
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
