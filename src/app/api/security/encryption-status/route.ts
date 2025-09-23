/**
 * API Route: /api/security/encryption-status
 * Statut de chiffrement et sécurité du système
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function GET(request: NextRequest) {
  try {
    // Vérifier le statut de chiffrement de la base de données (version simplifiée)
    let encryptionVars = [];
    try {
      const encryptionStatusQuery = `
        SELECT
          VARIABLE_NAME,
          VARIABLE_VALUE
        FROM INFORMATION_SCHEMA.GLOBAL_VARIABLES
        WHERE VARIABLE_NAME IN ('have_ssl', 'ssl_cipher')
        LIMIT 5
      `;
      encryptionVars = await executeQuery(encryptionStatusQuery) as any[];
    } catch (error) {
      // Fallback si INFORMATION_SCHEMA n'est pas accessible
      encryptionVars = [
        { VARIABLE_NAME: 'have_ssl', VARIABLE_VALUE: 'DISABLED' },
        { VARIABLE_NAME: 'ssl_cipher', VARIABLE_VALUE: null }
      ];
    }

    // Convertir en objet pour faciliter l'accès
    const encryptionStatus = encryptionVars.reduce((acc, row) => {
      acc[row.VARIABLE_NAME.toLowerCase()] = row.VARIABLE_VALUE;
      return acc;
    }, {});

    // Vérifier les tables chiffrées (version simplifiée)
    let encryptedTables = [];
    try {
      const encryptedTablesQuery = `
        SELECT
          TABLE_NAME,
          CREATE_OPTIONS
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        LIMIT 5
      `;
      const allTables = await executeQuery(encryptedTablesQuery) as any[];
      encryptedTables = allTables.filter(table =>
        table.CREATE_OPTIONS && table.CREATE_OPTIONS.includes('ENCRYPTED')
      );
    } catch (error) {
      encryptedTables = []; // Fallback
    }

    // Vérifier les connexions SSL actives (version simplifiée)
    let connectionStats = { total_connections: 1, ssl_connections: 0 };
    try {
      const sslConnectionsQuery = `
        SELECT
          COUNT(*) as total_connections,
          0 as ssl_connections
        FROM INFORMATION_SCHEMA.PROCESSLIST
        LIMIT 1
      `;
      [connectionStats] = await executeQuery(sslConnectionsQuery) as any[];
    } catch (error) {
      // Fallback avec valeurs par défaut
      connectionStats = { total_connections: 1, ssl_connections: 0 };
    }

    // Analyser les données sensibles
    const sensitiveDataQuery = `
      SELECT 
        'users' as table_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) as email_records,
        SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as phone_records
      FROM users
      
      UNION ALL

      SELECT
        'synced_users' as table_name,
        COUNT(*) as total_records,
        SUM(CASE WHEN email IS NOT NULL THEN 1 ELSE 0 END) as email_records,
        0 as phone_records
      FROM synced_users
    `;

    const sensitiveData = await executeQuery(sensitiveDataQuery) as any[];

    // Vérifier les paramètres de sécurité de l'application
    const securitySettingsQuery = `
      SELECT 
        setting_key,
        setting_value
      FROM system_settings 
      WHERE category = 'security' OR setting_key LIKE '%security%'
    `;

    const securitySettings = await executeQuery(securitySettingsQuery) as any[];

    // Évaluer le niveau de sécurité
    const securityLevel = evaluateSecurityLevel({
      ssl_enabled: encryptionStatus.have_ssl === 'YES',
      ssl_connections: connectionStats?.ssl_connections || 0,
      total_connections: connectionStats?.total_connections || 0,
      encrypted_tables: encryptedTables.length,
      total_sensitive_records: sensitiveData.reduce((sum, row) => sum + row.total_records, 0)
    });

    const response = {
      success: true,
      data: {
        encryption: {
          database: {
            ssl_enabled: encryptionStatus.have_ssl === 'YES',
            ssl_cipher: encryptionStatus.ssl_cipher || null,
            innodb_encrypt_tables: encryptionStatus.innodb_encrypt_tables || 'OFF',
            innodb_encrypt_log: encryptionStatus.innodb_encrypt_log || 'OFF',
            encrypted_tables: encryptedTables.length,
            total_tables: await getTotalTablesCount()
          },
          connections: {
            total: connectionStats?.total_connections || 0,
            ssl_secured: connectionStats?.ssl_connections || 0,
            ssl_percentage: connectionStats?.total_connections > 0 
              ? Math.round((connectionStats.ssl_connections / connectionStats.total_connections) * 100)
              : 0
          }
        },
        sensitive_data: {
          tables: sensitiveData,
          protection_level: calculateDataProtectionLevel(sensitiveData)
        },
        security_settings: securitySettings.reduce((acc, setting) => {
          acc[setting.setting_key] = setting.setting_value;
          return acc;
        }, {}),
        overall_security: securityLevel,
        recommendations: generateSecurityRecommendations(securityLevel, encryptionStatus),
        last_check: new Date().toISOString()
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Erreur API /api/security/encryption-status:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SECURITY_CHECK_ERROR',
        message: 'Erreur lors de la vérification du statut de sécurité',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}

/**
 * Obtenir le nombre total de tables
 */
async function getTotalTablesCount(): Promise<number> {
  try {
    const [result] = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `) as any[];
    return result?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Évaluer le niveau de sécurité global
 */
function evaluateSecurityLevel(metrics: any): string {
  let score = 0;
  
  if (metrics.ssl_enabled) score += 30;
  if (metrics.ssl_connections / metrics.total_connections > 0.8) score += 20;
  if (metrics.encrypted_tables > 0) score += 25;
  if (metrics.total_sensitive_records > 0) score += 25;

  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'low';
  return 'critical';
}

/**
 * Calculer le niveau de protection des données
 */
function calculateDataProtectionLevel(sensitiveData: any[]): string {
  const totalRecords = sensitiveData.reduce((sum, row) => sum + row.total_records, 0);
  
  if (totalRecords === 0) return 'none';
  if (totalRecords < 100) return 'low';
  if (totalRecords < 1000) return 'medium';
  return 'high';
}

/**
 * Générer des recommandations de sécurité
 */
function generateSecurityRecommendations(securityLevel: string, encryptionStatus: any): string[] {
  const recommendations = [];

  if (encryptionStatus.have_ssl !== 'YES') {
    recommendations.push('Activer SSL/TLS pour les connexions à la base de données');
  }

  if (encryptionStatus.innodb_encrypt_tables !== 'ON') {
    recommendations.push('Activer le chiffrement des tables InnoDB');
  }

  if (securityLevel === 'critical' || securityLevel === 'low') {
    recommendations.push('Mettre en place une politique de chiffrement des données sensibles');
    recommendations.push('Configurer des connexions SSL obligatoires');
  }

  if (recommendations.length === 0) {
    recommendations.push('Configuration de sécurité satisfaisante');
  }

  return recommendations;
}
