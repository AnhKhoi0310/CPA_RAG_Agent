FROM node:20-alpine as build

WORKDIR /app

# Declare build arguments
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_GEMINI_API_KEY
ARG REACT_APP_AZURE_SEARCH_ENDPOINT
ARG REACT_APP_AZURE_SEARCH_API_KEY
ARG REACT_APP_AZURE_SEARCH_INDEX_NAME

# Set as environment variables for the build
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_GEMINI_API_KEY=$REACT_APP_GEMINI_API_KEY
ENV REACT_APP_AZURE_SEARCH_ENDPOINT=$REACT_APP_AZURE_SEARCH_ENDPOINT
ENV REACT_APP_AZURE_SEARCH_API_KEY=$REACT_APP_AZURE_SEARCH_API_KEY
ENV REACT_APP_AZURE_SEARCH_INDEX_NAME=$REACT_APP_AZURE_SEARCH_INDEX_NAME

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the React app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
