# ================================
# DOCKERFILE OPTIMISÉ SIGB UdM
# Système Intégré de Gestion de Bibliothèque
# Université des Montagnes (UdM)
# ================================

# Étape 1: Image de base Node.js optimisée
FROM node:20-alpine AS base

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    curl \
    wget \
    openssl \
    ca-certificates \
    bind-tools \
    net-tools \
    inetutils-ftp


# Définir le répertoire de travail
WORKDIR /app

# ================================
# Étape 2: Installation des dépendances
# ================================
FROM base AS deps

# Copier les fichiers de configuration des packages
COPY package.json package-lock.json* ./

# Installer TOUTES les dépendances (production + dev) pour le build
RUN npm ci --ignore-scripts && \
    npm cache clean --force

# ================================
# Étape 3: Build de l'application
# ================================
FROM base AS builder

# Copier les dépendances installées
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY . .

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Créer le fichier .env.local pour le build
RUN echo "# Configuration Docker Build" > .env.local && \
    echo "NEXT_TELEMETRY_DISABLED=1" >> .env.local && \
    echo "NODE_ENV=production" >> .env.local

# Build de l'application Next.js
RUN npm run build

# ================================
# Étape 4: Image de production
# ================================
FROM base AS runner

# Créer un utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Variables d'environnement de production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Créer les répertoires nécessaires
RUN mkdir -p /app/public/uploads && \
    mkdir -p /app/public/documents && \
    mkdir -p /app/logs && \
    chown -R nextjs:nodejs /app

# Copier les fichiers de build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copier les fichiers de configuration essentiels
COPY --from=builder --chown=nextjs:nodejs /app/database ./database
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Créer le script de démarrage
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'echo "🚀 Démarrage du SIGB UdM..."' >> /app/start.sh && \
    echo 'echo "📚 Système Intégré de Gestion de Bibliothèque"' >> /app/start.sh && \
    echo 'echo "🏫 Université des Montagnes"' >> /app/start.sh && \
    echo 'echo "🌐 Port: $PORT"' >> /app/start.sh && \
    echo 'echo "📊 Mode: $NODE_ENV"' >> /app/start.sh && \
    echo 'echo "⏰ $(date)"' >> /app/start.sh && \
    echo 'echo "================================"' >> /app/start.sh && \
    echo 'node server.js' >> /app/start.sh && \
    chmod +x /app/start.sh && \
    chown nextjs:nodejs /app/start.sh

# Passer à l'utilisateur non-root
USER nextjs

# Exposer le port
EXPOSE 3000

# Healthcheck pour vérifier l'état de l'application
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/database || exit 1

# Labels pour la documentation
LABEL maintainer="SIGB UdM Team"
LABEL description="Système Intégré de Gestion de Bibliothèque - Université des Montagnes"
LABEL version="8.2.216"
LABEL org.opencontainers.image.title="SIGB UdM"
LABEL org.opencontainers.image.description="Système moderne de gestion documentaire pour l'UdM"
LABEL org.opencontainers.image.vendor="Université des Montagnes"
LABEL org.opencontainers.image.version="8.2.216"

# Commande de démarrage
CMD ["/app/start.sh"]
