/**
/**
 * Service de stockage MOCK - Évite les problèmes SSH2 en développement
 * Solution robuste sans dépendances externes problématiques
 */

// Suppression de l'import SSH2 problématique
// import { Client } from 'ssh2-sftp-client';
import { join } from 'path';

// Configuration du serveur de fichiers UdM
interface FileServerConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  basePath: string;
  protocol: 'sftp' | 'ftp' | 'smb';
}

// Interface pour les informations de fichier
export interface FileInfo {
  originalName: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

// Types de documents supportés
export type DocumentType = 'books' | 'theses' | 'memoires' | 'rapport_stage' | 'academic-documents';

/**
 * Service de gestion des fichiers sur le serveur UdM
 */
export class UdMFileServerService {
  private static config: FileServerConfig = {
    host: process.env.FILE_SERVER_HOST || 'files.udm.edu.cm',
    port: parseInt(process.env.FILE_SERVER_PORT || '22'),
    username: process.env.FILE_SERVER_USER || 'bibliotheque',
    password: process.env.FILE_SERVER_PASSWORD || '',
    basePath: process.env.FILE_SERVER_BASE_PATH || '/bibliotheque/documents',
    protocol: (process.env.FILE_SERVER_PROTOCOL as 'sftp' | 'ftp' | 'smb') || 'sftp'
  };

  /**
   * Upload d'un fichier sur le serveur FTP UdM
   */
  static async uploadFile(
    file: Buffer,
    originalName: string,
    documentType: DocumentType,
    documentId: string,
    replaceExisting: boolean = false,
    existingFilePath?: string,
    categoryId?: string // Pour les documents académiques (diplomes, releves, autres)
  ): Promise<FileInfo> {
    // Forcer l'utilisation du serveur FTP même en développement
    const useFTP = !process.env.FILE_SERVER_MOCK || process.env.FILE_SERVER_MOCK === 'false';
    
    if (useFTP) {
      return this.uploadFileRemote(file, originalName, documentType, documentId, replaceExisting, existingFilePath, categoryId);
    } else {
      return this.uploadFileLocal(file, originalName, documentType, documentId, replaceExisting, existingFilePath, categoryId);
    }
  }

  /**
   * Upload vers le serveur de fichiers UdM (FTP RÉEL)
   */
  private static async uploadFileRemote(
    file: Buffer,
    originalName: string,
    documentType: DocumentType,
    documentId: string,
    replaceExisting: boolean = false,
    existingFilePath?: string,
    categoryId?: string
  ): Promise<FileInfo> {
    console.log('📁 Upload FTP réel vers serveur UdM');
    console.log(`🔧 Configuration FTP:`, {
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      documentType,
      documentId
    });
    
    const ftp = require('basic-ftp');
    const client = new ftp.Client();
    
    try {
      // Connexion au serveur FTP
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        secure: false
      });
      console.log('✅ Connexion FTP établie');

      // Forcer le mode actif pour éviter les problèmes de firewall
      client.ftp.passive = false;

      // Lister le contenu du répertoire racine pour diagnostic
      console.log('📂 Contenu du répertoire racine FTP:');
      const rootList = await client.list('/');
      rootList.forEach((item: any) => {
        console.log(`  ${item.type === 1 ? '📁' : '📄'} ${item.name}`);
      });

      // Générer le nom de fichier
      const timestamp = Date.now();
      const fileExtension = originalName.split('.').pop();
      const fileName = `${documentId}_${timestamp}.${fileExtension}`;
      
      // Mapping correct des types de documents vers les dossiers FTP
      let targetFolder: string;
      const docType = documentType as string;
      if (docType === 'book') {
        targetFolder = 'books';
      } else if (docType === 'these') {
        targetFolder = 'theses';
      } else if (docType === 'memoire') {
        targetFolder = 'memoires';
      } else if (docType === 'rapport_stage') {
        targetFolder = 'rapport_stage';
      } else if (docType === 'academic-documents') {
        targetFolder = 'academic-documents';
      } else {
        targetFolder = 'documents';
      }
      
