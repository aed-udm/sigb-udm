import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/document-categories - Récupérer toutes les catégories de documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('include_stats') === 'true';
    const activeOnly = searchParams.get('active_only') !== 'false'; // Par défaut true

    let query = `
      SELECT 
        id,
        name,
        description,
        icon,
        color,
        required_for_graduation,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM document_categories
    `;

    let queryParams: any[] = [];

    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }

    query += ' ORDER BY sort_order ASC, name ASC';

    const categories = await executeQuery(query, queryParams);

    let processedCategories = categories as any[];

    // Ajouter les statistiques si demandées
    if (includeStats) {
      const statsQuery = `
        SELECT 
          dc.id as category_id,
          COUNT(sd.id) as total_documents,
          COUNT(CASE WHEN sd.status = 'approved' THEN 1 END) as approved_documents,
          COUNT(CASE WHEN sd.status = 'pending' THEN 1 END) as pending_documents,
          COUNT(CASE WHEN sd.status = 'rejected' THEN 1 END) as rejected_documents,
          COUNT(DISTINCT sd.student_id) as students_with_documents,
          COALESCE(SUM(sd.file_size), 0) as total_size_bytes,
          ROUND(COALESCE(SUM(sd.file_size), 0) / 1024 / 1024, 2) as total_size_mb
        FROM document_categories dc
        LEFT JOIN student_documents sd ON dc.id = sd.category_id AND sd.is_active = 1
        ${activeOnly ? 'WHERE dc.is_active = 1' : ''}
        GROUP BY dc.id
      `;

      const stats = await executeQuery(statsQuery, []);
      const statsMap = new Map((stats as any[]).map(stat => [stat.category_id, stat]));

      processedCategories = processedCategories.map(category => ({
        ...category,
        stats: statsMap.get(category.id) || {
          total_documents: 0,
          approved_documents: 0,
          pending_documents: 0,
          rejected_documents: 0,
          students_with_documents: 0,
          total_size_bytes: 0,
          total_size_mb: 0
        }
      }));
    }

    // Statistiques globales
    const globalStatsQuery = `
      SELECT 
        COUNT(*) as total_categories,
        COUNT(CASE WHEN required_for_graduation = 1 THEN 1 END) as required_categories,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_categories
      FROM document_categories
    `;

    const globalStatsRows = await executeQuery(globalStatsQuery, []);
    const globalStats = (globalStatsRows as any[])[0];

    return NextResponse.json({
      success: true,
      data: processedCategories,
      meta: {
        total: processedCategories.length,
        global_stats: globalStats,
        include_stats: includeStats,
        active_only: activeOnly
      }
    });

  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des catégories' },
      { status: 500 }
    );
  }
}

// POST /api/document-categories - Créer une nouvelle catégorie
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      name,
      description,
      icon = 'File',
      color = 'text-gray-600',
      required_for_graduation = false,
      sort_order = 0
    } = body;

    // Validation des champs requis
    if (!id || !name) {
      return NextResponse.json(
        { error: 'Champs requis manquants: id, name' },
        { status: 400 }
      );
    }

    // Vérifier que l'ID n'existe pas déjà
    const existingQuery = 'SELECT id FROM document_categories WHERE id = ?';
    const existingRows = await executeQuery(existingQuery, [id]);
    
    if (existingRows && (existingRows as any[]).length > 0) {
      return NextResponse.json(
        { error: 'Une catégorie avec cet ID existe déjà' },
        { status: 409 }
      );
    }

    // Insérer la nouvelle catégorie
    const insertQuery = `
      INSERT INTO document_categories (
        id, name, description, icon, color, required_for_graduation, 
        sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `;

    const values = [
      id,
      name,
      description || null,
      icon,
      color,
      required_for_graduation ? 1 : 0,
      sort_order
    ];

    await executeQuery(insertQuery, values);

    // Récupérer la catégorie créée
    const createdCategoryRows = await executeQuery(
      'SELECT * FROM document_categories WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Catégorie créée avec succès',
      data: (createdCategoryRows as any[])[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur création catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la création de la catégorie' },
      { status: 500 }
    );
  }
}

// PUT /api/document-categories - Mettre à jour une catégorie
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      id,
      name,
      description,
      icon,
      color,
      required_for_graduation,
      sort_order,
      is_active
    } = body;

    // Validation des champs requis
    if (!id) {
      return NextResponse.json(
        { error: 'ID de catégorie requis' },
        { status: 400 }
      );
    }

    // Vérifier que la catégorie existe
    const existingQuery = 'SELECT id FROM document_categories WHERE id = ?';
    const existingRows = await executeQuery(existingQuery, [id]);
    
    if (!existingRows || (existingRows as any[]).length === 0) {
      return NextResponse.json(
        { error: 'Catégorie non trouvée' },
        { status: 404 }
      );
    }

    // Construire la requête de mise à jour dynamiquement
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (icon !== undefined) {
      updateFields.push('icon = ?');
      updateValues.push(icon);
    }
    if (color !== undefined) {
      updateFields.push('color = ?');
      updateValues.push(color);
    }
    if (required_for_graduation !== undefined) {
      updateFields.push('required_for_graduation = ?');
      updateValues.push(required_for_graduation ? 1 : 0);
    }
    if (sort_order !== undefined) {
      updateFields.push('sort_order = ?');
      updateValues.push(sort_order);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'Aucun champ à mettre à jour' },
        { status: 400 }
      );
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    const updateQuery = `
      UPDATE document_categories 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await executeQuery(updateQuery, updateValues);

    // Récupérer la catégorie mise à jour
    const updatedCategoryRows = await executeQuery(
      'SELECT * FROM document_categories WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Catégorie mise à jour avec succès',
      data: (updatedCategoryRows as any[])[0]
    });

  } catch (error) {
    console.error('Erreur mise à jour catégorie:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors de la mise à jour de la catégorie' },
      { status: 500 }
    );
  }
}
