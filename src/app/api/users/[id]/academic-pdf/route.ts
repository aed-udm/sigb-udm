import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/users/[id]/academic-pdf - Upload du PDF académique
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Vérifier que l'utilisateur existe
    const existingUsers = await executeQuery(
      'SELECT id, full_name FROM users WHERE id = ?',
      [userId]
    ) as Array<{ id: string; full_name: string }>;

    if (existingUsers.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = existingUsers[0];

    // Récupérer le fichier depuis FormData
    const formData = await request.formData();
    const file = formData.get('academic_pdf') as File;

    if (!file) {
      return NextResponse.json(
        { error: { code: 'NO_FILE', message: 'Aucun fichier PDF fourni' } },
        { status: 400 }
      );
    }

    // Vérifier que c'est un PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: { code: 'INVALID_FILE_TYPE', message: 'Seuls les fichiers PDF sont acceptés' } },
        { status: 400 }
      );
    }

    // Vérifier la taille du fichier (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: { code: 'FILE_TOO_LARGE', message: 'Le fichier ne peut pas dépasser 50MB' } },
        { status: 400 }
      );
    }

    // Créer le dossier de destination s'il n'existe pas
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'academic-documents');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = `academic_${userId}_${timestamp}.pdf`;
    const filePath = join(uploadDir, fileName);
    const relativePath = `uploads/academic-documents/${fileName}`;

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Mettre à jour la base de données
    await executeQuery(
      `UPDATE users 
       SET academic_documents_pdf_path = ?, 
           academic_pdf_file_type = ?, 
           academic_pdf_file_size = ?,
           academic_pdf_uploaded_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [relativePath, file.type, file.size, userId]
    );

    // Récupérer l'utilisateur mis à jour
    const updatedUsers = await executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as Array<any>;

    return NextResponse.json({
      data: updatedUsers[0],
      message: 'PDF académique uploadé avec succès',
      file_info: {
        name: fileName,
        size: file.size,
        type: file.type,
        path: relativePath
      }
    });

  } catch (error) {
    console.error('Error uploading academic PDF:', error);
    return NextResponse.json(
      { error: { code: 'UPLOAD_ERROR', message: 'Erreur lors de l\'upload du PDF' } },
      { status: 500 }
    );
  }
}

// GET /api/users/[id]/academic-pdf - Télécharger le PDF académique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Récupérer les informations du PDF
    const users = await executeQuery(
      'SELECT academic_documents_pdf_path, academic_pdf_file_type, full_name FROM users WHERE id = ?',
      [userId]
    ) as Array<{ 
      academic_documents_pdf_path: string | null; 
      academic_pdf_file_type: string | null;
      full_name: string;
    }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = users[0];

    if (!user.academic_documents_pdf_path) {
      return NextResponse.json(
        { error: { code: 'NO_PDF', message: 'Aucun PDF académique trouvé pour cet utilisateur' } },
        { status: 404 }
      );
    }

    // Construire le chemin complet du fichier
    const filePath = join(process.cwd(), user.academic_documents_pdf_path);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: { code: 'FILE_NOT_FOUND', message: 'Fichier PDF non trouvé sur le serveur' } },
        { status: 404 }
      );
    }

    // Lire le fichier et le retourner
    const { readFile } = await import('fs/promises');
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': user.academic_pdf_file_type || 'application/pdf',
        'Content-Disposition': `attachment; filename="documents_academiques_${user.full_name.replace(/\s+/g, '_')}.pdf"`
      }
    });

  } catch (error) {
    console.error('Error downloading academic PDF:', error);
    return NextResponse.json(
      { error: { code: 'DOWNLOAD_ERROR', message: 'Erreur lors du téléchargement du PDF' } },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id]/academic-pdf - Supprimer le PDF académique
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Récupérer les informations du PDF
    const users = await executeQuery(
      'SELECT academic_documents_pdf_path FROM users WHERE id = ?',
      [userId]
    ) as Array<{ academic_documents_pdf_path: string | null }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = users[0];

    if (user.academic_documents_pdf_path) {
      // Supprimer le fichier physique
      const filePath = join(process.cwd(), user.academic_documents_pdf_path);
      if (existsSync(filePath)) {
        const { unlink } = await import('fs/promises');
        await unlink(filePath);
      }
    }

    // Mettre à jour la base de données
    await executeQuery(
      `UPDATE users 
       SET academic_documents_pdf_path = NULL, 
           academic_pdf_file_type = NULL, 
           academic_pdf_file_size = NULL,
           academic_pdf_uploaded_at = NULL
       WHERE id = ?`,
      [userId]
    );

    return NextResponse.json({
      message: 'PDF académique supprimé avec succès'
    });

  } catch (error) {
    console.error('Error deleting academic PDF:', error);
    return NextResponse.json(
      { error: { code: 'DELETE_ERROR', message: 'Erreur lors de la suppression du PDF' } },
      { status: 500 }
    );
  }
}
