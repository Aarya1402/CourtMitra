# Step 1: Base image
FROM node:20-slim

# Step 2: Create app directory
WORKDIR /usr/src/app

# Step 3: Install dependencies
# Copying package files first allows Docker to cache the install step
COPY package*.json ./
RUN npm install

# Step 4: Copy source code
COPY . .

# Step 5: Build TypeScript to JavaScript
RUN npm run build

# Step 6: Create necessary directories for audio processing
RUN mkdir -p uploads temp_output && chmod 777 uploads temp_output

# Step 7: Expose the port (matches your .env PORT)
EXPOSE 5000

# Step 8: Start the server
CMD [ "npm", "start" ]
