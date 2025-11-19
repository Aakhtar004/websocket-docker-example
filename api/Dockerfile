FROM node:8

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create a startup script
RUN echo '#!/bin/bash' > start.sh && \
    echo 'node src/index.js' >> start.sh && \
    chmod +x start.sh

CMD ["./start.sh"]
