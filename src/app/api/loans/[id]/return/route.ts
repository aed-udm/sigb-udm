import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { createLatePenalty } from '@/lib/penalties';
import { logLibraryOperation, logError } from '@/lib/system-logger';
import { EmailNotificationService, DocumentAvailableNotificationData } from '@/lib/services/email-notification-service';

/**
 * 🎯 Fonction pour vérifier et notifier les utilisateurs en attente de réservation
 * après qu'un document soit retourné
 */
async function checkAndNotifyWaitingReservations(documentId: string, documentType: 'book' | 'these' | 'memoire' | 'rapport_stage') {
  try {
    console.log(`🔍 Vérification des réservations en attente pour ${documentType} ${documentId}`);

    // Récupérer les réservations actives pour ce document
    const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
    const reservationQuery = `
      SELECT
        r.id,
        r.user_id,
        r.priority_order,
        u.full_name as user_name,
        u.email as user_email,
        CASE
          WHEN r.book_id IS NOT NULL THEN b.title
          WHEN r.academic_document_id IS NOT NULL THEN
            CASE
              WHEN r.document_type = 'these' THEN t.title
              WHEN r.document_type = 'memoire' THEN m.title
              WHEN r.document_type = 'rapport_stage' THEN s.title
            END
        END as document_title,
        CASE
          WHEN r.book_id IS NOT NULL THEN b.main_author
          WHEN r.academic_document_id IS NOT NULL THEN
            CASE
              WHEN r.document_type = 'these' THEN t.main_author
              WHEN r.document_type = 'memoire' THEN m.main_author
              WHEN r.document_type = 'rapport_stage' THEN s.student_name
            END
        END as document_author,
        r.created_at
      FROM reservations r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN books b ON r.book_id = b.id
      LEFT JOIN theses t ON r.academic_document_id = t.id AND r.document_type = 'these'
      LEFT JOIN memoires m ON r.academic_document_id = m.id AND r.document_type = 'memoire'
      LEFT JOIN stage_reports s ON r.academic_document_id = s.id AND r.document_type = 'rapport_stage'
      WHERE r.${documentField} = ?
      ${documentType !== 'book' ? 'AND r.document_type = ?' : ''}
      AND r.status = 'active'
      ORDER BY r.priority_order ASC
    `;

    const params = documentType === 'book' ? [documentId] : [documentId, documentType];
    const waitingReservations = await executeQuery(reservationQuery, params) as Array<{
      id: string;
      user_id: string;
      priority_order: number;
      user_name: string;
      user_email: string;
      document_title: string;
      document_author: string;
      created_at: string;
    }>;

    if (waitingReservations.length > 0) {
      console.log(`📧 ${waitingReservations.length} utilisateur(s) en attente de réservation à notifier`);

      // Notifier tous les utilisateurs en attente que le document est maintenant disponible
      for (const reservation of waitingReservations) {
        try {
          const notificationData: DocumentAvailableNotificationData = {
            user_name: reservation.user_name,
            user_email: reservation.user_email,
            document_title: reservation.document_title,
            document_author: reservation.document_author,
            document_type: documentType,
            reservation_date: reservation.created_at,
            priority: reservation.priority_order,
            return_date: new Date().toISOString()
          };

          await EmailNotificationService.sendDocumentAvailableNotification(notificationData);
          console.log(`✅ Email de disponibilité envoyé à ${reservation.user_email} (position ${reservation.priority_order})`);
        } catch (emailError) {
          console.error(`❌ Erreur envoi email à ${reservation.user_email}:`, emailError);
        }
      }
    } else {
      console.log(`ℹ️ Aucune réservation en attente pour ce document`);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des réservations en attente:', error);
  }
}

// PUT /api/loans/[id]/return - Retourner un livre
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('🔍 Tentative de retour pour l\'emprunt ID:', id);

    // Récupérer l'emprunt avec les détails utilisateur et document
    const loans = await executeQuery(
      `SELECT
        l.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        CASE
          WHEN l.document_type = 'book' THEN b.title
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
        END as document_title,
        CASE
          WHEN l.document_type = 'book' THEN b.main_author
          WHEN l.document_type = 'these' THEN t.main_author
          WHEN l.document_type = 'memoire' THEN m.main_author
          WHEN l.document_type = 'rapport_stage' THEN s.student_name
        END as document_author,
        CASE
          WHEN l.document_type = 'book' THEN b.mfn
          WHEN l.document_type = 'these' THEN t.id
          WHEN l.document_type = 'memoire' THEN m.id
          WHEN l.document_type = 'rapport_stage' THEN s.id
        END as document_reference,
        CASE
          WHEN l.document_type = 'book' THEN b.available_copies
          ELSE 1
        END as available_copies
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      WHERE l.id = ?`,
      [id]
    ) as Array<{
      id: string;
      user_id: string;
      book_id: string | null;
      academic_document_id: string | null;
      document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
      loan_date: string;
      due_date: string;
      return_date: string | null;
      status: string;
      user_name: string;
      user_email: string;
      document_title: string;
      document_author: string;
      document_reference: string;
      available_copies: number;
    }>;

    if (loans.length === 0) {
      console.log('❌ Emprunt non trouvé pour l\'ID:', id);
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Emprunt non trouvé' } },
        { status: 404 }
      );
    }

    console.log('✅ Emprunt trouvé:', {
      id: loans[0].id,
      status: loans[0].status,
      document_type: loans[0].document_type,
      user_name: loans[0].user_name
    });

    const loan = loans[0];

    // Vérification que l'emprunt n'est pas déjà retourné
    if (loan.status === 'returned') {
      return NextResponse.json(
        { error: { code: 'ALREADY_RETURNED', message: 'Ce livre a déjà été retourné' } },
        { status: 422 }
      );
    }

    // 🚨 VÉRIFICATION CRITIQUE : Vérifier les pénalités impayées de l'utilisateur
    const unpaidPenalties = await executeQuery(`
      SELECT
        p.id,
        p.amount_fcfa,
        p.description,
        p.penalty_date,
        l2.id as related_loan_id,
        CASE
          WHEN l2.document_type = 'book' THEN b.title
          WHEN l2.document_type = 'these' THEN t.title
          WHEN l2.document_type = 'memoire' THEN m.title
          WHEN l2.document_type = 'rapport_stage' THEN s.title
        END as document_title
      FROM penalties p
      LEFT JOIN loans l2 ON p.loan_id COLLATE utf8mb4_unicode_ci = l2.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l2.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l2.document_type = 'book'
      LEFT JOIN theses t ON l2.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l2.document_type = 'these'
      LEFT JOIN memoires m ON l2.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l2.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l2.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l2.document_type = 'rapport_stage'
      WHERE p.user_id = ? AND p.status = 'unpaid'
      ORDER BY p.penalty_date ASC
    `, [loan.user_id]) as Array<{
      id: string;
      amount_fcfa: number;
      description: string;
      penalty_date: string;
      related_loan_id: string;
      document_title: string;
    }>;

    // Vérifier si cet emprunt spécifique a des pénalités impayées
    const currentLoanPenalties = unpaidPenalties.filter(p => p.related_loan_id === loan.id);

    // Si CET emprunt a des pénalités impayées, bloquer le retour
    if (currentLoanPenalties.length > 0) {
      const totalUnpaidForThisLoan = currentLoanPenalties.reduce((sum, penalty) => sum + penalty.amount_fcfa, 0);

      return NextResponse.json(
        {
          error: {
            code: 'UNPAID_PENALTIES',
            message: `Impossible de retourner le livre. Cet emprunt a ${currentLoanPenalties.length} pénalité(s) impayée(s) pour un total de ${totalUnpaidForThisLoan.toLocaleString()} FCFA.`,
            details: {
              unpaid_penalties: currentLoanPenalties,
              total_amount: totalUnpaidForThisLoan,
              user_name: loan.user_name,
              user_email: loan.user_email
            }
          }
        },
        { status: 422 }
      );
    }

    // Si l'utilisateur a d'autres pénalités impayées (pas sur cet emprunt), permettre le retour mais avertir
    const otherUnpaidPenalties = unpaidPenalties.filter(p => p.related_loan_id !== loan.id);
    const hasOtherUnpaidPenalties = otherUnpaidPenalties.length > 0;

    // Calcul des informations de retour
    const returnDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(loan.due_date);
    const returnDateObj = new Date(returnDate);
    const isLate = returnDateObj > dueDate;
    const daysLate = isLate ? Math.ceil((returnDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // Créer une pénalité automatiquement si retour en retard
    let penaltyCreated = false;
    let penaltyError = null;

    if (isLate && daysLate > 0) {
      try {
        await createLatePenalty(
          loan.user_id,
          loan.id,
          daysLate,
          loan.document_type
        );
        penaltyCreated = true;
        console.log(`✅ Pénalité créée automatiquement pour ${daysLate} jours de retard`);
      } catch (error) {
        penaltyError = error;
        console.error('❌ Erreur création pénalité:', error);
        // Ne pas faire échouer le retour si la pénalité échoue, mais l'indiquer dans la réponse
      }
    }

    // Mise à jour de l'emprunt dans MySQL
    await executeQuery(
      'UPDATE loans SET return_date = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [returnDate, 'returned', id]
    );

    // Mise à jour du nombre d'exemplaires disponibles pour tous les types de documents
    let documentTable = '';
    let documentId = '';

    if (loan.document_type === 'book' && loan.book_id) {
      documentTable = 'books';
      documentId = loan.book_id;
    } else if (loan.academic_document_id) {
      switch (loan.document_type) {
        case 'these':
          documentTable = 'theses';
          break;
        case 'memoire':
          documentTable = 'memoires';
          break;
        case 'rapport_stage':
          documentTable = 'stage_reports';
          break;
        default:
          console.log(`⚠️ Type de document non reconnu: ${loan.document_type}`);
          break;
      }
      documentId = loan.academic_document_id;
    }

    if (documentTable && documentId) {
      // Vérifier d'abord l'état actuel du document
      const documentInfo = await executeQuery(
        `SELECT total_copies, available_copies FROM ${documentTable} WHERE id = ?`,
        [documentId]
      ) as Array<{ total_copies: number; available_copies: number }>;

      if (documentInfo.length > 0) {
        const document = documentInfo[0];
        // Seulement augmenter si on peut le faire sans violer la contrainte
        if (document.available_copies < document.total_copies) {
          await executeQuery(
            `UPDATE ${documentTable} SET available_copies = available_copies + 1 WHERE id = ?`,
            [documentId]
          );
          console.log(`✅ Disponibilité mise à jour pour ${loan.document_type} ${documentId}: ${document.available_copies + 1}/${document.total_copies}`);
        } else {
          console.log(`⚠️ Document ${documentId} (${loan.document_type}) a déjà tous ses exemplaires disponibles (${document.available_copies}/${document.total_copies})`);
        }
      } else {
        console.log(`❌ Document ${documentId} non trouvé dans la table ${documentTable}`);
      }
    } else {
      console.log(`⚠️ Impossible de déterminer la table et l'ID du document pour l'emprunt ${id}`);
    }

    // Récupérer l'emprunt mis à jour
    const updatedLoans = await executeQuery(
      `SELECT
        l.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        CASE
          WHEN l.document_type = 'book' THEN b.title
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
        END as document_title,
        CASE
          WHEN l.document_type = 'book' THEN b.main_author
          WHEN l.document_type = 'these' THEN t.main_author
          WHEN l.document_type = 'memoire' THEN m.main_author
          WHEN l.document_type = 'rapport_stage' THEN s.student_name
        END as document_author,
        CASE
          WHEN l.document_type = 'book' THEN b.mfn
          WHEN l.document_type = 'these' THEN t.id
          WHEN l.document_type = 'memoire' THEN m.id
          WHEN l.document_type = 'rapport_stage' THEN s.id
        END as document_reference
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      WHERE l.id = ?`,
      [id]
    ) as Array<{
      id: string;
      user_id: string;
      book_id: string | null;
      academic_document_id: string | null;
      document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
      loan_date: string;
      due_date: string;
      return_date: string | null;
      status: string;
      user_name: string;
      user_email: string;
      document_title: string;
      document_author: string;
      document_reference: string;
    }>;

    const updatedLoan = updatedLoans[0];

    // Logger l'opération de retour
    await logLibraryOperation(
      'loan_returned',
      loan.user_id,
      documentId,
      {
        recordId: loan.id,
        document_type: loan.document_type,
        return_date: returnDate,
        is_late: isLate,
        days_late: daysLate,
        document_title: loan.document_title
      }
    );

    // Préparation de la réponse avec informations sur le retard et autres pénalités
    let message = isLate
      ? `Livre retourné avec ${daysLate} jour(s) de retard${penaltyCreated ? ' - Pénalité créée' : (penaltyError ? ' - Erreur pénalité' : '')}`
      : 'Livre retourné avec succès';

    // Ajouter avertissement pour autres pénalités impayées
    if (hasOtherUnpaidPenalties) {
      const totalOtherUnpaid = otherUnpaidPenalties.reduce((sum, penalty) => sum + penalty.amount_fcfa, 0);
      message += `. Attention: L'utilisateur a ${otherUnpaidPenalties.length} autre(s) pénalité(s) impayée(s) (${totalOtherUnpaid.toLocaleString()} FCFA)`;
    }

    // 🎯 NOUVEAU : Vérifier et notifier les utilisateurs en attente de réservation
    await checkAndNotifyWaitingReservations(documentId, loan.document_type as 'book' | 'these' | 'memoire' | 'rapport_stage');

    const response = {
      data: updatedLoan,
      message: message,
      return_info: {
        is_late: isLate,
        days_late: daysLate,
        due_date: loan.due_date,
        return_date: returnDate,
        penalty_created: penaltyCreated,
        penalty_error: penaltyError ? 'Erreur lors de la création de la pénalité' : null,
        has_other_unpaid_penalties: hasOtherUnpaidPenalties,
        other_unpaid_penalties: hasOtherUnpaidPenalties ? otherUnpaidPenalties : []
      },
      // 🎯 NOUVEAU : Indiquer que les interfaces doivent être rafraîchies
      refresh_required: {
        catalog: true,
        books: true,
        loans: true,
        reservations: true,
        home: true
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error returning book:', error);
    await logError(error as Error, { 
      action: 'return_loan',
      requestUrl: '/api/loans/[id]/return'
    });
    return NextResponse.json(
      { error: { code: 'RETURN_ERROR', message: 'Erreur lors du retour du livre' } },
      { status: 500 }
    );
  }
}

// GET /api/loans/[id]/return - Obtenir les informations de retour
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Récupérer l'emprunt avec les détails utilisateur et document
    const loans = await executeQuery(
      `SELECT
        l.*,
        u.full_name as user_name,
        u.email as user_email,
        u.barcode as user_barcode,
        CASE
          WHEN l.document_type = 'book' THEN b.title
          WHEN l.document_type = 'these' THEN t.title
          WHEN l.document_type = 'memoire' THEN m.title
          WHEN l.document_type = 'rapport_stage' THEN s.title
        END as document_title,
        CASE
          WHEN l.document_type = 'book' THEN b.main_author
          WHEN l.document_type = 'these' THEN t.main_author
          WHEN l.document_type = 'memoire' THEN m.main_author
          WHEN l.document_type = 'rapport_stage' THEN s.student_name
        END as document_author,
        CASE
          WHEN l.document_type = 'book' THEN b.mfn
          WHEN l.document_type = 'these' THEN t.id
          WHEN l.document_type = 'memoire' THEN m.id
          WHEN l.document_type = 'rapport_stage' THEN s.id
        END as document_reference
      FROM loans l
      JOIN users u ON l.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      LEFT JOIN books b ON l.book_id COLLATE utf8mb4_unicode_ci = b.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'book'
      LEFT JOIN theses t ON l.academic_document_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'these'
      LEFT JOIN memoires m ON l.academic_document_id COLLATE utf8mb4_unicode_ci = m.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'memoire'
      LEFT JOIN stage_reports s ON l.academic_document_id COLLATE utf8mb4_unicode_ci = s.id COLLATE utf8mb4_unicode_ci AND l.document_type = 'rapport_stage'
      WHERE l.id = ?`,
      [id]
    ) as Array<{
      id: string;
      user_id: string;
      book_id: string | null;
      academic_document_id: string | null;
      document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
      loan_date: string;
      due_date: string;
      return_date: string | null;
      status: string;
      user_name: string;
      user_email: string;
      user_barcode: string;
      document_title: string;
      document_author: string;
      document_reference: string;
    }>;

    if (loans.length === 0) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Emprunt non trouvé' } },
        { status: 404 }
      );
    }

    const loan = loans[0];

    if (loan.status === 'returned') {
      return NextResponse.json(
        { error: { code: 'ALREADY_RETURNED', message: 'Ce livre a déjà été retourné' } },
        { status: 422 }
      );
    }

    // Calcul des informations de retour potentiel
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(loan.due_date);
    const todayObj = new Date(today);
    const wouldBeLate = todayObj > dueDate;
    const daysLate = wouldBeLate ? Math.ceil((todayObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const daysUntilDue = wouldBeLate ? 0 : Math.ceil((dueDate.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));

    const response = {
      data: {
        loan_id: loan.id,
        user: {
          id: loan.user_id,
          full_name: loan.user_name,
          email: loan.user_email,
          barcode: loan.user_barcode
        },
        document: {
          id: loan.document_type === 'book' ? loan.book_id : loan.academic_document_id,
          type: loan.document_type,
          title: loan.document_title,
          author: loan.document_author,
          reference: loan.document_reference
        },
        loan_date: loan.loan_date,
        due_date: loan.due_date,
        would_be_late: wouldBeLate,
        days_late: daysLate,
        days_until_due: daysUntilDue,
        return_date_if_today: today
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting return info:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des informations' } },
      { status: 500 }
    );
  }
}
