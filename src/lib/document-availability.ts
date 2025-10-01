import { executeQuery } from '@/lib/mysql';

// Types pour la gestion unifiée de la disponibilité
export interface DocumentAvailability {
  document_id: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  title: string;
  author: string;
  total_copies: number;
  active_loans: number;
  active_reservations: number;
  active_consultations: number; // Consultations en salle de lecture
  available_copies: number; // Calculé dynamiquement
  is_available: boolean;
  next_available_date?: string;
}

export interface ReservationInfo {
  id: string;
  user_id: string;
  user_name: string;
  priority_order: number;
  reservation_date: string;
  expiry_date: string;
  notification_sent: boolean;
}

/**
 * Service unifié pour la gestion de la disponibilité des documents
 */
export class DocumentAvailabilityService {
  
  /**
   * Obtenir la disponibilité d'un document (livre ou académique)
   */
  static async getDocumentAvailability(
    documentId: string, 
    documentType: 'book' | 'these' | 'memoire' | 'rapport_stage'
  ): Promise<DocumentAvailability | null> {
    try {
      let query = '';
      let tableName = '';
      
      // Construire la requête selon le type de document
      switch (documentType) {
        case 'book':
          tableName = 'books';
          query = `
            SELECT 
              b.id as document_id,
              'book' as document_type,
              b.title,
              b.main_author as author,
              b.total_copies,
              COALESCE(loans.active_count, 0) as active_loans,
              COALESCE(reservations.active_count, 0) as active_reservations,
              COALESCE(consultations.active_count, 0) as active_consultations,
              GREATEST(0, b.total_copies - COALESCE(loans.active_count, 0) - COALESCE(reservations.active_count, 0) - COALESCE(consultations.active_count, 0)) as available_copies
            FROM books b
            LEFT JOIN (
              SELECT book_id, COUNT(*) as active_count
              FROM loans
              WHERE status IN ('active', 'overdue') AND CAST(book_id AS CHAR) = ?
              GROUP BY book_id
            ) loans ON CAST(b.id AS CHAR) = CAST(loans.book_id AS CHAR)
            LEFT JOIN (
              SELECT book_id, COUNT(*) as active_count
              FROM reservations
              WHERE status = 'active' AND CAST(book_id AS CHAR) = ?
              GROUP BY book_id
            ) reservations ON CAST(b.id AS CHAR) = CAST(reservations.book_id AS CHAR)
            LEFT JOIN (
              SELECT book_id, COUNT(*) as active_count
              FROM reading_room_consultations
              WHERE status = 'active' AND CAST(book_id AS CHAR) = ? AND document_type = 'book'
              GROUP BY book_id
            ) consultations ON CAST(b.id AS CHAR) = CAST(consultations.book_id AS CHAR)
            WHERE b.id = ?
          `;
          break;
          
        case 'these':
          tableName = 'theses';
          query = `
            SELECT 
              t.id as document_id,
              'these' as document_type,
              t.title,
              t.main_author as author,
              t.total_copies,
              COALESCE(loans.active_count, 0) as active_loans,
              COALESCE(reservations.active_count, 0) as active_reservations,
              COALESCE(consultations.active_count, 0) as active_consultations,
              GREATEST(0, t.total_copies - COALESCE(loans.active_count, 0) - COALESCE(reservations.active_count, 0) - COALESCE(consultations.active_count, 0)) as available_copies
            FROM theses t
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM loans
              WHERE status IN ('active', 'overdue') AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'these'
              GROUP BY academic_document_id
            ) loans ON CAST(t.id AS CHAR) = CAST(loans.academic_document_id AS CHAR)
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM reservations
              WHERE status = 'active' AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'these'
              GROUP BY academic_document_id
            ) reservations ON CAST(t.id AS CHAR) = CAST(reservations.academic_document_id AS CHAR)
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM reading_room_consultations
              WHERE status = 'active' AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'these'
              GROUP BY academic_document_id
            ) consultations ON CAST(t.id AS CHAR) = CAST(consultations.academic_document_id AS CHAR)
            WHERE t.id = ?
          `;
          break;
          
        case 'memoire':
          tableName = 'memoires';
          query = `
            SELECT
              m.id as document_id,
              'memoire' as document_type,
              m.title,
              m.main_author as author,
              m.total_copies,
              COALESCE(loans.active_count, 0) as active_loans,
              COALESCE(reservations.active_count, 0) as active_reservations,
              COALESCE(consultations.active_count, 0) as active_consultations,
              GREATEST(0, m.total_copies - COALESCE(loans.active_count, 0) - COALESCE(reservations.active_count, 0) - COALESCE(consultations.active_count, 0)) as available_copies
            FROM memoires m
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM loans
              WHERE status IN ('active', 'overdue') AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'memoire'
              GROUP BY academic_document_id
            ) loans ON CAST(m.id AS CHAR) = CAST(loans.academic_document_id AS CHAR)
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM reservations
              WHERE status = 'active' AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'memoire'
              GROUP BY academic_document_id
            ) reservations ON CAST(m.id AS CHAR) = CAST(reservations.academic_document_id AS CHAR)
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM reading_room_consultations
              WHERE status = 'active' AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'memoire'
              GROUP BY academic_document_id
            ) consultations ON CAST(m.id AS CHAR) = CAST(consultations.academic_document_id AS CHAR)
            WHERE m.id = ?
          `;
          break;
          
        case 'rapport_stage':
          tableName = 'stage_reports';
          query = `
            SELECT
              s.id as document_id,
              'rapport_stage' as document_type,
              s.title,
              s.student_name as author,
              s.total_copies,
              COALESCE(loans.active_count, 0) as active_loans,
              COALESCE(reservations.active_count, 0) as active_reservations,
              COALESCE(consultations.active_count, 0) as active_consultations,
              GREATEST(0, s.total_copies - COALESCE(loans.active_count, 0) - COALESCE(reservations.active_count, 0) - COALESCE(consultations.active_count, 0)) as available_copies
            FROM stage_reports s
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM loans
              WHERE status IN ('active', 'overdue') AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'rapport_stage'
              GROUP BY academic_document_id
            ) loans ON CAST(s.id AS CHAR) = CAST(loans.academic_document_id AS CHAR)
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM reservations
              WHERE status = 'active' AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'rapport_stage'
              GROUP BY academic_document_id
            ) reservations ON CAST(s.id AS CHAR) = CAST(reservations.academic_document_id AS CHAR)
            LEFT JOIN (
              SELECT academic_document_id, COUNT(*) as active_count
              FROM reading_room_consultations
              WHERE status = 'active' AND CAST(academic_document_id AS CHAR) = ? AND document_type = 'rapport_stage'
              GROUP BY academic_document_id
            ) consultations ON CAST(s.id AS CHAR) = CAST(consultations.academic_document_id AS CHAR)
            WHERE s.id = ?
          `;
          break;
          
        default:
          throw new Error(`Type de document non supporté: ${documentType}`);
      }
      
      const results = await executeQuery(query, [documentId, documentId, documentId, documentId]) as Array<{
        document_id: string;
        document_type: string;
        title: string;
        author: string;
        total_copies: number;
        active_loans: number;
        active_reservations: number;
        active_consultations: number;
        available_copies: number;
      }>;
      
      if (results.length === 0) {
        return null;
      }
      
      const result = results[0];
      
      // Calculer la prochaine date de disponibilité si nécessaire
      let nextAvailableDate: string | undefined;
      if (result.available_copies === 0) {
        nextAvailableDate = await this.getNextAvailableDate(documentId, documentType);
      }
      
      return {
        document_id: result.document_id,
        document_type: result.document_type as any,
        title: result.title,
        author: result.author,
        total_copies: result.total_copies,
        active_loans: result.active_loans,
        active_reservations: result.active_reservations,
        active_consultations: result.active_consultations,
        available_copies: result.available_copies,
        is_available: result.available_copies > 0,
        next_available_date: nextAvailableDate
      };
      
    } catch (error) {
      console.error('Erreur lors du calcul de disponibilité:', error);
      throw error;
    }
  }
  
