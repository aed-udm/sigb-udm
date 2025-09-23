import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery } from '@/lib/mysql';
import { reservationSchema, type ReservationFormData } from '@/lib/validations';
import { DocumentAvailabilityService } from '@/lib/document-availability';
import { logLibraryOperation, logError } from '@/lib/system-logger';
import { EmailNotificationService, ReservationNotificationData } from '@/lib/services/email-notification-service';


// Types pour les erreurs
interface ZodError {
  issues: Array<{
    path: string[];
    message: string;
  }>;
}

function isZodError(error: unknown): error is ZodError {
  return error !== null && typeof error === 'object' && 'issues' in error;
}

function createValidationErrorResponse(error: ZodError) {
  return NextResponse.json(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      }
    },
    { status: 400 }
  );
}

function createDatabaseErrorResponse(error: unknown) {
  console.error('Database error:', error);
  return NextResponse.json(
    { error: { code: 'DATABASE_ERROR', message: 'Erreur de base de données' } },
    { status: 500 }
  );
}

// GET /api/reservations - Récupérer les réservations avec filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');
    const documentType = searchParams.get('document_type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        u.matricule as user_barcode,
        -- Informations du livre (si c'est un livre)
        CASE WHEN r.document_type = 'book' THEN b.title ELSE NULL END as book_title,
        CASE WHEN r.document_type = 'book' THEN b.main_author ELSE NULL END as book_author,
        CASE WHEN r.document_type = 'book' THEN b.mfn ELSE NULL END as book_mfn,
        -- Informations du document académique (si c'est un document académique)
        CASE WHEN r.document_type != 'book' THEN ad.title ELSE NULL END as academic_title,
        CASE WHEN r.document_type != 'book' THEN ad.main_author ELSE NULL END as academic_author,
        CASE WHEN r.document_type != 'book' THEN ad.target_degree ELSE NULL END as academic_degree,
        -- Calcul des jours jusqu'à expiration
        DATEDIFF(r.expiry_date, CURDATE()) as days_until_expiry
      FROM reservations r
      INNER JOIN users u ON r.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON r.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN (
        SELECT id, title, main_author, target_degree FROM theses
        UNION ALL
        SELECT id, title, main_author, degree_level as target_degree FROM memoires
        UNION ALL
        SELECT id, title, student_name as main_author, degree_level as target_degree FROM stage_reports
      ) ad ON r.academic_document_id COLLATE utf8mb4_unicode_ci = ad.id COLLATE utf8mb4_unicode_ci
      WHERE 1=1
    `;

    const params: any[] = [];

    if (userId) {
      query += ' AND r.user_id = ?';
      params.push(userId);
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (documentType) {
      query += ' AND r.document_type = ?';
      params.push(documentType);
    }

    query += ' ORDER BY r.priority_order ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const reservations = await executeQuery(query, params) as Array<any>;

    return NextResponse.json({
      data: reservations,
      meta: {
        total: reservations.length,
        limit,
        offset
      }
    });
  } catch (error) {
    return createDatabaseErrorResponse(error);
  }
}

// POST /api/reservations - Créer une nouvelle réservation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 🔍 LOG DÉTAILLÉ: Données reçues
    console.log('📥 Données reçues pour réservation:', {
      user_id: body.user_id,
      book_id: body.book_id,
      academic_document_id: body.academic_document_id,
      document_type: body.document_type,
      reservation_date: body.reservation_date,
      expiry_date: body.expiry_date,
      notes: body.notes
    });

    // Validation des données
    console.log('🔍 Validation des données avec Zod...');
    try {
      const validatedData = reservationSchema.parse(body);
      console.log('✅ Validation Zod réussie:', validatedData);
    } catch (zodError) {
      console.error('❌ Erreur de validation Zod détaillée:', {
        error: zodError,
        issues: (zodError as any).issues,
        receivedData: body
      });
      throw zodError;
    }
    const validatedData = reservationSchema.parse(body);

    // Vérification que l'utilisateur existe et est actif
    const users = await executeQuery(
      'SELECT id, full_name, email, barcode, is_active FROM users WHERE id = ?',
      [validatedData.user_id]
    ) as Array<{ id: string; is_active: boolean }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    if (!users[0].is_active) {
      return NextResponse.json(
        { error: { code: 'USER_INACTIVE', message: 'Utilisateur inactif' } },
        { status: 400 }
      );
    }

    // Déterminer le document et la table
    const documentId = validatedData.book_id || validatedData.academic_document_id;
    if (!documentId) {
      return NextResponse.json(
        { error: { code: 'MISSING_DOCUMENT_ID', message: 'ID du document requis' } },
        { status: 400 }
      );
    }

    const documentTable = validatedData.document_type === 'book' ? 'books' :
                         validatedData.document_type === 'these' ? 'theses' :
                         validatedData.document_type === 'memoire' ? 'memoires' : 'stage_reports';

    // Vérifier que le document existe selon son type
    let documents: Array<{ id: string; title: string; available_copies?: number }> = [];

    if (validatedData.document_type === 'book') {
      documents = await executeQuery(
        `SELECT id, title, available_copies FROM books WHERE id = ?`,
        [documentId]
      ) as Array<{ id: string; title: string; available_copies: number }>;
    } else {
      // Pour les documents académiques, vérifier l'existence (pas de available_copies)
      documents = await executeQuery(
        `SELECT id, title FROM ${documentTable} WHERE id = ?`,
        [documentId]
      ) as Array<{ id: string; title: string }>;
    }

    if (documents.length === 0) {
      const documentTypeNames = {
        'book': 'livre',
        'these': 'thèse',
        'memoire': 'mémoire',
        'rapport_stage': 'rapport de stage'
      };
      return NextResponse.json(
        { error: { code: 'DOCUMENT_NOT_FOUND', message: `${documentTypeNames[validatedData.document_type]} non trouvé` } },
        { status: 404 }
      );
    }

    // 🚀 NOUVELLE VÉRIFICATION COMPLÈTE : Utiliser le service centralisé
    const reserveCheck = await DocumentAvailabilityService.canUserReserve(
      validatedData.user_id,
      documentId,
      validatedData.document_type
    );

    if (!reserveCheck.canReserve) {
      const errorMessages = {
        'USER_NOT_FOUND': 'Utilisateur non trouvé',
        'USER_INACTIVE': 'Utilisateur inactif',
        'RESERVATION_LIMIT_EXCEEDED': `Limite de réservations atteinte (${reserveCheck.details?.max_reservations} maximum)`,
        'RESERVATION_ALREADY_EXISTS': 'Une réservation active existe déjà pour ce document',
        'DOCUMENT_ALREADY_BORROWED': 'Vous avez déjà emprunté ce document. Vous ne pouvez pas le réserver en même temps.',
        'DOCUMENT_NOT_FOUND': 'Document non trouvé',
        'DOCUMENT_AVAILABLE_FOR_LOAN': 'Ce document est disponible pour emprunt immédiat. Veuillez emprunter directement plutôt que de réserver.',
        'SYSTEM_ERROR': 'Erreur système lors de la vérification'
      };

      return NextResponse.json(
        {
          error: {
            code: reserveCheck.reason,
            message: errorMessages[reserveCheck.reason as keyof typeof errorMessages] || 'Erreur inconnue',
            details: reserveCheck.details
          }
        },
        { status: 400 }
      );
    }

    // Calculer l'ordre de priorité (dernier dans la file)
    const priorityResult = await executeQuery(
      `SELECT COALESCE(MAX(priority_order), 0) + 1 as next_priority 
       FROM reservations 
       WHERE ${validatedData.book_id ? 'book_id' : 'academic_document_id'} = ? AND status = 'active'`,
      [documentId]
    ) as Array<{ next_priority: number }>;

    const priorityOrder = priorityResult[0].next_priority;

    // Générer un UUID pour la nouvelle réservation
    const reservationId = uuidv4();

    // Calculer la date d'expiration (7 jours par défaut)
    const expiryDate = validatedData.expiry_date || 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Créer la réservation dans MySQL
    await executeQuery(
      `INSERT INTO reservations (id, user_id, book_id, academic_document_id, document_type,
       reservation_date, expiry_date, status, priority_order, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservationId,
        validatedData.user_id,
        validatedData.book_id || null,
        validatedData.academic_document_id || null,
        validatedData.document_type,
        validatedData.reservation_date || new Date().toISOString().split('T')[0],
        expiryDate,
        'active',
        priorityOrder,
        validatedData.notes || null
      ]
    );

    // Mettre à jour le nombre d'exemplaires disponibles (réserver un exemplaire)
    // Seulement pour les livres qui ont un système d'exemplaires
    if (validatedData.document_type === 'book') {
      await executeQuery(
        `UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0`,
        [documentId]
      );
    }
    // Les documents académiques n'ont pas de système d'exemplaires multiples

    // Récupérer la réservation créée avec les détails (CORRECTION COLLATION)
    const newReservations = await executeQuery(
      `SELECT
        r.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        CASE WHEN r.document_type = 'book' THEN b.title ELSE ad.title END as document_title,
        CASE WHEN r.document_type = 'book' THEN b.main_author ELSE ad.main_author END as document_author
      FROM reservations r
      INNER JOIN users u ON r.user_id = u.id
      LEFT JOIN books b ON r.book_id = b.id
      LEFT JOIN (
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
        FROM theses
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(main_author AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
        FROM memoires
        UNION ALL
        SELECT CAST(id AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as id,
               CAST(title AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as title,
               CAST(student_name AS CHAR CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci) as main_author
        FROM stage_reports
      ) ad ON r.academic_document_id = ad.id
      WHERE r.id = ?`,
      [reservationId]
    ) as Array<any>;

    const newReservation = newReservations[0];

    // Logger la création de la réservation
    await logLibraryOperation(
      'reservation_created',
      validatedData.user_id,
      documentId,
      {
        recordId: reservationId,
        document_type: validatedData.document_type,
        reservation_date: validatedData.reservation_date || new Date().toISOString().split('T')[0],
        expiry_date: expiryDate,
        priority_order: priorityOrder,
        document_title: newReservation.document_title
      }
    );

    // 📧 ENVOYER NOTIFICATION EMAIL DE RÉSERVATION
    try {
      const emailData: ReservationNotificationData = {
        user_name: newReservation.user_name,
        user_email: newReservation.user_email,
        document_title: newReservation.document_title || 'Document',
        document_author: newReservation.document_author || 'Auteur non spécifié',
        document_type: validatedData.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
        reservation_date: newReservation.reservation_date,
        expiry_date: newReservation.expiry_date,
        reservation_id: newReservation.id,
        priority_order: newReservation.priority_order
      };

      const emailSent = await EmailNotificationService.sendReservationConfirmation(emailData);
      if (emailSent) {
        console.log(`✅ Email de réservation envoyé à ${newReservation.user_email}`);
      } else {
        console.log(`⚠️ Échec envoi email de réservation à ${newReservation.user_email}`);
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email réservation:', emailError);
      // Ne pas faire échouer la création de la réservation si l'email échoue
    }

    return NextResponse.json(
      { data: newReservation, message: 'Réservation créée avec succès' },
      { status: 201 }
    );
  } catch (error: unknown) {
    // 🔍 LOG DÉTAILLÉ: Erreur de validation
    if (isZodError(error)) {
      console.error('❌ Erreur de validation Zod:', {
        error: (error as any).issues
      });

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Données de réservation invalides',
            details: (error as any).issues
          }
        },
        { status: 400 }
      );
    }

    console.error('❌ Erreur interne réservation:', error);
    await logError(error as Error, {
      action: 'create_reservation',
      requestUrl: '/api/reservations'
    });
    return createDatabaseErrorResponse(error);
  }
}

// PATCH /api/reservations - Mettre à jour une réservation (utilisé par l'API individuelle)
export async function PATCH(_request: NextRequest) {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Utilisez /api/reservations/[id] pour mettre à jour une réservation' } },
    { status: 405 }
  );
}

// DELETE /api/reservations - Supprimer des réservations (utilisé par l'API individuelle)
export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Utilisez /api/reservations/[id] pour supprimer une réservation' } },
    { status: 405 }
  );
}
