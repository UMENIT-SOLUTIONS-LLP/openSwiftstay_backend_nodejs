# Use the official Node.js 14 image as the base image
FROM node:14

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Install pm2 globally
RUN npm install pm2 -g

# Copy the rest of the application files to the working directory
COPY . .

# Expose the port your app runs on
EXPOSE 3000

# Run the application
CMD ["npm", "run", "develop"]