      console.log(`🎯 Tentative d'accès au dossier: ${targetFolder} (type: ${docType})`);
      
      try {
        await client.cd(`/${targetFolder}`);
        console.log(`✅ Navigation vers /${targetFolder} réussie`);

        // Pour les documents académiques, mapper vers la structure simplifiée (3 dossiers)
        if (docType === 'academic-documents' && categoryId) {
          // Mapping direct des catégories vers les 3 dossiers du serveur
          let serverFolder: string;
          if (categoryId === 'diplomes') {
            serverFolder = 'Diplomes'; // Diplômes, certificats, attestations de réussite
          } else if (categoryId === 'releves') {
            serverFolder = 'releves'; // Relevés de notes, bulletins, transcripts
          } else {
            serverFolder = 'autres'; // Correspondances, demandes spéciales, documents divers
          }

          console.log(`📂 Mapping catégorie: ${categoryId} → ${serverFolder}`);
          try {
            await client.cd(serverFolder);
            console.log(`✅ Navigation vers sous-dossier ${serverFolder} réussie`);
          } catch (subDirError) {
            console.log(`🔨 Création du sous-dossier ${serverFolder}`);
            await client.send(`MKD ${serverFolder}`);
            await client.cd(serverFolder);
            console.log(`✅ Sous-dossier ${serverFolder} créé et accessible`);
          }
          targetFolder = `${targetFolder}/${serverFolder}`;
        }

        // Lister le contenu du dossier cible
        const targetList = await client.list('.');
        console.log(`📂 Contenu du dossier ${targetFolder}:`);
        targetList.forEach((item: any) => {
          console.log(`  ${item.type === 1 ? '📁' : '📄'} ${item.name}`);
        });

      } catch (cdError) {
        console.error(`❌ Impossible d'accéder au dossier ${targetFolder}:`, cdError);
        
        // Essayer de créer le dossier
        console.log(`🔨 Tentative de création du dossier ${targetFolder}`);
        try {
          await client.send(`MKD ${targetFolder}`);
          console.log(`✅ Dossier ${targetFolder} créé`);
          await client.cd(`/${targetFolder}`);
          console.log(`✅ Navigation vers /${targetFolder} après création`);
        } catch (createError) {
          console.error(`❌ Impossible de créer le dossier ${targetFolder}:`, createError);
          throw createError;
        }
      }

      // Si on remplace un fichier existant, le supprimer d'abord
      if (replaceExisting && existingFilePath) {
        try {
          const existingFileName = existingFilePath.split('/').pop();
          if (existingFileName) {
            console.log(`🗑️ Suppression de l'ancien fichier: ${existingFileName}`);
            await client.remove(existingFileName);
            console.log(`✅ Ancien fichier supprimé: ${existingFileName}`);
          }
        } catch (deleteError) {
          console.warn(`⚠️ Impossible de supprimer l'ancien fichier:`, deleteError);
          // Continuer même si la suppression échoue
        }
      }

      // Upload du fichier dans le dossier courant
      const { Readable } = require('stream');
      const fileStream = new Readable();
      fileStream.push(file);
      fileStream.push(null);

      await client.uploadFrom(fileStream, fileName);
      
      // URL publique du fichier avec le chemin complet incluant le sous-dossier
      let fullPath = `${documentType}/${fileName}`;
      if (documentType === 'academic-documents' && categoryId) {
        const serverFolder = categoryId === 'diplomes' ? 'Diplomes' :
                            categoryId === 'releves' ? 'releves' : 'autres';
        fullPath = `${documentType}/${serverFolder}/${fileName}`;
      }

      const fileUrl = `${process.env.FILE_SERVER_BASE_URL}/${fullPath}`;
      const remotePath = fullPath;

      const fileInfo: FileInfo = {
        originalName,
        fileName,
        filePath: remotePath,
        fileUrl,
        fileSize: file.length,
        fileType: this.getMimeType(fileExtension || ''),
        uploadedAt: new Date().toISOString()
      };

