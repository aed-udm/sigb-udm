import { NextRequest, NextResponse } from 'next/server';
import { ActiveDirectoryService } from '@/lib/services/active-directory';

// API de test pour vérifier la configuration AD sans authentification
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test de la configuration Active Directory...');

    const adService = new ActiveDirectoryService();
    
    // Récupérer les informations de configuration
    const config = {
      server: process.env.AD_SERVER || 'Non configuré',
      port: process.env.AD_PORT || 'Non configuré',
      baseDN: process.env.AD_BASE_DN || 'Non configuré',
      domain: process.env.AD_DOMAIN || 'Non configuré',
      adminUser: process.env.AD_ADMIN_USER || 'Non configuré'
    };

    console.log('📋 Configuration AD:', config);

    // Tests de connectivité réseau
    const networkTests = [];
    
    // Test 1: Ping basique (si possible)
    networkTests.push({
      name: 'Configuration Environment',
      status: 'success',
      details: config
    });

    // Test 2: Test de connexion LDAP
    let connectionTest = {
      name: 'Connexion LDAP',
      status: 'error',
      message: 'Test de connexion non effectué',
      error: null as any
    };

    try {
      // Tenter une connexion basique pour vérifier la disponibilité du serveur LDAP
      const { Client: LDAPClient } = require('ldapts');
      
      const client = new LDAPClient({
        url: process.env.AD_SERVER || 'ldap://192.168.192.52',
        timeout: 10000, // 10 secondes
        connectTimeout: 10000,
      });

      console.log('🔗 Test de connexion au serveur LDAP...');
      
      // Essayer de se connecter avec les credentials admin pour tester
      await client.bind(
        process.env.AD_ADMIN_USER || 'administrator@udm.edu.cm',
        process.env.AD_ADMIN_PASSWORD || 'Franck55'
      );
      
      console.log('✅ Connexion LDAP administrateur réussie');
      
      // Test de recherche basique
      const searchOptions = {
        scope: 'sub' as const,
        filter: '(objectClass=user)',
        attributes: ['sAMAccountName', 'mail', 'displayName'],
        sizeLimit: 5 // Limiter à 5 pour le test
      };
      
      const searchResult = await client.search(process.env.AD_BASE_DN || 'DC=udm,DC=edu,DC=cm', searchOptions);
      
      await client.unbind();
      
      connectionTest = {
        name: 'Connexion LDAP',
        status: 'success',
        message: `Connexion réussie - ${searchResult.searchEntries.length} utilisateurs trouvés`,
        error: null,
        details: {
          userCount: searchResult.searchEntries.length,
          sampleUsers: searchResult.searchEntries.slice(0, 3).map(entry => ({
            username: entry.sAMAccountName,
            displayName: entry.displayName,
            email: entry.mail
          }))
        }
      };
      
      networkTests.push(connectionTest);

    } catch (error) {
      console.error('❌ Erreur de connexion LDAP:', error);
      connectionTest = {
        name: 'Connexion LDAP',
        status: 'error',
        message: 'Échec de connexion LDAP',
        error: {
          type: error instanceof Error ? error.constructor.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Erreur inconnue',
          code: (error as any)?.code || 'Unknown',
          errno: (error as any)?.errno || 'Unknown',
          syscall: (error as any)?.syscall || 'Unknown',
          address: (error as any)?.address || 'Unknown',
          port: (error as any)?.port || 'Unknown'
        }
      };
      networkTests.push(connectionTest);
    }

    // Test 3: Vérification des utilisateurs en base
    let dbUsersTest = {
      name: 'Utilisateurs synchronisés',
      status: 'info',
      message: 'Vérification base de données',
      details: null as any
    };

    try {
      const { executeQuery } = require('@/lib/mysql');
      const syncedUsers = await executeQuery('SELECT COUNT(*) as total, MAX(last_sync) as lastSync FROM synced_users');
      const activeUsers = await executeQuery('SELECT COUNT(*) as active FROM synced_users WHERE is_active = 1');
      
      dbUsersTest = {
        name: 'Utilisateurs synchronisés',
        status: 'success',
        message: `${syncedUsers[0]?.total || 0} utilisateurs en base`,
        details: {
          totalUsers: syncedUsers[0]?.total || 0,
          activeUsers: activeUsers[0]?.active || 0,
          lastSync: syncedUsers[0]?.lastSync || 'Jamais'
        }
      };
    } catch (error) {
      dbUsersTest = {
        name: 'Utilisateurs synchronisés',
        status: 'error',
        message: 'Erreur base de données',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
    
    networkTests.push(dbUsersTest);

    return NextResponse.json({
      success: true,
      data: {
        tests: networkTests,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        recommendations: connectionTest.status === 'error' ? [
          'Vérifiez que le serveur AD est accessible sur le réseau',
          'Confirmez que le port 389 (LDAP) est ouvert',
          'Testez la connectivité réseau : ping 192.168.192.52',
          'Vérifiez les credentials AD dans .env.local',
          'Assurez-vous d\'être sur le même réseau que le serveur AD'
        ] : [
          'Connexion AD fonctionnelle',
          'Vous pouvez lancer une synchronisation'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Erreur test AD:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'AD_TEST_ERROR', 
          message: 'Erreur lors du test Active Directory',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}