  /**
   * Obtenir la prochaine date de disponibilité estimée
   */
  static async getNextAvailableDate(
    documentId: string, 
    documentType: 'book' | 'these' | 'memoire' | 'rapport_stage'
  ): Promise<string | undefined> {
    try {
      const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
      const whereClause = documentType === 'book' 
        ? `${documentField} = ?`
        : `${documentField} = ? AND document_type = ?`;
      const params = documentType === 'book' ? [documentId] : [documentId, documentType];
      
      // Trouver la date de retour prévue la plus proche
      const nextReturn = await executeQuery(`
        SELECT MIN(due_date) as next_due_date
        FROM loans 
        WHERE ${whereClause} AND status IN ('active', 'overdue')
      `, params) as Array<{ next_due_date: string | null }>;
      
      return nextReturn[0]?.next_due_date || undefined;
      
    } catch (error) {
      console.error('Erreur lors du calcul de la prochaine disponibilité:', error);
      return undefined;
    }
  }
  
  /**
   * Obtenir la file d'attente des réservations pour un document
   */
  static async getReservationQueue(
    documentId: string, 
    documentType: 'book' | 'these' | 'memoire' | 'rapport_stage'
  ): Promise<ReservationInfo[]> {
    try {
      const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
      const whereClause = documentType === 'book' 
        ? `r.${documentField} = ?`
        : `r.${documentField} = ? AND r.document_type = ?`;
      const params = documentType === 'book' ? [documentId] : [documentId, documentType];
      
      const reservations = await executeQuery(`
        SELECT 
          r.id,
          r.user_id,
          u.full_name as user_name,
          r.priority_order,
          r.reservation_date,
          r.expiry_date,
          r.notification_sent
        FROM reservations r
        INNER JOIN users u ON r.user_id = u.id
        WHERE ${whereClause} AND r.status = 'active'
        ORDER BY r.priority_order ASC
      `, params) as ReservationInfo[];
      
      return reservations;
      
    } catch (error) {
      console.error('Erreur lors de la récupération de la file de réservation:', error);
      throw error;
    }
  }
  
