# Use Node.js image
FROM node:14.15.5

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies
RUN npm install

# Copy the rest of your app's source code
COPY . .

# Declare build arguments
ARG CMC_TOKEN
ARG TG_TOKEN
ARG CRYPTO_PANIC_TOKEN
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_KEY
ARG AWS_REGION

# Set the environment variable
ENV CMC_TOKEN=$CMC_TOKEN
ENV TG_TOKEN=$TG_TOKEN
ENV CRYPTO_PANIC_TOKEN=$CRYPTO_PANIC_TOKEN
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_KEY=$AWS_SECRET_KEY
ENV AWS_REGION=$AWS_REGION

# Expose the port your app runs on
# Expose is NOT supported by Heroku
# EXPOSE 3000

# The command to start your app
CMD [ "node", "index.js" ]
