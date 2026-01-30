# 1. Use Official Node 20 Image
FROM node:20-alpine

# 2. Set working directory inside container
WORKDIR /app

# 3. Copy package.json and package-lock.json
COPY package*.json ./ 

# 4. Install only production dependencies

RUN npm install --production

RUN npm install uuid 

RUN npm install pm2 -g

# 5. Copy the entire backend code
COPY . .

# 6. Expose backend port
EXPOSE 3005

# 7. Start the backend
CMD ["pm2-runtime", "index.js"]
