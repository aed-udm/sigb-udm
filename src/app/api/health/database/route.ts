import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Configuration de la base de données
const dbConfig = {
  host: process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQL_USER || process.env.DB_USER || 'root',
  password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME || 'bibliotheque_cameroun',
  port: parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306'),
};

// GET /api/health/database - Vérifier la connectivité de la base de données
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test de connexion
    const connection = await mysql.createConnection(dbConfig);
    
    // Test de requête simple
    const [rows] = await connection.execute('SELECT 1 as test');
    
    // Test des tables principales
    const tables = [
      'books',
      'users', 
      'loans',
      'theses',
      'memoires',
      'stage_reports'
    ];
    
    const tableStatus: Record<string, any> = {};
    
    for (const table of tables) {
      try {
        const [tableRows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        tableStatus[table] = {
          exists: true,
          count: (tableRows as any[])[0].count,
          status: 'OK'
        };
      } catch (error) {
        tableStatus[table] = {
          exists: false,
          count: 0,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        };
      }
    }
    
    // Test de la vue academic_documents
    let viewStatus = {};
    try {
      const [viewRows] = await connection.execute('SELECT COUNT(*) as count FROM academic_documents');
      viewStatus = {
        exists: true,
        count: (viewRows as any[])[0].count,
        status: 'OK'
      };
    } catch (error) {
      viewStatus = {
        exists: false,
        count: 0,
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
    
    await connection.end();
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        responseTime: `${responseTime}ms`,
        config: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user
        }
      },
      tables: tableStatus,
      views: {
        academic_documents: viewStatus
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      database: {
        connected: false,
        responseTime: `${responseTime}ms`,
        config: {
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user
        },
        error: {
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          code: (error as any)?.code || 'UNKNOWN_ERROR',
          errno: (error as any)?.errno || null
        }
      },
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}
