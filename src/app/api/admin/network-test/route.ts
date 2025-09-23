import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import os from 'os';

// API pour tester la connectivité réseau directement avec Node.js
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test de connectivité réseau Node.js vers AD...');

    // Utiliser l'IP dynamique du .env.local
    const adServerUrl = process.env.AD_SERVER || 'ldap://192.168.192.52:389';
    const adHost = adServerUrl.replace('ldap://', '').split(':')[0];
    const adPort = 389;
    
    console.log(`🎯 Test vers: ${adHost}:${adPort}`);

    const testResults = [];
    
    // Test 0: Informations réseau local
    const networkInterfaces = os.networkInterfaces();
    const localNetworks = [];
    
    for (const [name, configs] of Object.entries(networkInterfaces)) {
      for (const config of configs || []) {
        if (config.family === 'IPv4' && !config.internal) {
          localNetworks.push({
            interface: name,
            address: config.address,
            netmask: config.netmask,
            network: config.address.split('.').slice(0, 3).join('.')
          });
        }
      }
    }
    
    testResults.push({
      name: 'Interfaces réseau locales',
      status: 'info',
      message: `${localNetworks.length} interface(s) réseau détectée(s)`,
      details: { networks: localNetworks, target_host: adHost }
    });
    
    // Test 1: Connectivité TCP basique avec Node.js (IP dynamique)
    const tcpTest = await new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({
          name: 'Test TCP Node.js',
          status: 'error',
          message: 'Timeout de connexion',
          details: { timeout: 8000, host: adHost, port: adPort }
        });
      }, 5000); // Réduit pour éviter les longs timeouts

      socket.connect(adPort, adHost, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({
          name: 'Test TCP Node.js',
          status: 'success',
          message: 'Connexion TCP réussie',
          details: { host: adHost, port: adPort }
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          name: 'Test TCP Node.js',
          status: 'error',
          message: 'Erreur de connexion TCP',
          details: {
            host: adHost,
            port: adPort,
            error: error.message,
            code: (error as any).code,
            errno: (error as any).errno,
            syscall: (error as any).syscall
          }
        });
      });
    });

    testResults.push(tcpTest);

    // Test 2: Test avec ldapts mais configuration détaillée
    let ldapTest = {
      name: 'Test LDAP avec config détaillée',
      status: 'info',
      message: 'En cours...',
      details: {}
    };

    try {
      const { Client: LDAPClient } = require('ldapts');
      
      // Test avec différentes configurations et IPs alternatives
      const configurations = [
        {
          name: 'Configuration standard',
          config: {
            url: `ldap://${adHost}:389`,
            timeout: 8000,
            connectTimeout: 8000,
          }
        },
        {
          name: 'Configuration avec IPv4 forcé',
          config: {
            url: `ldap://${adHost}:389`,
            timeout: 8000,
            connectTimeout: 8000,
            reconnect: false,
            tlsOptions: {
              rejectUnauthorized: false
            }
          }
        }
      ];
      
      // Test d'IPs alternatives si l'IP principale échoue
      const alternativeIPs = [
        '192.168.192.52',
        '192.168.82.52', 
        '192.168.1.112',
        '192.168.56.101',
        '192.168.159.112'
      ];
      
      // Si l'IP actuelle n'est pas dans les alternatives, l'ajouter
      if (!alternativeIPs.includes(adHost)) {
        alternativeIPs.unshift(adHost);
      }

      let ldapWorking = false;
      
      for (const ip of alternativeIPs) {
        if (ldapWorking) break;
        
        for (const config of configurations) {
          try {
            console.log(`🔗 Test ${config.name} sur ${ip}...`);
            
            const testConfig = {
              ...config.config,
              url: `ldap://${ip}:389`
            };
            
            const client = new LDAPClient(testConfig);
            
            // Test avec bind anonyme d'abord (plus sûr)
            await client.bind('', '');
            await client.unbind();
            
            ldapTest = {
              name: 'Test LDAP avec config détaillée',
              status: 'success',
              message: `Connexion LDAP réussie avec ${config.name} sur ${ip}`,
              details: { 
                workingConfig: config.name, 
                workingIP: ip,
                tested_ips: alternativeIPs.slice(0, alternativeIPs.indexOf(ip) + 1)
              }
            };
            ldapWorking = true;
            break;
            
          } catch (error) {
            console.log(`❌ Échec ${config.name} sur ${ip}:`, error);
            ldapTest = {
              name: 'Test LDAP avec config détaillée',
              status: 'error',
              message: `Échec avec ${config.name} sur ${ip}`,
              details: {
                configName: config.name,
                tested_ip: ip,
                error: error instanceof Error ? error.message : 'Erreur inconnue',
                code: (error as any)?.code,
                errno: (error as any)?.errno,
                tested_ips: alternativeIPs.slice(0, alternativeIPs.indexOf(ip) + 1)
              }
            };
          }
        }
      }

    } catch (error) {
      ldapTest = {
        name: 'Test LDAP avec config détaillée',
        status: 'error',
        message: 'Erreur lors du test LDAP',
        details: { error: error instanceof Error ? error.message : 'Erreur inconnue' }
      };
    }

    testResults.push(ldapTest);

    // Test 3: Informations système
    const systemInfo = {
      name: 'Informations système',
      status: 'info',
      message: 'Informations de l\'environnement',
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        networkInterfaces: Object.keys(require('os').networkInterfaces()),
        env: {
          AD_SERVER: process.env.AD_SERVER,
          NODE_ENV: process.env.NODE_ENV
        }
      }
    };

    testResults.push(systemInfo);

    // Génération de recommandations intelligentes
    const tcpWorking = (tcpTest as any).status === 'success';
    const ldapWorking = ldapTest.status === 'success';
    
    let recommendation = '';
    let actionSteps = [];
    
    if (!tcpWorking && !ldapWorking) {
      recommendation = 'Aucune connectivité réseau détectée vers le serveur AD';
      actionSteps = [
        'Vérifiez que la VM Windows Server est démarrée',
        'Vérifiez la configuration réseau de la VM',
        'Testez la connectivité avec ping depuis votre machine',
        'Utilisez le script: node scripts/diagnostic-reseau-complet.js'
      ];
    } else if (tcpWorking && !ldapWorking) {
      recommendation = 'Connectivité réseau OK mais service LDAP inaccessible';
      actionSteps = [
        'Vérifiez que les services Active Directory sont démarrés sur la VM',
        'Vérifiez que le port 389 est ouvert dans le pare-feu',
        'Testez avec un client LDAP externe (LDAPAdmin, Apache Directory Studio)',
        'Vérifiez les logs d\'événements Windows sur le serveur AD'
      ];
    } else if (!tcpWorking && ldapWorking) {
      recommendation = 'Situation inhabituelle - LDAP fonctionne mais pas TCP basique';
      actionSteps = ['Relancez le test', 'Vérifiez la configuration réseau'];
    } else {
      recommendation = 'Connectivité optimale vers le serveur Active Directory';
      actionSteps = ['La synchronisation AD devrait fonctionner correctement'];
    }
    
    return NextResponse.json({
      success: true,
      data: {
        tests: testResults,
        timestamp: new Date().toISOString(),
        summary: {
          tcpWorking,
          ldapWorking,
          recommendation,
          actionSteps,
          current_config: {
            AD_SERVER: process.env.AD_SERVER,
            target_host: adHost,
            target_port: adPort
          }
        }
      }
    });

  } catch (error) {
    console.error('❌ Erreur test connectivité:', error);
    
    return NextResponse.json(
      { 
        error: { 
          code: 'NETWORK_TEST_ERROR', 
          message: 'Erreur lors du test de connectivité',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}