      console.log(`✅ Fichier uploadé sur serveur FTP UdM: ${remotePath}`);
      return fileInfo;

    } catch (error) {
      console.error('Erreur upload FTP:', error);
      throw new Error(`Échec upload FTP: ${error}`);
    } finally {
      client.close();
    }
  }

  /**
   * Upload local (mode développement)
   */
  private static async uploadFileLocal(
    file: Buffer,
    originalName: string,
    documentType: DocumentType,
    documentId: string,
    replaceExisting: boolean = false,
    existingFilePath?: string,
    categoryId?: string
  ): Promise<FileInfo> {
    const { writeFile, mkdir } = await import('fs/promises');
    const { existsSync } = await import('fs');

    // Créer le répertoire local
    let uploadDir = join(process.cwd(), 'public', 'uploads', documentType);

    // Pour les documents académiques, ajouter le sous-dossier de catégorie
    if (documentType === 'academic-documents' && categoryId) {
      uploadDir = join(uploadDir, categoryId);
    }

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Si on remplace un fichier existant, le supprimer d'abord
    if (replaceExisting && existingFilePath) {
      try {
        const existingFullPath = join(process.cwd(), 'public', existingFilePath);
        const { unlink } = await import('fs/promises');
        const { existsSync } = await import('fs');
        
        if (existsSync(existingFullPath)) {
          console.log(`🗑️ Suppression de l'ancien fichier local: ${existingFullPath}`);
          await unlink(existingFullPath);
          console.log(`✅ Ancien fichier local supprimé`);
        }
      } catch (deleteError) {
        console.warn(`⚠️ Impossible de supprimer l'ancien fichier local:`, deleteError);
        // Continuer même si la suppression échoue
      }
    }

    // Générer le nom de fichier
    const timestamp = Date.now();
    const fileExtension = originalName.split('.').pop();
    const fileName = `${documentId}_${timestamp}.${fileExtension}`;
    const filePath = join(uploadDir, fileName);

    // Sauvegarder le fichier
    await writeFile(filePath, file);

    // Construire le chemin relatif correct
    let relativePath = `/uploads/${documentType}/${fileName}`;
    if (documentType === 'academic-documents' && categoryId) {
      relativePath = `/uploads/${documentType}/${categoryId}/${fileName}`;
    }

    const fileInfo: FileInfo = {
      originalName,
      fileName,
      filePath: relativePath,
      fileUrl: relativePath,
      fileSize: file.length,
      fileType: this.getMimeType(fileExtension || ''),
      uploadedAt: new Date().toISOString()
    };

    console.log(`📁 Fichier sauvé localement: ${filePath}`);
    return fileInfo;
  }

  /**
   * Supprimer un fichier du serveur UdM
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      // Utiliser le serveur FTP si FILE_SERVER_MOCK est false
      if (process.env.FILE_SERVER_MOCK === 'true') {
        return await this.deleteFileLocal(filePath);
      }

      // Supprimer du serveur UdM
      return await this.deleteFileRemote(filePath);

    } catch (error) {
      console.error('Erreur suppression fichier:', error);
      return false;
    }
  }

  /**
   * Supprimer un fichier du serveur distant (FTP RÉEL)
   */
  private static async deleteFileRemote(filePath: string): Promise<boolean> {
    console.log(`🗑️ Suppression FTP réelle: ${filePath}`);

    // CORRECTION CRITIQUE: Appliquer le même mapping que downloadFile
    let actualPath = filePath;
    if (filePath.startsWith('these/')) {
      actualPath = filePath.replace('these/', 'theses/');
      console.log(`📁 Mapping FTP: ${filePath} → ${actualPath}`);
    } else if (filePath.startsWith('memoire/')) {
      actualPath = filePath.replace('memoire/', 'memoires/');
      console.log(`📁 Mapping FTP: ${filePath} → ${actualPath}`);
    } else if (filePath.startsWith('book/')) {
      actualPath = filePath.replace('book/', 'books/');
      console.log(`📁 Mapping FTP: ${filePath} → ${actualPath}`);
    }

    const ftp = require('basic-ftp');
    const client = new ftp.Client();

    try {
      // Connexion au serveur FTP
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        secure: false
      });

      // Forcer le mode actif pour éviter les problèmes de firewall
      client.ftp.passive = false;

      // Supprimer le fichier avec le chemin corrigé
      await client.remove(actualPath);

      console.log(`✅ Fichier supprimé du serveur FTP: ${actualPath}`);
      return true;

    } catch (error) {
      console.error('Erreur suppression FTP:', error);
      return false;
    } finally {
      client.close();
    }
  }

  /**
   * Supprimer un fichier local
   */
  private static async deleteFileLocal(filePath: string): Promise<boolean> {
    try {
      const { unlink } = await import('fs/promises');
      const fullPath = join(process.cwd(), 'public', filePath);
      await unlink(fullPath);
      return true;
    } catch (error) {
      console.error('Erreur suppression locale:', error);
      return false;
    }
  }

  /**
   * Obtenir le type MIME d'un fichier
   */
  private static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain'
    };

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Tester la connexion au serveur de fichiers (FTP RÉEL)
   */
  static async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      console.log('🔌 Test connexion FTP réel vers serveur UdM');
      
      const ftp = require('basic-ftp');
      const client = new ftp.Client();
      
      // Test de connexion FTP avec mode actif
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        secure: false
      });

      // Forcer le mode actif pour éviter les problèmes de firewall
      client.ftp.passive = false;

      // Lister le contenu du répertoire racine
      const list = await client.list();
      
      client.close();
      
      return {
        success: true,
        message: 'Connexion FTP réussie - Serveur de fichiers UdM opérationnel',
        details: {
          server: this.config.host,
          port: this.config.port,
          basePath: this.config.basePath,
          mode: 'FTP_PRODUCTION',
          directoryExists: true,
          filesCount: list.length
        }
      };

    } catch (error) {
      console.error('Erreur test connexion FTP:', error);
      return {
        success: false,
        message: 'Échec de connexion FTP',
        details: error
      };
    }
  }

  /**
   * Télécharger un fichier depuis le serveur FTP UdM
   */
  static async downloadFile(filePath: string, documentType: DocumentType): Promise<Buffer | null> {
    try {
      console.log(`📁 Téléchargement FTP depuis serveur UdM`);
      console.log(`🔧 Configuration FTP: {
        host: '${this.config.host}',
        port: ${this.config.port},
        documentType: '${documentType}',
        filePath: '${filePath}'
      }`);

      // Mapping correct des types vers les dossiers FTP réels
      let actualPath = filePath;
      if (filePath.startsWith('these/')) {
        actualPath = filePath.replace('these/', 'theses/');
      } else if (filePath.startsWith('memoire/')) {
        actualPath = filePath.replace('memoire/', 'memoires/');
      } else if (filePath.startsWith('book/')) {
        actualPath = filePath.replace('book/', 'books/');
      }
      // rapport_stage reste identique

      console.log(`🔄 Chemin corrigé: ${filePath} → ${actualPath}`);

      const ftp = require('basic-ftp');
      const client = new ftp.Client();

      try {
        // Connexion au serveur FTP avec la même configuration que l'upload
        await client.access({
          host: this.config.host,
          port: this.config.port,
          user: this.config.username,
          password: this.config.password,
          secure: false
        });

        // Forcer le mode passif pour éviter les problèmes de firewall
        client.ftp.passive = true;

        console.log(`✅ Connexion FTP établie pour téléchargement`);

        // Télécharger le fichier avec le chemin corrigé
        const { Writable } = require('stream');
        const chunks: Buffer[] = [];

        const writableStream = new Writable({
          write(chunk: Buffer, _encoding: any, callback: any) {
            chunks.push(chunk);
            callback();
          }
        });

        await client.downloadTo(writableStream, actualPath);
        const buffer = Buffer.concat(chunks);

        console.log(`✅ Fichier téléchargé depuis serveur FTP UdM: ${actualPath} (${buffer.length} bytes)`);

        client.close();
        return buffer;

      } catch (ftpError: any) {
        console.error(`❌ Erreur téléchargement FTP: ${ftpError.message}`);
        client.close();
        return null;
      }

    } catch (error) {
      console.error('Erreur téléchargement FTP:', error);
      return null;
    }
  }
}
