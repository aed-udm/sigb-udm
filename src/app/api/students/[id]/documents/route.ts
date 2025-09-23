import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

// GET /api/students/[id]/documents - Récupérer les documents d'un étudiant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const status = searchParams.get('status');

    // Vérifier que l'étudiant existe
    const studentQuery = 'SELECT id, full_name, email FROM users WHERE id = ? AND user_category = "student"';
    const studentRows = await executeQuery(studentQuery, [studentId]);
    
    if (!studentRows || (studentRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé' },
        { status: 404 }
      );
    }

    // Construire la requête avec filtres
    let whereConditions = ['sd.student_id = ?', 'sd.is_active = 1'];
    let queryParams = [studentId];

    if (categoryId) {
      whereConditions.push('sd.category_id = ?');
      queryParams.push(categoryId);
    }

    if (status) {
      whereConditions.push('sd.status = ?');
      queryParams.push(status);
    }

    const whereClause = whereConditions.join(' AND ');

    // Requête pour récupérer les documents avec informations de catégorie
    const documentsQuery = `
      SELECT 
        sd.id,
        sd.document_name,
        sd.document_description,
        sd.document_path,
        sd.file_type,
        sd.file_size,
        sd.upload_date,
        sd.status,
        sd.academic_year,
        sd.keywords,
        sd.notes,
        sd.version,
        sd.validation_date,
        sd.rejection_reason,
        dc.name as category_name,
        dc.icon as category_icon,
        dc.color as category_color,
        dc.required_for_graduation,
        u_uploader.full_name as uploaded_by_name,
        u_validator.full_name as validated_by_name
      FROM student_documents sd
      LEFT JOIN document_categories dc ON sd.category_id = dc.id
      LEFT JOIN users u_uploader ON sd.uploaded_by = u_uploader.id
      LEFT JOIN users u_validator ON sd.validated_by = u_validator.id
      WHERE ${whereClause}
      ORDER BY sd.upload_date DESC
    `;

    const documents = await executeQuery(documentsQuery, queryParams);

    // Statistiques par catégorie
    const statsQuery = `
      SELECT 
        dc.id as category_id,
        dc.name as category_name,
        dc.icon,
        dc.color,
        dc.required_for_graduation,
        COUNT(sd.id) as document_count,
        COUNT(CASE WHEN sd.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN sd.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN sd.status = 'rejected' THEN 1 END) as rejected_count,
        COALESCE(SUM(sd.file_size), 0) as total_size
      FROM document_categories dc
      LEFT JOIN student_documents sd ON dc.id = sd.category_id 
        AND sd.student_id = ? AND sd.is_active = 1
      WHERE dc.is_active = 1
      GROUP BY dc.id, dc.name, dc.icon, dc.color, dc.required_for_graduation
      ORDER BY dc.sort_order
    `;

    const categoryStats = await executeQuery(statsQuery, [studentId]);

    // Traiter les données
    const processedDocuments = (documents as any[]).map(doc => ({
      ...doc,
      keywords: doc.keywords ? JSON.parse(doc.keywords) : [],
      file_size_mb: Math.round(doc.file_size / 1024 / 1024 * 100) / 100
    }));

    const processedStats = (categoryStats as any[]).map(stat => ({
      ...stat,
      total_size_mb: Math.round(stat.total_size / 1024 / 1024 * 100) / 100,
      completion_status: stat.required_for_graduation && stat.approved_count > 0 ? 'complete' : 
                        stat.required_for_graduation ? 'incomplete' : 'optional'
    }));

    return NextResponse.json({
      success: true,
      data: {
        student: (studentRows as any[])[0],
        documents: processedDocuments,
        categories: processedStats,
        summary: {
          total_documents: processedDocuments.length,
          approved_documents: processedDocuments.filter(d => d.status === 'approved').length,
          pending_documents: processedDocuments.filter(d => d.status === 'pending').length,
          rejected_documents: processedDocuments.filter(d => d.status === 'rejected').length,
          total_size_mb: processedDocuments.reduce((sum, d) => sum + d.file_size_mb, 0),
          required_categories_complete: processedStats.filter(s => s.completion_status === 'complete').length,
          total_required_categories: processedStats.filter(s => s.required_for_graduation).length
        }
      }
    });

  } catch (error) {
    console.error('Erreur récupération documents étudiant:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des documents' },
      { status: 500 }
    );
  }
}

// POST /api/students/[id]/documents - Ajouter un document pour un étudiant
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const body = await request.json();

    const {
      category_id,
      document_name,
      document_description,
      document_path,
      file_type,
      file_size,
      academic_year,
      keywords,
      notes,
      uploaded_by
    } = body;

    // Validation des champs requis
    if (!category_id || !document_name || !document_path || !file_type || !file_size) {
      return NextResponse.json(
        { error: 'Champs requis manquants: category_id, document_name, document_path, file_type, file_size' },
        { status: 400 }
      );
    }

    // Vérifier que l'étudiant existe
    const studentQuery = 'SELECT id FROM users WHERE id = ? AND user_category = "student"';
    const studentRows = await executeQuery(studentQuery, [studentId]);
    
    if (!studentRows || (studentRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier que la catégorie existe
    const categoryQuery = 'SELECT id FROM document_categories WHERE id = ? AND is_active = 1';
    const categoryRows = await executeQuery(categoryQuery, [category_id]);
    
    if (!categoryRows || (categoryRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Catégorie de document non trouvée' },
        { status: 404 }
      );
    }

    // Générer un ID unique pour le document
    const documentId = uuidv4();

    // Insérer le document
    const insertQuery = `
      INSERT INTO student_documents (
        id, student_id, category_id, document_name, document_description,
        document_path, file_type, file_size, uploaded_by, academic_year,
        keywords, notes, status, version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, 1, NOW(), NOW())
    `;

    const values = [
      documentId,
      studentId,
      category_id,
      document_name,
      document_description || null,
      document_path,
      file_type,
      file_size,
      uploaded_by || null,
      academic_year || null,
      keywords ? JSON.stringify(keywords) : null,
      notes || null
    ];

    await executeQuery(insertQuery, values);

    // Créer un enregistrement d'audit
    const auditId = uuidv4();
    const auditQuery = `
      INSERT INTO student_documents_audit (
        id, document_id, action, new_values, user_id, created_at
      ) VALUES (?, ?, 'created', ?, ?, NOW())
    `;

    const auditValues = [
      auditId,
      documentId,
      JSON.stringify({
        document_name,
        category_id,
        file_size,
        status: 'pending'
      }),
      uploaded_by || null
    ];

    await executeQuery(auditQuery, auditValues);

    // Récupérer le document créé avec les informations de catégorie
    const createdDocQuery = `
      SELECT 
        sd.*,
        dc.name as category_name,
        dc.icon as category_icon,
        dc.color as category_color
      FROM student_documents sd
      LEFT JOIN document_categories dc ON sd.category_id = dc.id
      WHERE sd.id = ?
    `;

    const createdDocRows = await executeQuery(createdDocQuery, [documentId]);
    const createdDoc = (createdDocRows as any[])[0];

    return NextResponse.json({
      success: true,
      message: 'Document ajouté avec succès',
      data: {
        ...createdDoc,
        keywords: createdDoc.keywords ? JSON.parse(createdDoc.keywords) : [],
        file_size_mb: Math.round(createdDoc.file_size / 1024 / 1024 * 100) / 100
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur ajout document étudiant:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'ajout du document' },
      { status: 500 }
    );
  }
}
