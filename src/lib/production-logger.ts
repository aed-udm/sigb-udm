/**
 * 🔍 SYSTÈME DE LOGGING ROBUSTE POUR PRODUCTION SIGB UdM
 * 
 * Logger qui contourne les limitations de production Next.js
 * Permet de déboguer efficacement en mode production
 */

import fs from 'fs';
import path from 'path';

// Types de logs
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Interface pour les entrées de log
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  stack?: string;
  userId?: string;
  requestId?: string;
  component?: string;
}

class ProductionLogger {
  private static instance: ProductionLogger;
  private logBuffer: LogEntry[] = [];
  private logFilePath: string;
  private maxBufferSize = 1000;
  private isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    // Créer le dossier de logs s'il n'existe pas
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      try {
        fs.mkdirSync(logsDir, { recursive: true });
      } catch (error) {
        // Fallback si impossible de créer le dossier
        console.warn('Impossible de créer le dossier logs:', error);
      }
    }
    
    // Fichier de log avec timestamp
    const today = new Date().toISOString().split('T')[0];
    this.logFilePath = path.join(logsDir, `sigb-${today}.log`);
  }

  static getInstance(): ProductionLogger {
    if (!ProductionLogger.instance) {
      ProductionLogger.instance = new ProductionLogger();
    }
    return ProductionLogger.instance;
  }

  private createLogEntry(
    level: LogLevel, 
    message: string, 
    data?: any, 
    component?: string,
    userId?: string,
    requestId?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      stack: level === LogLevel.ERROR || level === LogLevel.CRITICAL 
        ? new Error().stack 
        : undefined,
      userId,
      requestId,
      component
    };
  }

  private writeToBuffer(entry: LogEntry) {
    this.logBuffer.push(entry);
    
    // Nettoyer le buffer si trop grand
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer = this.logBuffer.slice(-this.maxBufferSize / 2);
    }
    
    // Écrire immédiatement en fichier si critique
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.CRITICAL) {
      this.flushToFile();
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? `\nDATA: ${JSON.stringify(entry.data, null, 2)}` : '';
    const stackStr = entry.stack ? `\nSTACK: ${entry.stack}` : '';
    const contextStr = entry.component || entry.userId || entry.requestId 
      ? `\nCONTEXT: ${JSON.stringify({ component: entry.component, userId: entry.userId, requestId: entry.requestId })}` 
      : '';
    
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${dataStr}${stackStr}${contextStr}\n`;
  }

  private flushToFile() {
    if (this.logBuffer.length === 0) return;
    
    try {
      const logContent = this.logBuffer
        .map(entry => this.formatLogEntry(entry))
        .join('');
      
      fs.appendFileSync(this.logFilePath, logContent);
      this.logBuffer = [];
    } catch (error) {
      // Fallback: afficher dans la console si fichier inaccessible
      console.error('Erreur écriture logs:', error);
    }
  }

  private forceConsoleOutput(entry: LogEntry) {
    // Forcer l'affichage même si removeConsole est activé
    const output = this.formatLogEntry(entry);
    
    if (typeof window === 'undefined') {
      // Mode serveur - utiliser process.stdout
      process.stdout.write(output);
    } else {
      // Mode client - utiliser console natif
      const consoleMethod = entry.level === LogLevel.ERROR || entry.level === LogLevel.CRITICAL 
        ? console.error 
        : entry.level === LogLevel.WARN 
        ? console.warn 
        : console.log;
      
      consoleMethod(output);
    }
  }

  // Méthodes publiques de logging
  debug(message: string, data?: any, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data, component, userId, requestId);
    this.writeToBuffer(entry);
    
    // En mode développement, afficher aussi dans la console
    if (!this.isProduction) {
      this.forceConsoleOutput(entry);
    }
  }

  info(message: string, data?: any, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry(LogLevel.INFO, message, data, component, userId, requestId);
    this.writeToBuffer(entry);
    this.forceConsoleOutput(entry);
  }

  warn(message: string, data?: any, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry(LogLevel.WARN, message, data, component, userId, requestId);
    this.writeToBuffer(entry);
    this.forceConsoleOutput(entry);
  }

  error(message: string, data?: any, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry(LogLevel.ERROR, message, data, component, userId, requestId);
    this.writeToBuffer(entry);
    this.forceConsoleOutput(entry);
    this.flushToFile(); // Écrire immédiatement les erreurs
  }

  critical(message: string, data?: any, component?: string, userId?: string, requestId?: string) {
    const entry = this.createLogEntry(LogLevel.CRITICAL, message, data, component, userId, requestId);
    this.writeToBuffer(entry);
    this.forceConsoleOutput(entry);
    this.flushToFile(); // Écrire immédiatement les erreurs critiques
  }

  // Méthodes utilitaires
  getLogs(level?: LogLevel): LogEntry[] {
    return level 
      ? this.logBuffer.filter(entry => entry.level === level)
      : [...this.logBuffer];
  }

  clearLogs() {
    this.logBuffer = [];
  }

  flush() {
    this.flushToFile();
  }

  // Méthode pour les API routes
  logAPIRequest(method: string, url: string, userId?: string, requestId?: string) {
    this.info(`API ${method} ${url}`, { method, url }, 'API', userId, requestId);
  }

  logAPIResponse(method: string, url: string, statusCode: number, duration: number, userId?: string, requestId?: string) {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `API ${method} ${url} - ${statusCode} (${duration}ms)`;
    
    if (level === LogLevel.ERROR) {
      this.error(message, { method, url, statusCode, duration }, 'API', userId, requestId);
    } else {
      this.info(message, { method, url, statusCode, duration }, 'API', userId, requestId);
    }
  }

  // Méthode pour les erreurs de base de données
  logDatabaseError(query: string, error: any, component?: string) {
    this.error('Erreur base de données', {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      error: error.message,
      code: error.code,
      errno: error.errno
    }, component);
  }

  // Méthode pour les métriques de performance
  logPerformance(operation: string, duration: number, metadata?: any, component?: string) {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance ${operation}: ${duration}ms`;
    
    if (level === LogLevel.WARN) {
      this.warn(message, { operation, duration, ...metadata }, component);
    } else {
      this.info(message, { operation, duration, ...metadata }, component);
    }
  }
}

// Instance singleton
export const logger = ProductionLogger.getInstance();

// Middleware pour Next.js API routes
export function withLogging(handler: Function) {
  return async (req: any, res: any) => {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log de la requête entrante
    logger.logAPIRequest(req.method, req.url, req.userId, requestId);
    
    try {
      const result = await handler(req, res);
      
      // Log de la réponse
      const duration = Date.now() - startTime;
      logger.logAPIResponse(req.method, req.url, res.statusCode || 200, duration, req.userId, requestId);
      
      return result;
    } catch (error) {
      // Log de l'erreur
      const duration = Date.now() - startTime;
      logger.error(`API Error ${req.method} ${req.url}`, {
        error: error.message,
        stack: error.stack,
        duration
      }, 'API', req.userId, requestId);
      
      throw error;
    }
  };
}

// Hook React pour logging côté client
export function useLogger(component: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(message, data, component),
    info: (message: string, data?: any) => logger.info(message, data, component),
    warn: (message: string, data?: any) => logger.warn(message, data, component),
    error: (message: string, data?: any) => logger.error(message, data, component),
    logUserAction: (action: string, details?: any) => {
      logger.info(`User Action: ${action}`, details, component);
    }
  };
}

export default logger;