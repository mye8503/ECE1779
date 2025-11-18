FROM node:22

# set working directory
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .


EXPOSE 3000

CMD ["npm", "start"]
