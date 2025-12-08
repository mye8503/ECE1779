FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm install .
RUN npm install request
COPY . .
EXPOSE 3000
CMD ["npm", "start"]