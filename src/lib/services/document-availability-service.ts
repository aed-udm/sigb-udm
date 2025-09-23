/**
 * Service de disponibilité des documents - Extension pour documents académiques
 * SIGB UdM - Gestion unifiée de la disponibilité
 */

import { executeQuery } from '@/lib/mysql';

export interface DocumentAvailability {
  document_id: string;
  document_type: string;
  title: string;
  author?: string;
  total_copies: number;
  available_copies: number;
  reserved_copies: number;
  loaned_copies: number;
  status: 'available' | 'borrowed' | 'reserved' | 'unavailable';
  queue_length: number;
  estimated_wait_time: number;
  next_available_date?: string;
}

export interface ReservationCheck {
  canReserve: boolean;
  reason: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
}

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
              id, title, main_author as author, 
              total_copies, available_copies, 
              loaned_copies, reserved_copies,
              CASE 
                WHEN available_copies > 0 THEN 'available'
                WHEN loaned_copies > 0 THEN 'borrowed'
                WHEN reserved_copies > 0 THEN 'reserved'
                ELSE 'unavailable'
              END as status
            FROM books WHERE id = ?
          `;
          break;
        case 'these':
          tableName = 'theses';
          query = `
            SELECT 
              id, title, main_author as author,
              COALESCE(total_copies, 1) as total_copies,
              COALESCE(available_copies, 1) as available_copies,
              COALESCE(loaned_copies, 0) as loaned_copies,
              COALESCE(reserved_copies, 0) as reserved_copies,
              CASE 
                WHEN COALESCE(available_copies, 1) > 0 THEN 'available'
                WHEN COALESCE(loaned_copies, 0) > 0 THEN 'borrowed'
                WHEN COALESCE(reserved_copies, 0) > 0 THEN 'reserved'
                ELSE 'unavailable'
              END as status
            FROM theses WHERE id = ?
          `;
          break;
        case 'memoire':
          tableName = 'memoires';
          query = `
            SELECT 
              id, title, main_author as author,
              COALESCE(total_copies, 1) as total_copies,
              COALESCE(available_copies, 1) as available_copies,
              COALESCE(loaned_copies, 0) as loaned_copies,
              COALESCE(reserved_copies, 0) as reserved_copies,
              CASE 
                WHEN COALESCE(available_copies, 1) > 0 THEN 'available'
                WHEN COALESCE(loaned_copies, 0) > 0 THEN 'borrowed'
                WHEN COALESCE(reserved_copies, 0) > 0 THEN 'reserved'
                ELSE 'unavailable'
              END as status
            FROM memoires WHERE id = ?
          `;
          break;
        case 'rapport_stage':
          tableName = 'stage_reports';
          query = `
            SELECT 
              id, title, student_name as author,
              COALESCE(total_copies, 1) as total_copies,
              COALESCE(available_copies, 1) as available_copies,
              COALESCE(loaned_copies, 0) as loaned_copies,
              COALESCE(reserved_copies, 0) as reserved_copies,
              CASE 
                WHEN COALESCE(available_copies, 1) > 0 THEN 'available'
                WHEN COALESCE(loaned_copies, 0) > 0 THEN 'borrowed'
                WHEN COALESCE(reserved_copies, 0) > 0 THEN 'reserved'
                ELSE 'unavailable'
              END as status
            FROM stage_reports WHERE id = ?
          `;
          break;
        default:
          return null;
      }

      const documents = await executeQuery(query, [documentId]) as any[];
      if (documents.length === 0) {
        return null;
      }

      const doc = documents[0];

      // Obtenir la file d'attente
      const queueQuery = `
        SELECT id, priority_order, user_id, reservation_date 
        FROM reservations 
        WHERE ${documentType === 'book' ? 'book_id' : 'academic_document_id'} = ? 
        AND status = 'active'
        ORDER BY priority_order ASC
      `;
      const queue = await executeQuery(queueQuery, [documentId]) as any[];

      // Calculer le temps d'attente estimé
      let estimatedWaitTime = 0;
      let nextAvailableDate: string | undefined;

      if (doc.available_copies === 0 && queue.length > 0) {
        // Estimer basé sur la durée moyenne des emprunts (14 jours par défaut)
        const avgLoanDuration = 14;
        estimatedWaitTime = queue.length * avgLoanDuration;

        // Obtenir la prochaine date de retour prévue
        const nextDueDateQuery = `
          SELECT MIN(due_date) as next_due_date 
          FROM loans 
          WHERE ${documentType === 'book' ? 'book_id' : 'academic_document_id'} = ? 
          AND status = 'active'
        `;
        const dueDates = await executeQuery(nextDueDateQuery, [documentId]) as any[];
        if (dueDates.length > 0 && dueDates[0].next_due_date) {
          nextAvailableDate = dueDates[0].next_due_date;
        }
      }

      return {
        document_id: documentId,
        document_type: documentType,
        title: doc.title,
        author: doc.author,
        total_copies: Number(doc.total_copies) || 1,
        available_copies: Number(doc.available_copies) || 0,
        reserved_copies: Number(doc.reserved_copies) || 0,
        loaned_copies: Number(doc.loaned_copies) || 0,
        status: doc.status,
        queue_length: queue.length,
        estimated_wait_time: estimatedWaitTime,
        next_available_date: nextAvailableDate
      };

    } catch (error) {
      console.error('Erreur lors de la vérification de disponibilité:', error);
      return null;
    }
  }

  /**
   * Vérifier si un document peut être réservé par un utilisateur
   */
  static async canDocumentBeReserved(
    documentId: string, 
    userId: string, 
    documentType: 'book' | 'these' | 'memoire' | 'rapport_stage'
  ): Promise<ReservationCheck> {
    try {
      // Vérifier la disponibilité du document
      const availability = await this.getDocumentAvailability(documentId, documentType);
      
      if (!availability) {
        return {
          canReserve: false,
          reason: 'Document non trouvé'
        };
      }

      // Vérifier si l'utilisateur a déjà une réservation pour ce document
      const existingReservationQuery = `
        SELECT id FROM reservations 
        WHERE user_id = ? 
        AND ${documentType === 'book' ? 'book_id' : 'academic_document_id'} = ? 
        AND status = 'active'
      `;
      const existingReservations = await executeQuery(existingReservationQuery, [userId, documentId]) as any[];
      
      if (existingReservations.length > 0) {
        return {
          canReserve: false,
          reason: 'Utilisateur a déjà une réservation pour ce document'
        };
      }

      // Vérifier les limites de réservation de l'utilisateur
      const userReservationsQuery = `
        SELECT COUNT(*) as count FROM reservations 
        WHERE user_id = ? AND status = 'active'
      `;
      const userReservations = await executeQuery(userReservationsQuery, [userId]) as any[];
      const currentReservations = userReservations[0]?.count || 0;

      // Limite par défaut de 5 réservations
      const maxReservations = 5;
      if (currentReservations >= maxReservations) {
        return {
          canReserve: false,
          reason: 'Limite de réservations atteinte'
        };
      }

      // Vérifier l'accessibilité du document pour les documents académiques
      if (documentType !== 'book') {
        const accessibilityQuery = `
          SELECT is_accessible FROM ${documentType === 'these' ? 'theses' : 
                                     documentType === 'memoire' ? 'memoires' : 'stage_reports'} 
          WHERE id = ?
        `;
        const accessibilityResult = await executeQuery(accessibilityQuery, [documentId]) as any[];
        
        if (accessibilityResult.length > 0 && !accessibilityResult[0].is_accessible) {
          return {
            canReserve: false,
            reason: 'Document non accessible pour emprunt'
          };
        }
      }

      // Document disponible immédiatement
      if (availability.available_copies > 0) {
        return {
          canReserve: true,
          reason: 'Document disponible',
          queuePosition: 0
        };
      }

      // Document non disponible mais peut être mis en file d'attente
      return {
        canReserve: true,
        reason: 'Ajouté à la file d\'attente',
        queuePosition: availability.queue_length + 1,
        estimatedWaitTime: availability.estimated_wait_time
      };

    } catch (error) {
      console.error('Erreur lors de la vérification de réservation:', error);
      return {
        canReserve: false,
        reason: 'Erreur lors de la vérification'
      };
    }
  }

  /**
   * Obtenir la disponibilité de plusieurs documents
   */
  static async getMultipleDocumentsAvailability(
    documents: Array<{ id: string, type: 'book' | 'these' | 'memoire' | 'rapport_stage' }>
  ): Promise<DocumentAvailability[]> {
    const availabilities: DocumentAvailability[] = [];

    for (const doc of documents) {
      const availability = await this.getDocumentAvailability(doc.id, doc.type);
      if (availability) {
        availabilities.push(availability);
      }
    }

    return availabilities;
  }

  /**
   * Obtenir des statistiques de disponibilité
   */
  static async getDocumentStatistics(): Promise<any> {
    try {
      const statsQuery = `
        SELECT 
          'book' as document_type,
          COUNT(*) as total_documents,
          SUM(available_copies) as available_documents,
          SUM(reserved_copies) as reserved_documents,
          SUM(loaned_copies) as borrowed_documents
        FROM books
        WHERE is_active = 1
        
        UNION ALL
        
        SELECT 
          'these' as document_type,
          COUNT(*) as total_documents,
          SUM(COALESCE(available_copies, 1)) as available_documents,
          SUM(COALESCE(reserved_copies, 0)) as reserved_documents,
          SUM(COALESCE(loaned_copies, 0)) as borrowed_documents
        FROM theses
        WHERE is_accessible = 1
        
        UNION ALL
        
        SELECT 
          'memoire' as document_type,
          COUNT(*) as total_documents,
          SUM(COALESCE(available_copies, 1)) as available_documents,
          SUM(COALESCE(reserved_copies, 0)) as reserved_documents,
          SUM(COALESCE(loaned_copies, 0)) as borrowed_documents
        FROM memoires
        WHERE is_accessible = 1
        
        UNION ALL
        
        SELECT 
          'rapport_stage' as document_type,
          COUNT(*) as total_documents,
          SUM(COALESCE(available_copies, 1)) as available_documents,
          SUM(COALESCE(reserved_copies, 0)) as reserved_documents,
          SUM(COALESCE(loaned_copies, 0)) as borrowed_documents
        FROM stage_reports
        WHERE is_accessible = 1
      `;

      const stats = await executeQuery(statsQuery) as any[];
      
      const result: any = {
        books: {},
        academic_documents: {
          theses: {},
          memoires: {},
          stage_reports: {}
        }
      };

      stats.forEach(stat => {
        const data = {
          total: Number(stat.total_documents),
          available: Number(stat.available_documents),
          reserved: Number(stat.reserved_documents),
          borrowed: Number(stat.borrowed_documents),
          availability_ratio: Number(stat.available_documents) / Number(stat.total_documents),
          utilization_ratio: (Number(stat.reserved_documents) + Number(stat.borrowed_documents)) / Number(stat.total_documents)
        };

        if (stat.document_type === 'book') {
          result.books = data;
        } else if (stat.document_type === 'these') {
          result.academic_documents.theses = data;
        } else if (stat.document_type === 'memoire') {
          result.academic_documents.memoires = data;
        } else if (stat.document_type === 'rapport_stage') {
          result.academic_documents.stage_reports = data;
        }
      });

      return result;

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      return {};
    }
  }
}