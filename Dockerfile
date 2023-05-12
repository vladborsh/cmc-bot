# Stage 1: Build
# Use Node.js image
FROM node:16.14.0 AS build

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./
# Install all dependencies
RUN npm ci

# Copy the rest of your app's source code
COPY . .
# Build tsc
RUN npm run build

# Stage 2: Production
FROM node:16.13.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

COPY --from=build /usr/src/app/dist /usr/src/app/dist

# Declare build arguments
ARG CMC_TOKEN
ARG TG_TOKEN
ARG CRYPTO_PANIC_TOKEN
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_KEY
ARG AWS_REGION
ARG BINANCE_API_KEY
ARG BINANCE_SECRET_KEY
ARG CAPITAL_COM_API_KEY
ARG CAPITAL_COM_CUSTOM_PASS
ARG CAPITAL_COM_IDENTIFIER
ARG TECH_INDICATOR_SERVICE_URL
ARG TECH_INDICATOR_SERVICE_API_KEY

# Set the environment variable
ENV CMC_TOKEN=$CMC_TOKEN
ENV TG_TOKEN=$TG_TOKEN
ENV CRYPTO_PANIC_TOKEN=$CRYPTO_PANIC_TOKEN
ENV AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
ENV AWS_SECRET_KEY=$AWS_SECRET_KEY
ENV AWS_REGION=$AWS_REGION
ENV BINANCE_API_KEY=$BINANCE_API_KEY
ENV BINANCE_SECRET_KEY=$BINANCE_SECRET_KEY
ENV CAPITAL_COM_API_KEY=$CAPITAL_COM_API_KEY
ENV CAPITAL_COM_CUSTOM_PASS=$CAPITAL_COM_CUSTOM_PASS
ENV CAPITAL_COM_IDENTIFIER=$CAPITAL_COM_IDENTIFIER
ENV TECH_INDICATOR_SERVICE_URL=$TECH_INDICATOR_SERVICE_URL
ENV TECH_INDICATOR_SERVICE_API_KEY=$TECH_INDICATOR_SERVICE_API_KEY

# Expose the port your app runs on
# Expose is NOT supported by Heroku
# EXPOSE 3000

# The command to start your app
CMD [ "node", "dist/index.js" ]
