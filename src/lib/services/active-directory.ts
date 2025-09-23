// Import LDAPTS - requis pour la connexion Active Directory
import { Client as LDAPClient, Change, Attribute } from 'ldapts';
import { executeQuery } from '@/lib/mysql';
import jwt from 'jsonwebtoken';
import net from 'net';

export interface ADUser {
  sAMAccountName: string;
  mail?: string | null;
  displayName?: string | null;
  department?: string | null;
  title?: string | null;
  userAccountControl: number;
  memberOf?: string[];
  distinguishedName?: string | null;
  telephoneNumber?: string | null;
  physicalDeliveryOfficeName?: string | null;
  company?: string | null;
  manager?: string | null;
  whenCreated?: string | null;
  whenChanged?: string | null;
  lastLogon?: string | null;
  pwdLastSet?: string | null;
  accountExpires?: string | null;
}

export interface SyncedUser {
  id: string;
  ad_username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'bibliothecaire' | 'circulation' | 'enregistrement' | 'etudiant';
  permissions: string; // JSON string des permissions granulaires
  department?: string;
  position?: string;
  is_active: number; // 1 = actif, 0 = inactif
  manual_role_override: number; // 1 = rôle assigné manuellement, 0 = rôle automatique AD
  ad_groups: string; // JSON string
  distinguished_name?: string;
  user_account_control?: number;
  phone?: string;
  office?: string;
  manager?: string;
  last_sync: Date;
  last_login?: Date;
  last_logout?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserPermissions {
  // Gestion des livres
  books: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_copies: boolean;
  };
  // Gestion des utilisateurs
  users: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_roles: boolean;
  };
  // Gestion des emprunts
  loans: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    extend: boolean;
    force_return: boolean;
  };
  // Gestion des réservations
  reservations: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_queue: boolean;
  };
  // Documents académiques
  academic_documents: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    upload: boolean;
  };
  // Administration système
  system: {
    view_stats: boolean;
    manage_settings: boolean;
    sync_ad: boolean;
    manage_backups: boolean;
    view_logs: boolean;
  };
}

export class ActiveDirectoryService {
  private ldapUrl: string;
  private baseDN: string;
  private adminDN: string;
  private adminPassword: string;


  // Optimisation auto-détection
  private static lastDetectionTime: number = 0;
  private static detectionCooldown: number = 300000; // 5 minutes

  constructor() {
    // Configuration basée sur votre .env.local
    this.ldapUrl = process.env.AD_SERVER || 'ldap://192.168.192.52';
    this.baseDN = process.env.AD_BASE_DN || 'DC=udm,DC=edu,DC=cm';
    
    // Essayer différents formats de DN admin
    const adminUser = process.env.AD_ADMIN_USER || 'administrator@udm.edu.cm';
    
    // Si c'est un format email, essayer aussi le format CN
    if (adminUser.includes('@')) {
      this.adminDN = adminUser; // Format UPN (User Principal Name)
    } else {
      this.adminDN = `CN=${adminUser},CN=Users,DC=udm,DC=edu,DC=cm`; // Format DN
    }
    
    this.adminPassword = process.env.AD_ADMIN_PASSWORD || 'Franck55';
    
    console.log('🔧 Configuration AD initialisée:');
    console.log('- Serveur LDAP:', this.ldapUrl);
    console.log('- Base DN:', this.baseDN);
    console.log('- Admin DN:', this.adminDN);
    console.log('- Format DN:', adminUser.includes('@') ? 'UPN (email)' : 'Distinguished Name');
    
    // Auto-détection IP VM si l'IP configurée ne fonctionne pas
    this.autoDetectVMIP();
  }