  /**
   * Vérifier si un utilisateur peut faire une réservation
   */
  static async canUserReserve(
    userId: string,
    documentId: string,
    documentType: 'book' | 'these' | 'memoire' | 'rapport_stage'
  ): Promise<{ canReserve: boolean; reason?: string; details?: any }> {
    try {
      // 1. Vérifier que l'utilisateur existe et est actif
      const userInfo = await executeQuery(`
        SELECT max_reservations, is_active
        FROM users
        WHERE id = ?
      `, [userId]) as Array<{ max_reservations: number; is_active: boolean }>;

      if (userInfo.length === 0) {
        return { canReserve: false, reason: 'USER_NOT_FOUND' };
      }

      const user = userInfo[0];
      if (!user.is_active) {
        return { canReserve: false, reason: 'USER_INACTIVE' };
      }

      // 2. Vérifier les limites de réservations de l'utilisateur
      const userReservations = await executeQuery(`
        SELECT COUNT(*) as reservation_count
        FROM reservations
        WHERE user_id = ? AND status = 'active'
      `, [userId]) as Array<{ reservation_count: number }>;

      if (userReservations[0].reservation_count >= user.max_reservations) {
        return {
          canReserve: false,
          reason: 'RESERVATION_LIMIT_EXCEEDED',
          details: {
            current_reservations: userReservations[0].reservation_count,
            max_reservations: user.max_reservations
          }
        };
      }

      // 3. Vérifier que l'utilisateur n'a pas déjà une réservation pour ce document
      const documentField = documentType === 'book' ? 'book_id' : 'academic_document_id';
      const whereClause = documentType === 'book'
        ? `user_id = ? AND ${documentField} = ? AND status = 'active'`
        : `user_id = ? AND ${documentField} = ? AND document_type = ? AND status = 'active'`;
      const params = documentType === 'book' ? [userId, documentId] : [userId, documentId, documentType];

      const existingReservations = await executeQuery(`
        SELECT id FROM reservations
        WHERE ${whereClause}
      `, params) as Array<{ id: string }>;

      if (existingReservations.length > 0) {
        return {
          canReserve: false,
          reason: 'RESERVATION_ALREADY_EXISTS',
          details: {
            existing_reservation_id: existingReservations[0].id,
            message: 'Une réservation active existe déjà pour ce document'
          }
        };
      }

      // 4. 🚨 NOUVELLE VÉRIFICATION CRITIQUE : Vérifier que l'utilisateur n'a pas déjà emprunté ce document
      const loanWhereClause = documentType === 'book'
        ? `user_id = ? AND ${documentField} = ? AND status IN ('active', 'overdue')`
        : `user_id = ? AND ${documentField} = ? AND document_type = ? AND status IN ('active', 'overdue')`;
      const loanParams = documentType === 'book' ? [userId, documentId] : [userId, documentId, documentType];

      const existingLoans = await executeQuery(`
        SELECT id, loan_date, due_date, status FROM loans
        WHERE ${loanWhereClause}
      `, loanParams) as Array<{ id: string; loan_date: string; due_date: string; status: string }>;

      if (existingLoans.length > 0) {
        const loan = existingLoans[0];
        return {
          canReserve: false,
          reason: 'DOCUMENT_ALREADY_BORROWED',
          details: {
            existing_loan_id: loan.id,
            loan_date: loan.loan_date,
            due_date: loan.due_date,
            loan_status: loan.status,
            message: 'Vous avez déjà emprunté ce document. Vous ne pouvez pas le réserver en même temps.'
          }
        };
      }

      // 5. Vérifier que le document existe
      const availability = await this.getDocumentAvailability(documentId, documentType);
      if (!availability) {
        return { canReserve: false, reason: 'DOCUMENT_NOT_FOUND' };
      }

      // 6. 🚨 LOGIQUE MÉTIER CRITIQUE CORRIGÉE : Vérifier que le document est indisponible
      // Pour TOUS les types de documents (livres ET académiques)
      if (availability.is_available && availability.available_copies > 0) {
        console.log(`🚨 RÉSERVATION BLOQUÉE - Document disponible:`, {
          documentId,
          documentType,
          available_copies: availability.available_copies,
          is_available: availability.is_available,
          message: 'Document disponible pour emprunt immédiat'
        });

        return {
          canReserve: false,
          reason: 'DOCUMENT_AVAILABLE_FOR_LOAN',
          details: {
            available_copies: availability.available_copies,
            total_copies: availability.total_copies,
            active_loans: availability.active_loans,
            active_reservations: availability.active_reservations,
            message: 'Ce document est disponible pour emprunt immédiat. Veuillez emprunter directement plutôt que de réserver.'
          }
        };
      }

      return { canReserve: true };

    } catch (error) {
      console.error('Erreur lors de la vérification de réservation:', error);
      return { canReserve: false, reason: 'SYSTEM_ERROR' };
    }
  }

