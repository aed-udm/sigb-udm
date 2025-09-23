import { NextRequest, NextResponse } from 'next/server';
import { getThesisById, executeQuery } from '@/lib/mysql';
import { thesisSchema } from '@/lib/validations';
import { logCrudOperation, logError } from '@/lib/system-logger';

// GET /api/theses/[id] - Récupérer une thèse spécifique
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const thesis = await getThesisById(id);

    if (!thesis) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Thèse non trouvée' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: thesis });
  } catch (error) {
    console.error('Error fetching thesis:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération de la thèse' } },
      { status: 500 }
    );
  }
}

// PUT /api/theses/[id] - Mettre à jour une thèse
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Vérifier que la thèse existe
    const existingThesis = await getThesisById(id);
    if (!existingThesis) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Thèse non trouvée' } },
        { status: 404 }
      );
    }

    // Validation des données
    const validatedData = thesisSchema.partial().parse(body);

    // Construire la requête de mise à jour dynamique
    const updateFields = [];
    const updateValues = [];

    if (validatedData.title) {
      updateFields.push('title = ?');
      updateValues.push(validatedData.title);
    }
    if (validatedData.main_author) {
      updateFields.push('main_author = ?');
      updateValues.push(validatedData.main_author);
    }
    if (validatedData.director) {
      updateFields.push('director = ?');
      updateValues.push(validatedData.director);
    }
    if (validatedData.co_director !== undefined) {
      updateFields.push('co_director = ?');
      updateValues.push(validatedData.co_director);
    }
    if (validatedData.target_degree) {
      updateFields.push('target_degree = ?');
      updateValues.push(validatedData.target_degree);
    }
    if (validatedData.specialty !== undefined) {
      updateFields.push('specialty = ?');
      updateValues.push(validatedData.specialty);
    }
    if (validatedData.defense_year) {
      updateFields.push('defense_year = ?');
      updateValues.push(validatedData.defense_year);
    }
    if (validatedData.defense_date !== undefined) {
      updateFields.push('defense_date = ?');
      updateValues.push(validatedData.defense_date);
    }
    if (validatedData.university !== undefined) {
      updateFields.push('university = ?');
      updateValues.push(validatedData.university);
    }
    if (validatedData.faculty !== undefined) {
      updateFields.push('faculty = ?');
      updateValues.push(validatedData.faculty);
    }
    if (validatedData.department !== undefined) {
      updateFields.push('department = ?');
      updateValues.push(validatedData.department);
    }
    if (validatedData.pagination !== undefined) {
      updateFields.push('pagination = ?');
      updateValues.push(validatedData.pagination);
    }
    if (validatedData.summary !== undefined) {
      updateFields.push('summary = ?');
      updateValues.push(validatedData.summary);
    }
    if (validatedData.abstract !== undefined) {
      updateFields.push('abstract = ?');
      updateValues.push(validatedData.abstract);
    }
    if (validatedData.keywords) {
      updateFields.push('keywords = ?');
      updateValues.push(JSON.stringify(validatedData.keywords));
    }
    if (validatedData.keywords_en) {
      updateFields.push('keywords_en = ?');
      updateValues.push(JSON.stringify(validatedData.keywords_en));
    }
    if (validatedData.document_path !== undefined) {
      updateFields.push('document_path = ?');
      updateValues.push(validatedData.document_path);
    }
    if (validatedData.document_type !== undefined) {
      updateFields.push('document_type = ?');
      updateValues.push(validatedData.document_type);
    }
    if (validatedData.document_size !== undefined) {
      updateFields.push('document_size = ?');
      updateValues.push(validatedData.document_size);
    }
    if (validatedData.is_accessible !== undefined) {
      updateFields.push('is_accessible = ?');
      updateValues.push(validatedData.is_accessible);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_UPDATES', message: 'Aucune donnée à mettre à jour' } },
        { status: 400 }
      );
    }

    // Ajouter updated_at et l'ID
    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await executeQuery(
      `UPDATE theses SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Logger la mise à jour
    await logCrudOperation(
      'update',
      'theses',
      id,
      undefined,
      validatedData
    );

    const updatedThesis = await getThesisById(id);
    return NextResponse.json({ data: updatedThesis, message: 'Thèse mise à jour avec succès' });
  } catch (error) {
    console.error('Error updating thesis:', error);
    const { id: errorId } = await params;
    await logError(error as Error, { 
      action: 'update_thesis',
      requestUrl: `/api/theses/${errorId}`
    });
    return NextResponse.json(
      { error: { code: 'UPDATE_ERROR', message: 'Erreur lors de la mise à jour' } },
      { status: 500 }
    );
  }
}

// DELETE /api/theses/[id] - Supprimer une thèse
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const thesis = await getThesisById(id);
    if (!thesis) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Thèse non trouvée' } },
        { status: 404 }
      );
    }

    // Logger la suppression avant de supprimer
    await logCrudOperation(
      'delete',
      'theses',
      id,
      undefined,
      { title: thesis.title, main_author: thesis.main_author }
    );

    await executeQuery('DELETE FROM theses WHERE id = ?', [id]);
    return NextResponse.json({ message: 'Thèse supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting thesis:', error);
    const { id: errorId } = await params;
    await logError(error as Error, { 
      action: 'delete_thesis',
      requestUrl: `/api/theses/${errorId}`
    });
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression' } },
      { status: 500 }
    );
  }
}
