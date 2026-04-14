FROM node:20-alpine
WORKDIR /app

# Dependencies first, for better caching
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Ports:
#   4849 — build/run progress dashboard
#   4850 — §8 four-predicate Fibonacci-sphere publisher
#   4851 — chat-first consumer surface ("Own your AI.")
EXPOSE 4849 4850 4851

# Start all four services (dashboard, publisher, chat, kernel) in one container.
# The kernel is the foreground process so docker tracks its lifecycle;
# dashboard, publisher, and chat run in the background sharing the container's
# filesystem (canon/, state/, rules/).
CMD ["sh", "-c", "node tools/dashboard/server.mjs & node src/publisher.mjs & node src/chat.mjs & exec node src/kernel.mjs"]