  /**
   * Vérifier si un utilisateur peut emprunter un document
   */
  static async canUserBorrow(
    userId: string,
    documentId: string,
    documentType: 'book' | 'these' | 'memoire' | 'rapport_stage'
  ): Promise<{ canBorrow: boolean; reason?: string; details?: any }> {
    try {
      // 1. Vérifier la disponibilité du document
      const availability = await this.getDocumentAvailability(documentId, documentType);
      if (!availability) {
        return { canBorrow: false, reason: 'DOCUMENT_NOT_FOUND' };
      }
      
      if (!availability.is_available) {
        return { 
          canBorrow: false, 
          reason: 'DOCUMENT_UNAVAILABLE',
          details: {
            active_loans: availability.active_loans,
            active_reservations: availability.active_reservations,
            next_available_date: availability.next_available_date
          }
        };
      }
      
      // 2. Vérifier les réservations prioritaires
      const reservationQueue = await this.getReservationQueue(documentId, documentType);
      if (reservationQueue.length > 0) {
        const firstReservation = reservationQueue[0];
        if (firstReservation.user_id !== userId) {
          return { 
            canBorrow: false, 
            reason: 'RESERVATION_PRIORITY',
            details: {
              queue_position: reservationQueue.findIndex(r => r.user_id === userId) + 1,
              first_in_queue: firstReservation.user_name
            }
          };
        }
      }
      
      // 3. Vérifier les limites de l'utilisateur
      const userLoans = await executeQuery(`
        SELECT COUNT(*) as loan_count
        FROM loans l
        INNER JOIN users u ON l.user_id = u.id
        WHERE l.user_id = ? AND l.status IN ('active', 'overdue')
      `, [userId]) as Array<{ loan_count: number }>;
      
      const userInfo = await executeQuery(`
        SELECT max_loans, is_active
        FROM users 
        WHERE id = ?
      `, [userId]) as Array<{ max_loans: number; is_active: boolean }>;
      
      if (userInfo.length === 0) {
        return { canBorrow: false, reason: 'USER_NOT_FOUND' };
      }
      
      const user = userInfo[0];
      if (!user.is_active) {
        return { canBorrow: false, reason: 'USER_INACTIVE' };
      }
      
      if (userLoans[0].loan_count >= user.max_loans) {
        return { 
          canBorrow: false, 
          reason: 'LOAN_LIMIT_EXCEEDED',
          details: {
            current_loans: userLoans[0].loan_count,
            max_loans: user.max_loans
          }
        };
      }
      
      return { canBorrow: true };
      
    } catch (error) {
      console.error('Erreur lors de la vérification d\'emprunt:', error);
      return { canBorrow: false, reason: 'SYSTEM_ERROR' };
    }
  }
}