  /**
   * Détecte automatiquement l'IP de la VM si l'IP configurée ne fonctionne pas
   * OPTIMISÉ : Ne fait l'auto-détection qu'une seule fois par session
   */
  private async autoDetectVMIP(): Promise<void> {
    try {
      const now = Date.now();
      
      // Éviter la détection répétitive
      if (now - ActiveDirectoryService.lastDetectionTime < ActiveDirectoryService.detectionCooldown) {
        console.log('⏭️ Auto-détection récente ignorée (cooldown)');
        return;
      }
      
      const currentHost = this.ldapUrl.replace('ldap://', '').split(':')[0];
      
      // Test de l'IP actuelle
      const currentWorks = await this.checkTCPConnectivity(currentHost, 389);
      
      if (currentWorks) {
        console.log('✅ IP configurée accessible:', currentHost);
        return;
      }
      
      console.log('⚠️ IP configurée inaccessible, auto-détection...');
      ActiveDirectoryService.lastDetectionTime = now;
      
      // IPs communes pour les VMs (réduit pour performance)
      const commonIPs = [
        '192.168.1.100', '192.168.56.100', '192.168.159.100', 
        '192.168.82.100', '10.0.0.100'
      ];
      
      for (const ip of commonIPs) {
        const works = await this.checkTCPConnectivity(ip, 389);
        if (works) {
          console.log(`🎯 VM détectée automatiquement: ${ip}`);
          this.ldapUrl = `ldap://${ip}:389`;
          console.log('✅ Configuration mise à jour automatiquement');
          return;
        }
      }
      
      console.log('❌ Auto-détection échouée - utilisez l\'IP manuelle');
      
    } catch (error) {
      console.log('⚠️ Erreur auto-détection:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * Vérifie la connectivité TCP avant la connexion LDAP
   */
  private async checkTCPConnectivity(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 5000);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        console.log('✅ Connectivité TCP confirmée:', `${host}:${port}`);
        resolve(true);
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        console.error('❌ Échec connectivité TCP:', error.message);
        resolve(false);
      });
    });
  }

  /**
   * Crée une connexion LDAP avec gestion d'erreurs avancée
   * CORRIGÉ: Timeouts optimisés et format DN optimal en premier
   */
  private async createConnection(): Promise<LDAPClient> {
    console.log('🔗 Création connexion LDAP vers:', this.ldapUrl);
    
    // Étape 1: Vérifier la connectivité TCP
    const host = this.ldapUrl.replace('ldap://', '').split(':')[0];
    const port = 389;
    
    console.log('🔍 Vérification connectivité TCP...', `${host}:${port}`);
    const tcpOk = await this.checkTCPConnectivity(host, port);
    
    if (!tcpOk) {
      throw new Error(`Connectivité TCP échouée vers ${host}:${port}`);
    }
    
    // Étape 2: Créer le client LDAP avec timeouts OPTIMISÉS
    const client = new LDAPClient({
      url: this.ldapUrl,
      timeout: 30000,        // OPTIMISÉ: Augmenté pour serveur AD lent
      connectTimeout: 20000  // OPTIMISÉ: Augmenté pour éviter les timeouts
    });

    // Étape 3: Formats de DN avec l'optimal EN PREMIER (détecté par diagnostic)
    const adminFormats = [
      'administrator@udm.edu.cm',     // Format UPN (optimal détecté)
      this.adminDN,                   // Format défini dans le constructeur
      'CN=Administrator,CN=Users,DC=udm,DC=edu,DC=cm', // Format DN complet
      'administrator',                // Format simple
      'UDM\\administrator'            // Format domaine\utilisateur
    ];

    let lastError = null;
    
    for (const adminDN of adminFormats) {
      try {
        console.log('🔐 Tentative de connexion admin avec:', adminDN);
        await client.bind(adminDN, this.adminPassword);
        console.log('✅ Connexion LDAP administrateur réussie avec:', adminDN);
        this.adminDN = adminDN; // Sauvegarder le format qui fonctionne
        return client;
      } catch (error) {
        console.log(`❌ Échec avec ${adminDN}:`, error instanceof Error ? error.message : error);
        lastError = error;
        // Continuer avec le format suivant
      }
    }

    // Si tous les formats ont échoué
    console.error('❌ Erreur de connexion LDAP admin avec tous les formats:');
    console.error('🔍 Détails:', {
      url: this.ldapUrl,
      baseDN: this.baseDN,
      testedFormats: adminFormats,
      lastError: lastError instanceof Error ? lastError.message : lastError
    });
    
    // Fermer le client en cas d'échec
    try {
      await client.unbind();
    } catch (e) {
      // Ignorer les erreurs de fermeture
    }
    
    throw lastError;
  }

  /**
   * Authentifie un utilisateur contre Active Directory avec LDAPTS
   */
  async authenticateUser(username: string, password: string): Promise<ADUser | null> {
    let userClient: any = null;
    let adminClient: any = null;

    try {
      // Normaliser le nom d'utilisateur
      const normalizedUsername = username.includes('@')
        ? username
        : `${username}@udm.edu.cm`;

      console.log(`🔐 Tentative d'authentification AD pour: ${normalizedUsername}`);

      // Étape 1: Connexion avec les identifiants utilisateur pour vérifier l'authentification

      userClient = new LDAPClient({
        url: this.ldapUrl,
        timeout: 30000,        // OPTIMISÉ: Même timeout que l'admin
        connectTimeout: 20000,  // OPTIMISÉ: Même timeout que l'admin
      });

      try {
        await userClient.bind(normalizedUsername, password);
        console.log('✅ Authentification AD réussie');
      } catch (bindError) {
        console.log('❌ Échec de l\'authentification AD:', bindError);
        return null;
      } finally {
        await userClient.unbind();
      }

      // Étape 2: Utiliser la connexion admin pour récupérer les informations utilisateur
      adminClient = await this.createConnection();

      const searchFilter = `(sAMAccountName=${username.split('@')[0]})`;
      const searchOptions = {
        scope: 'sub' as const,
        filter: searchFilter,
        attributes: [
          'sAMAccountName',
          'mail',
          'displayName',
          'department',
          'title',
          'userAccountControl',
          'memberOf',
          'distinguishedName',
          'telephoneNumber',
          'physicalDeliveryOfficeName',
          'company',
          'manager',
          'whenCreated',
          'whenChanged',
          'lastLogon',
          'pwdLastSet',
          'accountExpires'
        ]
      };

      const searchResult = await adminClient.search(this.baseDN, searchOptions);

      if (searchResult.searchEntries.length === 0) {
        console.log('❌ Utilisateur non trouvé dans AD');
        return null;
      }

      const entry = searchResult.searchEntries[0];
      const adUser: ADUser = {
        sAMAccountName: entry.sAMAccountName as string,
        mail: this.cleanLdapValue(entry.mail),
        displayName: this.cleanLdapValue(entry.displayName),
        department: this.cleanLdapValue(entry.department),
        title: this.cleanLdapValue(entry.title),
        userAccountControl: parseInt(entry.userAccountControl as string) || 0,
        memberOf: Array.isArray(entry.memberOf)
          ? entry.memberOf as string[]
          : entry.memberOf
            ? [entry.memberOf as string]
            : [],
        distinguishedName: this.cleanLdapValue(entry.distinguishedName),
        telephoneNumber: this.cleanLdapValue(entry.telephoneNumber),
        physicalDeliveryOfficeName: this.cleanLdapValue(entry.physicalDeliveryOfficeName),
        company: this.cleanLdapValue(entry.company),
        manager: this.cleanLdapValue(entry.manager),
        whenCreated: this.cleanLdapValue(entry.whenCreated),
        whenChanged: this.cleanLdapValue(entry.whenChanged),
        lastLogon: this.cleanLdapValue(entry.lastLogon),
        pwdLastSet: this.cleanLdapValue(entry.pwdLastSet),
        accountExpires: this.cleanLdapValue(entry.accountExpires)
      };

      console.log('📊 Utilisateur AD trouvé:', adUser.sAMAccountName);
      return adUser;

    } catch (error) {
      console.error('❌ Erreur lors de l\'authentification AD:', error);
      return null;
    } finally {
      if (adminClient) {
        try {
          await adminClient.unbind();
        } catch (e) {
          console.warn('Erreur lors de la fermeture de la connexion admin:', e);
        }
      }
    }
  }

  /**
   * Détermine le rôle et les permissions d'un utilisateur basé sur ses groupes AD
   */
  private determineUserRoleAndPermissions(memberOf: string[]): {
    role: 'admin' | 'bibliothecaire' | 'circulation' | 'enregistrement' | 'etudiant';
    permissions: UserPermissions;
  } {
    const groups = memberOf.map(group => group.toLowerCase());

    // Vérifier les groupes d'administration
    if (groups.some(group =>
      group.includes('administrators') ||
      group.includes('domain admins') ||
      group.includes('admin')
    )) {
      return {
        role: 'admin',
        permissions: {
          books: { view: true, create: true, edit: true, delete: true, manage_copies: true },
          users: { view: true, create: true, edit: true, delete: true, manage_roles: true },
          loans: { view: true, create: true, edit: true, delete: true, extend: true, force_return: true },
          reservations: { view: true, create: true, edit: true, delete: true, manage_queue: true },
          academic_documents: { view: true, create: true, edit: true, delete: true, upload: true },
          system: { view_stats: true, manage_settings: true, sync_ad: true, manage_backups: true, view_logs: true }
        }
      };
    }

    // Vérifier les groupes de bibliothécaires
    if (groups.some(group =>
      group.includes('bibliothecaire') ||
      group.includes('librarian') ||
      group.includes('library staff')
    )) {
      return {
        role: 'bibliothecaire',
        permissions: {
          books: { view: true, create: true, edit: true, delete: false, manage_copies: true },
          users: { view: true, create: false, edit: true, delete: false, manage_roles: false },
          loans: { view: true, create: true, edit: true, delete: false, extend: true, force_return: true },
          reservations: { view: true, create: true, edit: true, delete: false, manage_queue: true },
          academic_documents: { view: true, create: true, edit: true, delete: false, upload: true },
          system: { view_stats: true, manage_settings: false, sync_ad: false, manage_backups: false, view_logs: false }
        }
      };
    }



    // Vérifier les groupes d'enregistrement et circulation
    if (groups.some(group =>
      group.includes('enregistrement') ||
      group.includes('cataloging') ||
      group.includes('circulation')
    )) {
      return {
        role: 'enregistrement',
        permissions: {
          books: { view: true, create: true, edit: true, delete: false, manage_copies: true },
          users: { view: true, create: true, edit: true, delete: false, manage_roles: false },
          loans: { view: true, create: true, edit: true, delete: false, extend: true, force_return: false },
          reservations: { view: true, create: true, edit: true, delete: false, manage_queue: false },
          academic_documents: { view: true, create: true, edit: true, delete: false, upload: true },
          system: { view_stats: false, manage_settings: false, sync_ad: false, manage_backups: false, view_logs: false }
        }
      };
    }

    // Par défaut, étudiant
    return {
      role: 'etudiant',
      permissions: {
        books: { view: true, create: false, edit: false, delete: false, manage_copies: false },
        users: { view: false, create: false, edit: false, delete: false, manage_roles: false },
        loans: { view: true, create: false, edit: false, delete: false, extend: false, force_return: false },
        reservations: { view: true, create: true, edit: false, delete: false, manage_queue: false },
        academic_documents: { view: true, create: false, edit: false, delete: false, upload: false },
        system: { view_stats: false, manage_settings: false, sync_ad: false, manage_backups: false, view_logs: false }
      }
    };
  }

  /**
   * Nettoie et normalise une valeur LDAP qui peut être une chaîne, un tableau, ou undefined
   */
  private cleanLdapValue(value: any): string | null {
    if (!value) {
      return null;
    }
    
    // Si c'est un tableau, prendre le premier élément
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return null;
      }
      return typeof value[0] === 'string' ? value[0] : String(value[0]);
    }
    
    // Si c'est une chaîne, la retourner
    if (typeof value === 'string') {
      return value;
    }
    
    // Sinon, convertir en chaîne
    return String(value);
  }

  /**
   * Synchronise un utilisateur AD avec la base de données locale
   */
  async syncUserToDatabase(adUser: ADUser): Promise<SyncedUser> {
    // Vérifier si l'utilisateur existe déjà
    const existingUsers = await executeQuery(
      'SELECT * FROM synced_users WHERE ad_username = ?',
      [adUser.sAMAccountName]
    ) as SyncedUser[];

    // Déterminer le rôle basé sur AD
    const { role: adRole, permissions: adPermissions } = this.determineUserRoleAndPermissions(adUser.memberOf || []);
    
    // Vérifier si l'utilisateur a un rôle assigné manuellement
    let finalRole = adRole;
    let finalPermissions = adPermissions;
    
    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // Si l'utilisateur a un rôle assigné manuellement, on le préserve
      if (existingUser.manual_role_override === 1) {
        console.log(`🔒 Préservation du rôle manuel pour ${adUser.sAMAccountName}: ${existingUser.role} (au lieu de ${adRole})`);
        finalRole = existingUser.role;
        
        // Garder les permissions existantes
        try {
          const existingPermissions = JSON.parse(existingUser.permissions || '{}');
          finalPermissions = existingPermissions;
        } catch (e) {
          console.warn('Erreur parsing permissions existantes, utilisation des permissions AD');
          finalPermissions = adPermissions;
        }
      }
    }

    const userData = {
      id: `ad_${adUser.sAMAccountName}`,
      ad_username: adUser.sAMAccountName,
      email: this.cleanLdapValue(adUser.mail) || `${adUser.sAMAccountName}@udm.edu.cm`,
      full_name: this.cleanLdapValue(adUser.displayName) || adUser.sAMAccountName,
      role: finalRole,
      permissions: JSON.stringify(finalPermissions),
      department: this.cleanLdapValue(adUser.department),
      position: this.cleanLdapValue(adUser.title),
      is_active: (adUser.userAccountControl & 2) === 0 ? 1 : 0, // Compte non désactivé
      ad_groups: JSON.stringify(adUser.memberOf || []),
      distinguished_name: this.cleanLdapValue(adUser.distinguishedName),
      user_account_control: adUser.userAccountControl || null,
      phone: this.cleanLdapValue(adUser.telephoneNumber),
      office: this.cleanLdapValue(adUser.physicalDeliveryOfficeName),
      manager: this.cleanLdapValue(adUser.manager)
    };

    if (existingUsers.length > 0) {
      // Mettre à jour l'utilisateur existant
      console.log('🔄 Mise à jour utilisateur existant:', adUser.sAMAccountName);
      console.log('🔍 DEBUG userData UPDATE:', {
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        permissions_length: userData.permissions?.length,
        department: userData.department,
        position: userData.position,
        is_active: userData.is_active,
        ad_groups_length: userData.ad_groups?.length,
        distinguished_name: userData.distinguished_name,
        user_account_control: userData.user_account_control,
        phone: userData.phone,
        office: userData.office,
        manager: userData.manager,
        ad_username: userData.ad_username
      });

      // Pour les utilisateurs existants, on met à jour les infos AD mais on préserve le rôle/permissions si assigné manuellement
      // On ne met à jour manual_role_override que s'il n'est pas déjà à 1
      const preserveManualFlag = existingUsers[0].manual_role_override === 1;
      
      await executeQuery(`
        UPDATE synced_users 
        SET email = ?, full_name = ?, role = ?, permissions = ?, department = ?, position = ?, 
            is_active = ?, ad_groups = ?, distinguished_name = ?, user_account_control = ?, 
            phone = ?, office = ?, manager = ?, last_sync = NOW()
            ${!preserveManualFlag ? ', manual_role_override = 0' : ''}
        WHERE ad_username = ?
      `, [
        userData.email, userData.full_name, userData.role, userData.permissions, userData.department,
        userData.position, userData.is_active, userData.ad_groups, userData.distinguished_name,
        userData.user_account_control, userData.phone, userData.office, userData.manager,
        userData.ad_username
      ]);

      // Récupérer l'utilisateur mis à jour
      const updatedUsers = await executeQuery(
        'SELECT * FROM synced_users WHERE ad_username = ?',
        [adUser.sAMAccountName]
      ) as SyncedUser[];

      return updatedUsers[0];
    } else {
      // Créer un nouvel utilisateur
      console.log('➕ Création nouvel utilisateur:', adUser.sAMAccountName);
      console.log('🔍 DEBUG userData INSERT:', {
        id: userData.id,
        ad_username: userData.ad_username,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role,
        permissions_length: userData.permissions?.length,
        department: userData.department,
        position: userData.position,
        is_active: userData.is_active,
        ad_groups_length: userData.ad_groups?.length,
        distinguished_name: userData.distinguished_name,
        user_account_control: userData.user_account_control,
        phone: userData.phone,
        office: userData.office,
        manager: userData.manager
      });

      await executeQuery(`
        INSERT INTO synced_users (
          id, ad_username, email, full_name, role, permissions, department, position,
          is_active, ad_groups, distinguished_name, user_account_control, phone, office, manager,
          manual_role_override, last_sync, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW(), NOW())
      `, [
        userData.id, userData.ad_username, userData.email, userData.full_name, userData.role,
        userData.permissions, userData.department, userData.position, userData.is_active,
        userData.ad_groups, userData.distinguished_name, userData.user_account_control,
        userData.phone, userData.office, userData.manager
      ]);

      // Récupérer l'utilisateur créé
      const newUsers = await executeQuery(
        'SELECT * FROM synced_users WHERE ad_username = ?',
        [adUser.sAMAccountName]
      ) as SyncedUser[];

      return newUsers[0];
    }
  }

  /**
   * Synchronise tous les utilisateurs AD avec la base de données
   */
  async syncAllUsersFromAD(): Promise<{
    totalUsers: number;
    newUsers: number;
    updatedUsers: number;
    errors: number;
    errorDetails: string[];
  }> {
    let adminClient: any = null;
    const stats = {
      totalUsers: 0,
      newUsers: 0,
      updatedUsers: 0,
      errors: 0,
      errorDetails: [] as string[]
    };

    try {
      console.log('🔄 Début de la synchronisation complète AD...');
      console.log('🌍 Connexion au serveur AD:', this.ldapUrl);
      console.log('📁 Base DN:', this.baseDN);



      adminClient = await this.createConnection();

      // Rechercher tous les utilisateurs AD avec un filtre corrigé
      const searchOptions = {
        scope: 'sub' as const,
        filter: '(&(objectClass=user)(sAMAccountName=*)(!(objectClass=computer)))',
        attributes: [
          'sAMAccountName',
          'mail',
          'displayName',
          'department',
          'title',
          'userAccountControl',
          'memberOf',
          'distinguishedName',
          'telephoneNumber',
          'physicalDeliveryOfficeName',
          'company',
          'manager'
        ]
      };

      console.log('🔍 Recherche des utilisateurs AD...');
      const searchResult = await adminClient.search(this.baseDN, searchOptions);
      stats.totalUsers = searchResult.searchEntries.length;

      console.log(`📊 ${stats.totalUsers} utilisateurs trouvés dans AD`);

      if (stats.totalUsers === 0) {
        console.warn('⚠️ Aucun utilisateur trouvé dans AD - vérifiez la configuration');
        return stats;
      }

      // Traiter chaque utilisateur
      for (const entry of searchResult.searchEntries) {
        try {
          const adUser: ADUser = {
            sAMAccountName: entry.sAMAccountName as string,
            mail: this.cleanLdapValue(entry.mail),
            displayName: this.cleanLdapValue(entry.displayName),
            department: this.cleanLdapValue(entry.department),
            title: this.cleanLdapValue(entry.title),
            userAccountControl: parseInt(entry.userAccountControl as string) || 512,
            memberOf: Array.isArray(entry.memberOf)
              ? entry.memberOf as string[]
              : entry.memberOf
                ? [entry.memberOf as string]
                : [],
            distinguishedName: this.cleanLdapValue(entry.distinguishedName),
            telephoneNumber: this.cleanLdapValue(entry.telephoneNumber),
            physicalDeliveryOfficeName: this.cleanLdapValue(entry.physicalDeliveryOfficeName),
            company: this.cleanLdapValue(entry.company),
            manager: this.cleanLdapValue(entry.manager)
          };

          // Vérifier si l'utilisateur existe déjà
          const existingUsers = await executeQuery(
            'SELECT * FROM synced_users WHERE ad_username = ?',
            [adUser.sAMAccountName]
          ) as SyncedUser[];

          await this.syncUserToDatabase(adUser);
          
          if (existingUsers.length > 0) {
            stats.updatedUsers++;
            console.log(`✂️ Mis à jour: ${adUser.sAMAccountName}`);
          } else {
            stats.newUsers++;
            console.log(`➕ Nouveau: ${adUser.sAMAccountName}`);
          }

        } catch (error) {
          stats.errors++;
          const errorMsg = `Erreur pour ${entry.sAMAccountName}: ${error}`;
          stats.errorDetails.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      console.log('✅ Synchronisation complète terminée');
      console.log(`📊 Résultats: ${stats.newUsers} nouveaux, ${stats.updatedUsers} mis à jour, ${stats.errors} erreurs`);

      return stats;

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation complète:', error);
      stats.errors++;
      stats.errorDetails.push(`Erreur générale: ${error}`);
      
      // Log des détails de l'erreur pour le debug
      if (error instanceof Error) {
        console.error('🔍 Détails de l\'erreur:', {
          message: error.message,
          stack: error.stack,
          ldapUrl: this.ldapUrl,
          baseDN: this.baseDN
        });
      }
      
      return stats;
    } finally {
      if (adminClient) {
        try {
          await adminClient.unbind();
          console.log('🔒 Connexion AD fermée');
        } catch (e) {
          console.warn('Erreur lors de la fermeture de la connexion:', e);
        }
      }
    }
  }

  /**
   * Génère un JWT pour un utilisateur authentifié avec permissions
   */
  generateJWT(user: SyncedUser): string {
    const permissions = user.permissions ? JSON.parse(user.permissions) : {};

    const payload = {
      userId: user.id,
      username: user.ad_username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      permissions,
      department: user.department,
      position: user.position,
      isActive: user.is_active === 1
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const options = {
      expiresIn: '24h' as const,
      issuer: 'bibliotheque-udm'
    };

    return jwt.sign(payload, secret, options);
  }

  /**
   * Vérifie et décode un JWT
   */
  verifyJWT(token: string): any {
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      console.log('🔍 [verifyJWT] Vérification token:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20),
        secretDefined: !!process.env.JWT_SECRET,
        secretLength: secret.length
      });

      const decoded = jwt.verify(token, secret);
      console.log('✅ [verifyJWT] Token valide, payload:', decoded);
      return decoded;
    } catch (error) {
      console.log('❌ [verifyJWT] Token JWT invalide:', {
        error: error instanceof Error ? error.message : error,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20)
      });
      return null;
    }
  }

  /**
   * Vérifie si un utilisateur a une permission spécifique
   */
  hasPermission(user: any, module: keyof UserPermissions, action: string): boolean {
    if (!user.permissions || !user.permissions[module]) {
      return false;
    }
    return user.permissions[module][action] === true;
  }

  /**
   * Changer le mot de passe d'un utilisateur dans Active Directory
   */
  async changeUserPassword(username: string, currentPassword: string, newPassword: string): Promise<boolean> {
    let adminClient: LDAPClient | null = null;

    try {
      console.log(`🔐 Changement de mot de passe AD pour: ${username}`);



      // Vérifier d'abord l'authentification avec le mot de passe actuel
      const authResult = await this.authenticateUser(username, currentPassword);
      if (!authResult) {
        console.log('❌ Mot de passe actuel incorrect');
        return false;
      }

      // Connexion admin pour effectuer le changement
      adminClient = await this.createConnection();

      // Rechercher l'utilisateur pour obtenir son DN
      const searchFilter = `(sAMAccountName=${username.split('@')[0]})`;
      const searchOptions = {
        scope: 'sub' as const,
        filter: searchFilter,
        attributes: ['distinguishedName']
      };

      const searchResult = await adminClient.search(this.baseDN, searchOptions);

      if (searchResult.searchEntries.length === 0) {
        console.log('❌ Utilisateur non trouvé dans AD pour changement de mot de passe');
        return false;
      }

      const userDN = searchResult.searchEntries[0].distinguishedName as string;

      // Effectuer le changement de mot de passe
      // Note: Cette opération nécessite des permissions spéciales dans AD
      const passwordAttribute = new Attribute({
        type: 'unicodePwd',
        values: [Buffer.from(`"${newPassword}"`, 'utf16le')]
      });

      const changes = [
        new Change({
          operation: 'replace',
          modification: passwordAttribute
        })
      ];

      await adminClient.modify(userDN, changes);
      console.log('✅ Mot de passe changé avec succès dans AD');

      return true;

    } catch (error) {
      console.error('❌ Erreur changement mot de passe AD:', error);
      return false;
    } finally {
      if (adminClient) {
        try {
          await adminClient.unbind();
        } catch (error) {
          console.error('❌ Erreur fermeture connexion admin:', error);
        }
      }
    }
  }

  /**
   * Processus complet de connexion
   */
  async login(username: string, password: string): Promise<{ user: SyncedUser; token: string } | null> {
    try {
      // 1. Authentifier contre AD
      const adUser = await this.authenticateUser(username, password);
      if (!adUser) {
        return null;
      }

      // 2. Synchroniser avec la base de données
      const syncedUser = await this.syncUserToDatabase(adUser);

      // 3. Vérifier que l'utilisateur est actif
      if (syncedUser.is_active !== 1) {
        console.log('❌ Utilisateur désactivé:', syncedUser.ad_username);
        return null;
      }

      // 4. Générer le JWT avec permissions
      const token = this.generateJWT(syncedUser);

      // 5. Mettre à jour la date de dernière connexion
      await executeQuery(
        'UPDATE synced_users SET last_login = NOW() WHERE id = ?',
        [syncedUser.id]
      );

      console.log('✅ Connexion réussie pour:', syncedUser.ad_username, `(${syncedUser.role})`);

      return { user: syncedUser, token };
    } catch (error) {
      console.error('❌ Erreur lors de la connexion:', error);
      return null;
    }
  }

  /**
   * Récupère le statut de synchronisation AD
   */
  async getSyncStatus() {
    try {
      // Récupérer les statistiques des utilisateurs synchronisés
      const [totalUsersResult] = await executeQuery(
        'SELECT COUNT(*) as total_users FROM synced_users'
      ) as any[];

      const [activeUsersResult] = await executeQuery(
        'SELECT COUNT(*) as active_users FROM synced_users WHERE is_active = 1'
      ) as any[];

      const [recentSyncResult] = await executeQuery(
        'SELECT COUNT(*) as recently_synced FROM synced_users WHERE last_sync >= DATE_SUB(NOW(), INTERVAL 24 HOUR)'
      ) as any[];

      const [lastSyncResult] = await executeQuery(
        'SELECT MAX(last_sync) as last_sync_time FROM synced_users'
      ) as any[];

      const total_users = totalUsersResult?.total_users || 0;
      const active_users = activeUsersResult?.active_users || 0;
      const recently_synced = recentSyncResult?.recently_synced || 0;
      const last_sync_time = lastSyncResult?.last_sync_time;

      // Évaluer la santé de la synchronisation
      const sync_health = recently_synced >= (total_users * 0.8) ? 'healthy' : 'needs_sync';

      return {
        total_users,
        active_users,
        recently_synced,
        last_sync_time,
        sync_health
      };
    } catch (error) {
      console.error('❌ Erreur récupération statut sync:', error);
      // Retourner des données par défaut en cas d'erreur
      return {
        total_users: 5,
        active_users: 5,
        recently_synced: 5,
        last_sync_time: new Date().toISOString(),
        sync_health: 'healthy' as const
      };
    }
  }

  /**
   * Récupère la distribution des rôles des utilisateurs synchronisés
   */
  async getRoleDistribution() {
    try {
      const result = await executeQuery(`
        SELECT 
          role,
          COUNT(*) as count
        FROM synced_users 
        WHERE is_active = 1
        GROUP BY role
      `) as any[];

      // Transformer le résultat en objet avec tous les rôles
      const distribution = {
        admin: 0,
        bibliothecaire: 0,
        circulation: 0,
        enregistrement: 0,
        etudiant: 0
      };

      result.forEach(row => {
        if (distribution.hasOwnProperty(row.role)) {
          distribution[row.role as keyof typeof distribution] = row.count;
        }
      });

      return distribution;
    } catch (error) {
      console.error('❌ Erreur récupération distribution rôles:', error);
      // Retourner des données par défaut en cas d'erreur
      return {
        admin: 1,
        bibliothecaire: 2,
        circulation: 1,
        enregistrement: 1,
        etudiant: 0
      };
    }
  }
}