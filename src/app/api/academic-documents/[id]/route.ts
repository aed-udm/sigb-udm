import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, getThesisById, getMemoireById, getStageReportById } from '@/lib/mysql';
import { logCrudOperation, logError } from '@/lib/system-logger';
import { UdMFileServerService } from '@/lib/services/file-server';

/**
 * 🎯 Fonction utilitaire pour mapper le statut calculé vers le statut unifié
 */
function mapCalculatedStatusToAvailability(calculatedStatus: string): string {
  switch (calculatedStatus) {
    case 'available':
      return 'disponible';
    case 'borrowed':
    case 'reserved':
    case 'unavailable':
      return 'indisponible';
    default:
      return 'unknown';
  }
}

// Fonction utilitaire pour nettoyer les valeurs undefined
function cleanParams(params: any[]): any[] {
  return params.map(param => param === undefined ? null : param);
}

// GET /api/academic-documents/[id] - Récupérer un document spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Nettoyer l'ID en retirant les préfixes si présents
    let cleanId = id;
    let documentType = '';
    
    if (id.startsWith('mem_')) {
      cleanId = id.replace('mem_', '');
      documentType = 'memoire';
    } else if (id.startsWith('stage_')) {
      cleanId = id.replace('stage_', '');
      documentType = 'rapport_stage';
    } else {
      // Pour les thèses ou IDs sans préfixe, vérifier dans la vue
      const typeQuery = `SELECT document_type FROM academic_documents WHERE id = ?`;
      const typeRows = await executeQuery(typeQuery, [id]);
      
      if ((typeRows as any[]).length === 0) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Document non trouvé' } },
          { status: 404 }
        );
      }
      
      documentType = (typeRows as any[])[0].document_type;
      cleanId = id;
    }

    // 🚨 CORRECTION CRITIQUE : Utiliser les fonctions corrigées avec calcul de statut en temps réel
    let document: any = null;

    switch (documentType) {
      case 'these':
        document = await getThesisById(cleanId);
        if (document) {
          // Adapter les noms de champs pour compatibilité avec l'interface
          document.author = document.main_author;
          document.supervisor = document.director;
          document.degree = document.target_degree;
          document.year = document.defense_year;
          document.document_type = 'these';

          // 🎯 NOUVEAU : Mapper le statut calculé vers le statut unifié
          document.availability_status = mapCalculatedStatusToAvailability(document.status);
          document.is_borrowed = document.status === 'borrowed';
          document.is_reserved = document.status === 'reserved';
        }
        break;
      case 'memoire':
        document = await getMemoireById(cleanId);
        if (document) {
          // Adapter les noms de champs pour compatibilité avec l'interface
          document.author = document.main_author;
          document.degree = document.degree_level;
          document.document_type = 'memoire';
          // Calculer l'année à partir de defense_date ou academic_year
          if (document.defense_date) {
            document.year = new Date(document.defense_date).getFullYear();
          } else if (document.academic_year && document.academic_year.match(/^[0-9]{4}-[0-9]{4}$/)) {
            document.year = parseInt(document.academic_year.substring(0, 4));
          } else if (document.academic_year && document.academic_year.match(/^[0-9]{4}$/)) {
            document.year = parseInt(document.academic_year);
          } else {
            document.year = new Date(document.created_at).getFullYear();
          }

          // 🎯 NOUVEAU : Mapper le statut calculé vers le statut unifié
          document.availability_status = mapCalculatedStatusToAvailability(document.status);
          document.is_borrowed = document.status === 'borrowed';
          document.is_reserved = document.status === 'reserved';
        }
        break;
      case 'rapport_stage':
        document = await getStageReportById(cleanId);
        if (document) {
          // Adapter les noms de champs pour compatibilité avec l'interface
          document.author = document.student_name;
          document.degree = document.degree_level;
          document.document_type = 'rapport_stage';
          document.abstract = document.objectives;
          document.is_accessible = true; // Les rapports de stage sont toujours accessibles
          // Calculer l'année à partir de defense_date, stage_end_date ou academic_year
          if (document.defense_date) {
            document.year = new Date(document.defense_date).getFullYear();
          } else if (document.stage_end_date) {
            document.year = new Date(document.stage_end_date).getFullYear();
          } else if (document.academic_year && document.academic_year.match(/^[0-9]{4}-[0-9]{4}$/)) {
            document.year = parseInt(document.academic_year.substring(0, 4));
          } else if (document.academic_year && document.academic_year.match(/^[0-9]{4}$/)) {
            document.year = parseInt(document.academic_year);
          } else {
            document.year = new Date(document.created_at).getFullYear();
          }

          // 🎯 NOUVEAU : Mapper le statut calculé vers le statut unifié
          document.availability_status = mapCalculatedStatusToAvailability(document.status);
          document.is_borrowed = document.status === 'borrowed';
          document.is_reserved = document.status === 'reserved';
        }
        break;
      default:
        return NextResponse.json(
          { error: { code: 'INVALID_TYPE', message: 'Type de document non valide' } },
          { status: 400 }
        );
    }

    if (!document) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    // Traiter les champs JSON
    // Parse JSON fields safely
    if (document.keywords) {
      try {
        document.keywords = typeof document.keywords === 'string' ? JSON.parse(document.keywords) : document.keywords;
      } catch (e) {
        document.keywords = [];
      }
    }
    
    if (document.keywords_en) {
      try {
        document.keywords_en = typeof document.keywords_en === 'string' ? JSON.parse(document.keywords_en) : document.keywords_en;
      } catch (e) {
        document.keywords_en = [];
      }
    }

    if (document.subject_headings) {
      try {
        document.subject_headings = typeof document.subject_headings === 'string' ? JSON.parse(document.subject_headings) : document.subject_headings;
      } catch (e) {
        document.subject_headings = [];
      }
    } else {
      document.subject_headings = [];
    }

    return NextResponse.json({
      success: true,
      data: document
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Erreur lors de la récupération du document',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// PUT /api/academic-documents/[id] - Mettre à jour un document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    console.log('🔄 MISE À JOUR DOCUMENT ACADÉMIQUE - Données reçues:', {
      id,
      document_type: body.document_type,
      file_type: body.file_type,
      document_path: body.document_path,
      document_size: body.document_size,
      allKeys: Object.keys(body),
      undefinedKeys: Object.keys(body).filter(key => body[key] === undefined),
      timestamp: new Date().toISOString()
    });

    // D'abord, récupérer le type de document et les informations de fichier existantes
    const typeQuery = `SELECT document_type FROM academic_documents WHERE id = ?`;
    const typeRows = await executeQuery(typeQuery, [id]);

    if ((typeRows as any[]).length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    const documentType = (typeRows as any[])[0].document_type;

    // Récupérer les informations de fichier existantes pour les préserver si nécessaire
    let existingFileInfo: any = {};
    let fileInfoQuery = '';

    switch (documentType) {
      case 'these':
        fileInfoQuery = `SELECT document_path, document_type as file_type, document_size FROM theses WHERE id = ?`;
        break;
      case 'memoire':
        fileInfoQuery = `SELECT document_path, document_type as file_type, document_size FROM memoires WHERE id = ?`;
        break;
      case 'rapport_stage':
        fileInfoQuery = `SELECT document_path, document_type as file_type, document_size FROM stage_reports WHERE id = ?`;
        break;
    }

    if (fileInfoQuery) {
      const fileInfoRows = await executeQuery(fileInfoQuery, [id]);
      if ((fileInfoRows as any[]).length > 0) {
        existingFileInfo = (fileInfoRows as any[])[0];
      }
    }
    let updateQuery = '';
    let queryParams: any[] = [];

    // Construire la requête de mise à jour selon le type
    switch (documentType) {
      case 'these':
        updateQuery = `
          UPDATE theses SET
            title = ?,
            main_author = ?,
            student_id = ?,
            director = ?,
            co_director = ?,
            target_degree = ?,
            specialty = ?,
            defense_year = ?,
            defense_date = ?,
            university = ?,
            faculty = ?,
            department = ?,
            pagination = ?,
            summary = ?,
            abstract = ?,
            keywords = ?,
            keywords_en = ?,
            dewey_classification = ?,
            cdu_classification = ?,
            subject_headings = ?,
            status = ?,
            target_audience = ?,
            format = ?,
            language = ?,
            physical_location = ?,
            institution = ?,
            country = ?,
            access_rights = ?,
            license = ?,
            document_path = ?,
            document_type = ?,
            document_size = ?,
            updated_at = NOW()
          WHERE id = ?
        `;
        queryParams = [
          body.title || null,
          body.main_author || body.author || null,
          body.student_id || null,
          body.director || body.supervisor || null,
          body.co_director || body.co_supervisor || null,
          body.target_degree || body.degree || null,
          body.specialty || null,
          body.defense_year || body.year || null,
          body.defense_date || null,
          body.university || null,
          body.faculty || null,
          body.department || null,
          body.pagination || null,
          body.summary || null,
          body.abstract || null,
          body.keywords ? JSON.stringify(body.keywords) : null,
          body.keywords_en ? JSON.stringify(body.keywords_en) : null,
          body.dewey_classification || null,
          body.cdu_classification || null,
          body.subject_headings ? JSON.stringify(body.subject_headings) : null,
          body.status || null,
          body.target_audience || null,
          body.format || null,
          body.language || null,
          body.physical_location || null,
          body.institution || null,
          body.country || null,
          body.access_rights || null,
          body.license || null,
          // Préserver les informations de fichier existantes si pas de nouvelles valeurs
          body.document_path || existingFileInfo.document_path || null,
          body.file_type ? (body.file_type.includes('pdf') ? 'pdf' : body.file_type.includes('doc') ? 'doc' : 'docx') : existingFileInfo.file_type || null,
          body.document_size || existingFileInfo.document_size || null,
          id
        ];
        break;

      case 'memoire':
        updateQuery = `
          UPDATE memoires SET
            title = ?,
            main_author = ?,
            student_id = ?,
            supervisor = ?,
            co_supervisor = ?,
            degree_level = ?,
            field_of_study = ?,
            specialty = ?,
            academic_year = ?,
            defense_date = ?,
            university = ?,
            faculty = ?,
            department = ?,
            pagination = ?,
            summary = ?,
            abstract = ?,
            keywords = ?,
            keywords_en = ?,
            methodology = ?,
            conclusion = ?,
            grade = ?,
            mention = ?,
            dewey_classification = ?,
            cdu_classification = ?,
            subject_headings = ?,
            status = ?,
            target_audience = ?,
            format = ?,
            language = ?,
            physical_location = ?,
            view_count = ?,
            document_path = ?,
            document_type = ?,
            document_size = ?
          WHERE id = ?
        `;
        queryParams = [
          body.title || null,
          body.main_author || body.author || null,
          body.student_id || null,
          body.supervisor || body.director || null,
          body.co_supervisor || null,
          body.degree_level || body.degree || null,
          body.field_of_study || body.specialty || 'Informatique',
          body.specialty || null,
          body.academic_year || (body.year ? `${body.year}-${body.year + 1}` : null),
          body.defense_date || null,
          body.university || null,
          body.faculty || null,
          body.department || null,
          body.pagination || null,
          body.summary || null,
          body.abstract || null,
          body.keywords ? JSON.stringify(body.keywords) : null,
          body.keywords_en ? JSON.stringify(body.keywords_en) : null,
          body.methodology || body.abstract || null,
          body.conclusion || null,
          body.grade || null,
          body.mention || null,
          body.dewey_classification || null,
          body.cdu_classification || null,
          body.subject_headings ? JSON.stringify(body.subject_headings) : null,
          body.status || null,
          body.target_audience || null,
          body.format || null,
          body.language || null,
          body.physical_location || null,
          body.view_count || null,
          // Préserver les informations de fichier existantes si pas de nouvelles valeurs
          body.document_path || existingFileInfo.document_path || null,
          body.file_type ? (body.file_type.includes('pdf') ? 'pdf' : body.file_type.includes('doc') ? 'doc' : 'docx') : (existingFileInfo.file_type || null),
          body.document_size || existingFileInfo.document_size || null,
          id
        ];
        break;

      case 'rapport_stage':
        updateQuery = `
          UPDATE stage_reports SET
            title = ?,
            student_name = ?,
            student_id = ?,
            supervisor = ?,
            company_name = ?,
            company_address = ?,
            company_sector = ?,
            company_supervisor = ?,
            stage_type = ?,
            degree_level = ?,
            field_of_study = ?,
            specialty = ?,
            academic_year = ?,
            defense_date = ?,
            university = ?,
            faculty = ?,
            department = ?,
            pagination = ?,
            summary = ?,
            objectives = ?,
            tasks_performed = ?,
            skills_acquired = ?,
            recommendations = ?,
            keywords = ?,
            keywords_en = ?,
            dewey_classification = ?,
            cdu_classification = ?,
            subject_headings = ?,
            status = ?,
            target_audience = ?,
            format = ?,
            language = ?,
            physical_location = ?,
            view_count = ?,
            document_path = ?,
            document_type = ?,
            document_size = ?
          WHERE id = ?
        `;
        queryParams = [
          body.title || null,
          body.student_name || body.author || body.main_author || null,
          body.student_id || null,
          body.supervisor || body.director || null,
          body.company_name || body.university || 'Entreprise non spécifiée',
          body.company_address || null,
          body.company_sector || null,
          body.company_supervisor || null,
          body.stage_type || 'Application',
          body.degree_level || body.degree || null,
          body.field_of_study || body.specialty || 'Informatique',
          body.specialty || null,
          body.academic_year || (body.year ? `${body.year}-${body.year + 1}` : null),
          body.defense_date || null,
          body.university || null,
          body.faculty || null,
          body.department || null,
          body.pagination || null,
          body.summary || null,
          body.objectives || body.abstract || null,
          body.tasks_performed || null,
          body.skills_acquired || null,
          body.recommendations || null,
          body.keywords ? JSON.stringify(body.keywords) : null,
          body.keywords_en ? JSON.stringify(body.keywords_en) : null,
          body.dewey_classification || null,
          body.cdu_classification || null,
          body.subject_headings ? JSON.stringify(body.subject_headings) : null,
          body.status || null,
          body.target_audience || null,
          body.format || null,
          body.language || null,
          body.physical_location || null,
          body.view_count || null,
          // Préserver les informations de fichier existantes si pas de nouvelles valeurs
          body.document_path || existingFileInfo.document_path || null,
          body.file_type ? (body.file_type.includes('pdf') ? 'pdf' : body.file_type.includes('doc') ? 'doc' : 'docx') : (existingFileInfo.file_type || null),
          body.document_size || existingFileInfo.document_size || null,
          id
        ];
        break;

      default:
        return NextResponse.json(
          { error: { code: 'INVALID_TYPE', message: 'Type de document non valide' } },
          { status: 400 }
        );
    }

    // Nettoyer les paramètres pour éviter les valeurs undefined
    const cleanedParams = cleanParams(queryParams);

    console.log('🔄 MISE À JOUR DOCUMENT ACADÉMIQUE - Paramètres nettoyés:', {
      originalLength: queryParams.length,
      cleanedLength: cleanedParams.length,
      hasUndefined: queryParams.some(p => p === undefined),
      cleanedHasUndefined: cleanedParams.some(p => p === undefined)
    });

    await executeQuery(updateQuery, cleanedParams);

    // Logger la mise à jour
    await logCrudOperation(
      'update',
      documentType === 'these' ? 'theses' : documentType === 'memoire' ? 'memoires' : 'stage_reports',
      id,
      undefined,
      {
        document_type: documentType,
        updated_fields: Object.keys(body).filter(key => body[key] !== undefined && body[key] !== null)
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Document mis à jour avec succès',
      data: { id, ...body }
    });

  } catch (error) {
    console.error('Error updating document:', error);
    
    const { id: errorId } = await params;
    await logError(error as Error, { 
      action: 'update_academic_document',
      requestUrl: `/api/academic-documents/${errorId}`
    });
    
    return NextResponse.json(
      { 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Erreur lors de la mise à jour du document',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/academic-documents/[id] - Supprimer un document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // D'abord, récupérer les informations complètes du document
    const documentQuery = `SELECT document_type, document_path FROM academic_documents WHERE id = ?`;
    const documentRows = await executeQuery(documentQuery, [id]);

    if ((documentRows as any[]).length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Document non trouvé' } },
        { status: 404 }
      );
    }

    const document = (documentRows as any[])[0];
    const documentType = document.document_type;

    // Supprimer le fichier du serveur si il existe
    if (document.document_path) {
      try {
        await UdMFileServerService.deleteFile(document.document_path);
        console.log(`✅ Fichier supprimé du serveur: ${document.document_path}`);
      } catch (fileError) {
        console.warn(`⚠️ Impossible de supprimer le fichier: ${document.document_path}`, fileError);
        // Ne pas faire échouer la suppression du document si le fichier ne peut pas être supprimé
      }
    }
    let deleteQuery = '';

    // Construire la requête de suppression selon le type
    switch (documentType) {
      case 'these':
        deleteQuery = 'DELETE FROM theses WHERE id = ?';
        break;
      case 'memoire':
        deleteQuery = 'DELETE FROM memoires WHERE id = ?';
        break;
      case 'rapport_stage':
        deleteQuery = 'DELETE FROM stage_reports WHERE id = ?';
        break;
      default:
        return NextResponse.json(
          { error: { code: 'INVALID_TYPE', message: 'Type de document non valide' } },
          { status: 400 }
        );
    }

    // Logger la suppression avant de supprimer
    await logCrudOperation(
      'delete',
      documentType === 'these' ? 'theses' : documentType === 'memoire' ? 'memoires' : 'stage_reports',
      id,
      undefined,
      { document_type: documentType }
    );

    await executeQuery(deleteQuery, [id]);

    return NextResponse.json({
      success: true,
      message: 'Document supprimé avec succès'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    
    const { id: errorId } = await params;
    await logError(error as Error, { 
      action: 'delete_academic_document',
      requestUrl: `/api/academic-documents/${errorId}`
    });
    
    return NextResponse.json(
      { 
        error: { 
          code: 'DELETE_ERROR', 
          message: 'Erreur lors de la suppression du document',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        } 
      },
      { status: 500 }
    );
  }
}
