# Use Nginx as the base image
FROM nginx:alpine

# Copy the static files to the Nginx html directory
COPY public/ /usr/share/nginx/html/

# Copy custom Nginx configuration if needed (optional)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
