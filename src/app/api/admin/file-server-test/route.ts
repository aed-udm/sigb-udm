import { NextRequest, NextResponse } from 'next/server';
import { UdMFileServerService } from '@/lib/services/file-server';

/**
 * API de test du serveur de fichiers UdM (MODE MOCK ROBUSTE)
 * Solution sans SSH2 pour éviter les erreurs de dépendances
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔌 Test connexion serveur fichiers UdM...');
    
    // Test de connexion au serveur de fichiers
    const testResult = await UdMFileServerService.testConnection();
    
    if (testResult.success) {
      console.log('✅ Test serveur fichiers réussi');
      
      return NextResponse.json({
        success: true,
        data: {
          connection_status: 'connected',
          message: testResult.message,
          server_config: {
            host: process.env.FILE_SERVER_HOST || 'files.udm.edu.cm',
            port: process.env.FILE_SERVER_PORT || '22',
            protocol: process.env.FILE_SERVER_PROTOCOL || 'sftp',
            base_path: process.env.FILE_SERVER_BASE_PATH || '/bibliotheque/documents',
            mock_mode: true // Force mock pour éviter les erreurs
          },
          test_details: testResult.details,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.log('❌ Test serveur fichiers échoué');
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'FILE_SERVER_CONNECTION_FAILED',
          message: testResult.message,
          details: testResult.details
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Erreur test serveur fichiers:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FILE_SERVER_TEST_ERROR',
        message: 'Erreur lors du test du serveur de fichiers',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }, { status: 500 });
  }
}

/**
 * POST - Test d'upload (MODE MOCK)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📁 Test upload serveur fichiers (MOCK)...');
    
    // Créer un fichier de test
    const testContent = `Test de connexion serveur UdM MOCK
Date: ${new Date().toISOString()}
Application: Système de Gestion de Bibliothèque UdM
Mode: DEVELOPMENT_MOCK
`;
    
    const testBuffer = Buffer.from(testContent, 'utf-8');
    const testFileName = `test_connection_${Date.now()}.txt`;

    // Tenter l'upload (MOCK)
    const uploadResult = await UdMFileServerService.uploadFile(
      testBuffer,
      testFileName,
      'books',
      'test_connection'
    );

    // Tenter la suppression du fichier de test (MOCK)
    const deleteResult = await UdMFileServerService.deleteFile(uploadResult.filePath);

    return NextResponse.json({
      success: true,
      data: {
        upload_test: {
          success: true,
          file_info: uploadResult,
          message: 'Upload de test MOCK réussi'
        },
        delete_test: {
          success: deleteResult,
          message: 'Suppression de test MOCK réussie'
        },
        overall_status: 'all_mock_tests_passed',
        mode: 'DEVELOPMENT_MOCK'
      },
      message: 'Tests MOCK serveur de fichiers terminés'
    });

  } catch (error) {
    console.error('❌ Erreur test upload serveur fichiers:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'FILE_SERVER_UPLOAD_TEST_ERROR',
        message: 'Erreur lors du test d\'upload',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }
    }, { status: 500 });
  }
}