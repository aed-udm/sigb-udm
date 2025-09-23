import { NextRequest, NextResponse } from 'next/server';
import { loanSchema } from '@/lib/validations';
import { getLoans, executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { createLatePenalty, processOverdueLoans } from '@/lib/penalties';
import { logLibraryOperation, logError } from '@/lib/system-logger';
import { EmailNotificationService, LoanNotificationData } from '@/lib/services/email-notification-service';

// Gestion d'erreur simplifiée

// Fonction pour mettre à jour automatiquement les statuts en retard
async function updateOverdueLoans() {
  try {
    // Traiter les pénalités automatiquement pour tous les emprunts en retard
    await processOverdueLoans();
    
    // Mettre à jour tous les emprunts actifs dont la date de retour est dépassée
    await executeQuery(`
      UPDATE loans
      SET status = 'overdue', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active'
      AND due_date < CURDATE()
      AND return_date IS NULL
    `);

    console.log(' Statuts des emprunts en retard mis à jour automatiquement');
  } catch (error) {
    console.error(' Erreur lors de la mise à jour des emprunts en retard:', error);
    await logError(error as Error, { action: 'update_overdue_loans' });
  }
}

// GET /api/loans - Récupérer tous les emprunts avec filtres
export async function GET(request: NextRequest) {
  try {
    // IMPORTANT: Mettre à jour automatiquement les statuts en retard avant de récupérer les données
    await updateOverdueLoans();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const user_id = searchParams.get('user_id') || '';
    const book_id = searchParams.get('book_id') || '';

    // Construire les filtres pour MySQL
    const filters: Record<string, unknown> = {};

    if (status) {
      filters.status = status;
    }

    if (user_id) {
      filters.user_id = user_id;
    }

    if (book_id) {
      filters.book_id = book_id;
    }

    // Récupérer tous les emprunts avec détails depuis MySQL
    const allLoans = await getLoans(filters);

    // Récupérer aussi les consultations sur place si demandé
    let consultations: any[] = [];
    const includeReadingRoom = searchParams.get('type') === 'reading_room' || searchParams.get('include_consultations') === 'true';

    if (includeReadingRoom) {
      let consultationQuery = `
        SELECT
          rc.*,
          'reading_room' as loan_type,
          u.full_name as user_name,
          u.email as user_email,
          u.matricule as user_barcode,
          CASE
            WHEN rc.book_id IS NOT NULL THEN b.title
            WHEN rc.academic_document_id IS NOT NULL THEN
              COALESCE(t.title, m.title, sr.title)
          END as document_title,
          CASE
            WHEN rc.book_id IS NOT NULL THEN b.main_author
            WHEN rc.academic_document_id IS NOT NULL THEN
              COALESCE(t.main_author, m.main_author, sr.student_name)
          END as document_author,
          CASE
            WHEN rc.book_id IS NOT NULL THEN b.mfn
            ELSE NULL
          END as document_mfn
        FROM reading_room_consultations rc
        LEFT JOIN users u ON rc.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
        LEFT JOIN books b ON rc.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci
        LEFT JOIN theses t ON rc.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND rc.document_type = 'these'
        LEFT JOIN memoires m ON rc.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND rc.document_type = 'memoire'
        LEFT JOIN stage_reports sr ON rc.academic_document_id COLLATE utf8mb4_unicode_ci = sr.id COLLATE utf8mb4_unicode_ci AND rc.document_type = 'rapport_stage'
        WHERE 1=1
      `;

      const consultationParams: any[] = [];

      if (status) {
        consultationQuery += ' AND rc.status = ?';
        consultationParams.push(status);
      }

      if (user_id) {
        consultationQuery += ' AND rc.user_id = ?';
        consultationParams.push(user_id);
      }

      consultationQuery += ' ORDER BY rc.created_at DESC';

      consultations = await executeQuery(consultationQuery, consultationParams) as any[];

      // Transformer les consultations pour qu'elles ressemblent aux emprunts
      consultations = consultations.map(consultation => ({
        id: consultation.id,
        user_id: consultation.user_id,
        book_id: consultation.book_id,
        academic_document_id: consultation.academic_document_id,
        document_type: consultation.document_type,
        loan_date: consultation.consultation_date,
        due_date: null, // Pas de date de retour pour les consultations
        return_date: consultation.end_time ? consultation.consultation_date : null,
        status: consultation.status,
        created_at: consultation.created_at,
        updated_at: consultation.updated_at,
        user_name: consultation.user_name || '',
        user_email: consultation.user_email || '',
        user_barcode: consultation.user_barcode || '',
        book_title: consultation.document_title || '',
        book_author: consultation.document_author || '',
        book_mfn: consultation.document_mfn || '',
        academic_title: consultation.document_title || '',
        academic_author: consultation.document_author || '',
        academic_degree: '',
        days_overdue: 0,
        effective_days_overdue: 0,
        has_unpaid_penalties: 0,
        loan_type: 'reading_room',
        reading_location: consultation.reading_location,
        start_time: consultation.start_time,
        end_time: consultation.end_time,
        consultation_notes: consultation.notes
      }));
    }

    // Combiner emprunts et consultations
    const allRecords = [...allLoans, ...consultations];

    // Trier par date de création (plus récent en premier)
    allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calculer la pagination
    const total = allRecords.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const loans = allRecords.slice(startIndex, endIndex);

    const response = {
      data: loans || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: startIndex + limit < total,
        has_prev: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des emprunts' } },
      { status: 500 }
    );
  }
}

// POST /api/loans - Créer un nouvel emprunt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validatedData = loanSchema.parse(body);

    // Vérification que l'utilisateur existe et est actif
    const users = await executeQuery(
      'SELECT id, full_name, email, barcode, is_active, max_loans FROM users WHERE id = ?',
      [validatedData.user_id]
    ) as Array<{ id: string; is_active: boolean; max_loans: number }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = users[0];
    if (!user.is_active) {
      return NextResponse.json(
        { error: { code: 'USER_INACTIVE', message: 'Utilisateur inactif' } },
        { status: 422 }
      );
    }

    // 🚨 VÉRIFICATION CRITIQUE AVEC SERVICE DE DISPONIBILITÉ
    let documentInfo: any = null;
    let documentTable = '';
    let documentId = '';

    if (validatedData.document_type === 'book' && validatedData.book_id) {
      const books = await executeQuery(
        'SELECT id, title, main_author, mfn, total_copies FROM books WHERE id = ?',
        [validatedData.book_id]
      ) as Array<{ id: string; total_copies: number; title: string; main_author: string }>;

      if (books.length === 0) {
        return NextResponse.json(
          { error: { code: 'BOOK_NOT_FOUND', message: 'Livre non trouvé' } },
          { status: 404 }
        );
      }

      // 🔍 UTILISER LE SERVICE DE DISPONIBILITÉ POUR CALCUL RÉEL
      const { DocumentAvailabilityService } = await import('@/lib/document-availability');
      const availability = await DocumentAvailabilityService.getDocumentAvailability(
        validatedData.book_id,
        'book'
      );

      if (!availability) {
        return NextResponse.json(
          { error: { code: 'BOOK_AVAILABILITY_ERROR', message: 'Erreur lors de la vérification de disponibilité' } },
          { status: 500 }
        );
      }

      documentInfo = {
        ...books[0],
        available_copies: availability.available_copies,
        active_loans: availability.active_loans,
        active_reservations: availability.active_reservations
      };
      documentTable = 'books';
      documentId = validatedData.book_id;

      console.log(`🔍 DISPONIBILITÉ LIVRE ${validatedData.book_id}:`, {
        title: books[0].title,
        total_copies: books[0].total_copies,
        available_copies: availability.available_copies,
        active_loans: availability.active_loans,
        active_reservations: availability.active_reservations,
        is_available: availability.is_available
      });
    } else if (validatedData.academic_document_id) {
      // Vérifier le document académique selon son type
      let query = '';
      let tableName = '';

      switch (validatedData.document_type) {
        case 'these':
          query = 'SELECT id, title, main_author FROM theses WHERE id = ?';
          tableName = 'theses';
          break;
        case 'memoire':
          query = 'SELECT id, title, main_author FROM memoires WHERE id = ?';
          tableName = 'memoires';
          break;
        case 'rapport_stage':
          query = 'SELECT id, title, student_name as main_author FROM stage_reports WHERE id = ?';
          tableName = 'stage_reports';
          break;
        default:
          return NextResponse.json(
            { error: { code: 'INVALID_DOCUMENT_TYPE', message: 'Type de document invalide' } },
            { status: 422 }
          );
      }

      const documents = await executeQuery(query, [validatedData.academic_document_id]) as Array<{
        id: string;
        title: string;
        main_author: string;
      }>;

      if (documents.length === 0) {
        return NextResponse.json(
          { error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document académique non trouvé' } },
          { status: 404 }
        );
      }

      // 🔍 UTILISER LE SERVICE DE DISPONIBILITÉ POUR DOCUMENTS ACADÉMIQUES
      const { DocumentAvailabilityService } = await import('@/lib/document-availability');
      const availability = await DocumentAvailabilityService.getDocumentAvailability(
        validatedData.academic_document_id,
        validatedData.document_type
      );

      if (!availability) {
        return NextResponse.json(
          { error: { code: 'DOCUMENT_AVAILABILITY_ERROR', message: 'Erreur lors de la vérification de disponibilité' } },
          { status: 500 }
        );
      }

      documentInfo = {
        ...documents[0],
        available_copies: availability.available_copies,
        active_loans: availability.active_loans,
        active_reservations: availability.active_reservations
      };
      documentTable = tableName;
      documentId = validatedData.academic_document_id;

      console.log(`🔍 DISPONIBILITÉ DOCUMENT ACADÉMIQUE ${validatedData.academic_document_id}:`, {
        type: validatedData.document_type,
        title: documents[0].title,
        available_copies: availability.available_copies,
        active_loans: availability.active_loans,
        active_reservations: availability.active_reservations,
        is_available: availability.is_available
      });
    } else {
      return NextResponse.json(
        { error: { code: 'NO_DOCUMENT_SPECIFIED', message: 'Aucun document spécifié' } },
        { status: 422 }
      );
    }

    // Vérifier d'abord s'il y a des réservations actives pour ce document
    let reservationCheckQuery = '';
    let reservationCheckParams: any[] = [];

    if (validatedData.document_type === 'book') {
      reservationCheckQuery = `
        SELECT
          r.id,
          r.user_id,
          r.priority_order,
          u.full_name as user_name,
          u.email as user_email
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        WHERE r.book_id = ? AND r.status = 'active'
        ORDER BY r.priority_order ASC
      `;
      reservationCheckParams = [validatedData.book_id];
    } else {
      reservationCheckQuery = `
        SELECT
          r.id,
          r.user_id,
          r.priority_order,
          u.full_name as user_name,
          u.email as user_email
        FROM reservations r
        JOIN users u ON r.user_id = u.id
        WHERE r.academic_document_id = ? AND r.status = 'active'
        ORDER BY r.priority_order ASC
      `;
      reservationCheckParams = [validatedData.academic_document_id];
    }

    const activeReservations = await executeQuery(reservationCheckQuery, reservationCheckParams) as Array<{
      id: string;
      user_id: string;
      priority_order: number;
      user_name: string;
      user_email: string;
    }>;

    //  NOUVELLE RÈGLE MÉTIER : Aucun emprunt ne peut être créé tant que des réservations existent
    // Ceci garantit que le système de réservation est respecté et que les réservations sont satisfaites en priorité
    if (activeReservations.length > 0) {
      const firstReservation = activeReservations[0];

      console.log(` EMPRUNT BLOQUÉ - ${activeReservations.length} réservation(s) active(s) pour ce document`);
      console.log(` Première réservation: ${firstReservation.user_name} (${firstReservation.user_email})`);

      return NextResponse.json(
        {
          error: {
            code: 'DOCUMENT_HAS_RESERVATIONS',
            message: `Impossible de créer un emprunt. Ce document a ${activeReservations.length} réservation(s) active(s) qui doivent être satisfaites en priorité. La première réservation est de ${firstReservation.user_name} (${firstReservation.user_email}). Veuillez utiliser la fonction "Satisfaire réservation" pour traiter les réservations en attente.`,
            details: {
              total_reservations: activeReservations.length,
              first_reservation: {
                user_name: firstReservation.user_name,
                user_email: firstReservation.user_email,
                priority_order: firstReservation.priority_order
              },
              document_title: documentInfo.title,
              document_author: documentInfo.main_author || documentInfo.student_name,
              action_required: 'Satisfaire les réservations avant de créer un emprunt'
            }
          }
        },
        { status: 422 }
      );
    }

    if (documentInfo.available_copies <= 0) {
      // Message plus spécifique selon qu'il y ait des réservations ou non
      const message = activeReservations.length > 0
        ? `Document non disponible. ${activeReservations.length} réservation(s) en attente. Faites une réservation pour vous mettre dans la file d'attente.`
        : 'Document non disponible. Aucun exemplaire disponible actuellement.';

      return NextResponse.json(
        {
          error: {
            code: 'DOCUMENT_UNAVAILABLE',
            message,
            details: {
              available_copies: documentInfo.available_copies,
              reservations_count: activeReservations.length,
              document_title: documentInfo.title,
              document_author: documentInfo.main_author
            }
          }
        },
        { status: 422 }
      );
    }

    // Vérification de la limite d'emprunts de l'utilisateur
    const currentLoans = await executeQuery(
      'SELECT id FROM loans WHERE user_id = ? AND status IN (?, ?)',
      [validatedData.user_id, 'active', 'overdue']
    ) as Array<{ id: string }>;

    if (currentLoans.length >= user.max_loans) {
      return NextResponse.json(
        {
          error: {
            code: 'LOAN_LIMIT_EXCEEDED',
            message: `Limite d'emprunts atteinte (${user.max_loans} maximum)`
          }
        },
        { status: 422 }
      );
    }

    // Vérification qu'il n'y a pas déjà un emprunt actif pour ce document par cet utilisateur
    let existingLoansQuery = '';
    let existingLoansParams: any[] = [];

    if (validatedData.document_type === 'book') {
      existingLoansQuery = 'SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status IN (?, ?)';
      existingLoansParams = [validatedData.user_id, validatedData.book_id, 'active', 'overdue'];
    } else {
      existingLoansQuery = 'SELECT id FROM loans WHERE user_id = ? AND academic_document_id = ? AND status IN (?, ?)';
      existingLoansParams = [validatedData.user_id, validatedData.academic_document_id, 'active', 'overdue'];
    }

    const existingLoans = await executeQuery(existingLoansQuery, existingLoansParams) as Array<{ id: string }>;

    if (existingLoans.length > 0) {
      return NextResponse.json(
        { error: { code: 'ALREADY_BORROWED', message: 'Ce document est déjà emprunté par cet utilisateur' } },
        { status: 422 }
      );
    }

    // Générer un UUID pour le nouvel emprunt
    const loanId = uuidv4();

    // Créer l'emprunt dans MySQL
    await executeQuery(
      `INSERT INTO loans (id, user_id, book_id, academic_document_id, document_type, loan_date, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loanId,
        validatedData.user_id,
        validatedData.book_id || null,
        validatedData.academic_document_id || null,
        validatedData.document_type,
        validatedData.loan_date || new Date().toISOString().split('T')[0],
        validatedData.due_date,
        'active'
      ]
    );

    // 🎯 REMARQUE : Le code de satisfaction automatique des réservations a été supprimé
    // car maintenant aucun emprunt ne peut être créé tant que des réservations existent.
    // Les réservations doivent être satisfaites explicitement via l'API /api/reservations/[id]/fulfill

    // Mettre à jour le nombre d'exemplaires disponibles
    await executeQuery(
      `UPDATE ${documentTable} SET available_copies = available_copies - 1 WHERE id = ?`,
      [documentId]
    );

    // Récupérer l'emprunt créé avec les détails
    const newLoans = await executeQuery(
      `SELECT
        l.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        -- Informations du livre (si c'est un livre)
        CASE WHEN l.document_type = 'book' THEN b.title ELSE NULL END as book_title,
        CASE WHEN l.document_type = 'book' THEN b.main_author ELSE NULL END as book_author,
        CASE WHEN l.document_type = 'book' THEN b.mfn ELSE NULL END as book_mfn,
        -- Informations du document académique (si c'est un document académique)
        CASE
            WHEN l.document_type = 'these' THEN t.title
            WHEN l.document_type = 'memoire' THEN m.title
            WHEN l.document_type = 'rapport_stage' THEN s.title
            ELSE NULL
        END as academic_title,
        CASE
            WHEN l.document_type = 'these' THEN t.main_author
            WHEN l.document_type = 'memoire' THEN m.main_author
            WHEN l.document_type = 'rapport_stage' THEN s.student_name
            ELSE NULL
        END as academic_author,
        CASE
            WHEN l.document_type = 'these' THEN t.target_degree
            WHEN l.document_type = 'memoire' THEN m.degree_level
            WHEN l.document_type = 'rapport_stage' THEN s.degree_level
            ELSE NULL
        END as academic_degree
       FROM loans l
       JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
       LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
       LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
       LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
       LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
       WHERE l.id = ?`,
      [loanId]
    ) as Array<{
      id: string;
      user_id: string;
      book_id: string;
      academic_document_id: string;
      document_type: string;
      loan_date: string;
      due_date: string;
      status: string;
      user_name: string;
      user_email: string;
      user_barcode: string;
      book_title?: string;
      book_author?: string;
      book_mfn?: string;
      academic_title?: string;
      academic_author?: string;
      academic_degree?: string;
    }>;

    const newLoan = newLoans[0];

    // Logger l'opération d'emprunt
    await logLibraryOperation(
      'loan_created',
      validatedData.user_id,
      documentId,
      {
        recordId: loanId,
        document_type: validatedData.document_type,
        due_date: validatedData.due_date,
        document_title: documentInfo.title
      }
    );

    // 📧 ENVOYER NOTIFICATION EMAIL D'EMPRUNT
    try {
      const emailData: LoanNotificationData = {
        user_name: newLoan.user_name,
        user_email: newLoan.user_email,
        document_title: newLoan.book_title || newLoan.academic_title || 'Document',
        document_author: newLoan.book_author || newLoan.academic_author || 'Auteur non spécifié',
        document_type: validatedData.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage',
        loan_date: newLoan.loan_date,
        due_date: newLoan.due_date,
        loan_id: newLoan.id,
        barcode: newLoan.user_barcode
      };

      const emailSent = await EmailNotificationService.sendLoanConfirmation(emailData);
      if (emailSent) {
        console.log(`✅ Email d'emprunt envoyé à ${newLoan.user_email}`);
      } else {
        console.log(`⚠️ Échec envoi email d'emprunt à ${newLoan.user_email}`);
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email emprunt:', emailError);
      // Ne pas faire échouer la création de l'emprunt si l'email échoue
    }

    return NextResponse.json(
      { data: newLoan, message: 'Emprunt créé avec succès' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating loan:', error);
    await logError(error as Error, { 
      action: 'create_loan',
      requestUrl: '/api/loans'
    });
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création de l\'emprunt' } },
      { status: 500 }
    );
  }
}
