# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./

# Install ALL dependencies (including devDependencies like typescript)
RUN npm install

COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --production

# Copy built files from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
# We need tsconfig.json to support tsconfig-paths if utilized in start script, 
# but usually 'node dist/server.js' is enough if paths are resolved or not used. 
# However, your start script uses 'tsconfig-paths/register', so we need tsconfig.json.
COPY tsconfig.json ./

EXPOSE 3000

CMD [ "npm", "start" ]