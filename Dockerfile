# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy the rest of the application's source code
COPY . .

# Build the TypeScript code
RUN npm run build

# The app binds to port 3000, so expose it
EXPOSE 3000

# Define the command to run the app
CMD [ "npm", "start" ]
