import { executeQuery } from '@/lib/mysql';
import { XCircle } from "lucide-react";

export interface ConsistencyReport {
  timestamp: string;
  total_checks: number;
  issues_found: number;
  issues_fixed: number;
  details: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  type: 'NEGATIVE_AVAILABLE_COPIES' | 'EXCEEDS_TOTAL_COPIES' | 'ORPHANED_LOAN' | 'ORPHANED_RESERVATION' | 'EXPIRED_RESERVATION' | 'INVALID_PRIORITY_ORDER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affected_id: string;
  current_value?: any;
  expected_value?: any;
  fixed: boolean;
  fix_action?: string;
}

/**
 * Service pour vérifier et corriger la cohérence des données
 */
export class DataConsistencyService {
  
  /**
   * Exécuter une vérification complète de cohérence
   */
  static async runFullConsistencyCheck(autoFix: boolean = false): Promise<ConsistencyReport> {
    const startTime = new Date();
    const issues: ConsistencyIssue[] = [];
    
    console.log('[Search] Début de la vérification de cohérence des données...');
    
    try {
      // 1. Vérifier les exemplaires disponibles des livres
      const bookIssues = await this.checkBookCopiesConsistency(autoFix);
      issues.push(...bookIssues);
      
      // 2. Vérifier les emprunts orphelins
      const loanIssues = await this.checkOrphanedLoans(autoFix);
      issues.push(...loanIssues);
      
      // 3. Vérifier les réservations orphelines
      const reservationIssues = await this.checkOrphanedReservations(autoFix);
      issues.push(...reservationIssues);
      
      // 4. Vérifier les réservations expirées
      const expiredIssues = await this.checkExpiredReservations(autoFix);
      issues.push(...expiredIssues);
      
      // 5. Vérifier l'ordre des priorités
      const priorityIssues = await this.checkReservationPriorities(autoFix);
      issues.push(...priorityIssues);
      
      const report: ConsistencyReport = {
        timestamp: startTime.toISOString(),
        total_checks: 5,
        issues_found: issues.length,
        issues_fixed: issues.filter(i => i.fixed).length,
        details: issues
      };
      
      console.log(`[CheckCircle] Vérification terminée: ${issues.length} problèmes trouvés, ${report.issues_fixed} corrigés`);
      
      return report;
      
    } catch (error) {
      console.error('[XCircle] Erreur lors de la vérification de cohérence:', error);
      throw error;
    }
  }
  
  /**
   * Vérifier la cohérence des exemplaires de livres
   */
  static async checkBookCopiesConsistency(autoFix: boolean): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Récupérer tous les livres avec leurs emprunts et réservations actifs
      const books = await executeQuery(`
        SELECT 
          b.id,
          b.title,
          b.total_copies,
          b.available_copies as stored_available,
          COALESCE(loans.active_count, 0) as active_loans,
          COALESCE(reservations.active_count, 0) as active_reservations,
          GREATEST(0, b.total_copies - COALESCE(loans.active_count, 0) - COALESCE(reservations.active_count, 0)) as calculated_available
        FROM books b
        LEFT JOIN (
          SELECT book_id, COUNT(*) as active_count
          FROM loans 
          WHERE status IN ('active', 'overdue')
          GROUP BY book_id
        ) loans ON b.id = loans.book_id
        LEFT JOIN (
          SELECT book_id, COUNT(*) as active_count
          FROM reservations 
          WHERE status = 'active'
          GROUP BY book_id
        ) reservations ON b.id = reservations.book_id
      `) as Array<{
        id: string;
        title: string;
        total_copies: number;
        stored_available: number;
        active_loans: number;
        active_reservations: number;
        calculated_available: number;
      }>;
      
      for (const book of books) {
        // Vérifier les exemplaires disponibles négatifs
        if (book.stored_available < 0) {
          const issue: ConsistencyIssue = {
            type: 'NEGATIVE_AVAILABLE_COPIES',
            severity: 'HIGH',
            description: `Le livre "${book.title}" a ${book.stored_available} exemplaires disponibles (négatif)`,
            affected_id: book.id,
            current_value: book.stored_available,
            expected_value: book.calculated_available,
            fixed: false
          };
          
          if (autoFix) {
            await executeQuery(
              'UPDATE books SET available_copies = ? WHERE id = ?',
              [book.calculated_available, book.id]
            );
            issue.fixed = true;
            issue.fix_action = `Corrigé: ${book.stored_available} → ${book.calculated_available}`;
          }
          
          issues.push(issue);
        }
        
        // Vérifier si les exemplaires disponibles dépassent le total
        if (book.stored_available > book.total_copies) {
          const issue: ConsistencyIssue = {
            type: 'EXCEEDS_TOTAL_COPIES',
            severity: 'MEDIUM',
            description: `Le livre "${book.title}" a ${book.stored_available} exemplaires disponibles mais seulement ${book.total_copies} au total`,
            affected_id: book.id,
            current_value: book.stored_available,
            expected_value: book.calculated_available,
            fixed: false
          };
          
          if (autoFix) {
            await executeQuery(
              'UPDATE books SET available_copies = ? WHERE id = ?',
              [book.calculated_available, book.id]
            );
            issue.fixed = true;
            issue.fix_action = `Corrigé: ${book.stored_available} → ${book.calculated_available}`;
          }
          
          issues.push(issue);
        }
        
        // Vérifier l'incohérence entre stocké et calculé
        if (book.stored_available !== book.calculated_available && book.stored_available >= 0 && book.stored_available <= book.total_copies) {
          const issue: ConsistencyIssue = {
            type: 'EXCEEDS_TOTAL_COPIES',
            severity: 'MEDIUM',
            description: `Le livre "${book.title}" a une incohérence: ${book.stored_available} stocké vs ${book.calculated_available} calculé`,
            affected_id: book.id,
            current_value: book.stored_available,
            expected_value: book.calculated_available,
            fixed: false
          };
          
          if (autoFix) {
            await executeQuery(
              'UPDATE books SET available_copies = ? WHERE id = ?',
              [book.calculated_available, book.id]
            );
            issue.fixed = true;
            issue.fix_action = `Corrigé: ${book.stored_available} → ${book.calculated_available}`;
          }
          
          issues.push(issue);
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification des exemplaires:', error);
    }
    
    return issues;
  }
  
  /**
   * Vérifier les emprunts orphelins
   */
  static async checkOrphanedLoans(autoFix: boolean): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Emprunts de livres avec livre inexistant
      const orphanedBookLoans = await executeQuery(`
        SELECT l.id, l.book_id, l.user_id
        FROM loans l
        LEFT JOIN books b ON l.book_id = b.id
        WHERE l.document_type = 'book' AND l.book_id IS NOT NULL AND b.id IS NULL
      `) as Array<{ id: string; book_id: string; user_id: string }>;
      
      for (const loan of orphanedBookLoans) {
        const issue: ConsistencyIssue = {
          type: 'ORPHANED_LOAN',
          severity: 'CRITICAL',
          description: `Emprunt ${loan.id} référence un livre inexistant ${loan.book_id}`,
          affected_id: loan.id,
          fixed: false
        };
        
        if (autoFix) {
          await executeQuery('DELETE FROM loans WHERE id = ?', [loan.id]);
          issue.fixed = true;
          issue.fix_action = 'Emprunt orphelin supprimé';
        }
        
        issues.push(issue);
      }
      
      // Emprunts avec utilisateur inexistant
      const orphanedUserLoans = await executeQuery(`
        SELECT l.id, l.user_id
        FROM loans l
        LEFT JOIN users u ON l.user_id = u.id
        WHERE u.id IS NULL
      `) as Array<{ id: string; user_id: string }>;
      
      for (const loan of orphanedUserLoans) {
        const issue: ConsistencyIssue = {
          type: 'ORPHANED_LOAN',
          severity: 'CRITICAL',
          description: `Emprunt ${loan.id} référence un utilisateur inexistant ${loan.user_id}`,
          affected_id: loan.id,
          fixed: false
        };
        
        if (autoFix) {
          await executeQuery('DELETE FROM loans WHERE id = ?', [loan.id]);
          issue.fixed = true;
          issue.fix_action = 'Emprunt orphelin supprimé';
        }
        
        issues.push(issue);
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification des emprunts orphelins:', error);
    }
    
    return issues;
  }
  
  /**
   * Vérifier les réservations orphelines
   */
  static async checkOrphanedReservations(autoFix: boolean): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Réservations de livres avec livre inexistant
      const orphanedBookReservations = await executeQuery(`
        SELECT r.id, r.book_id, r.user_id
        FROM reservations r
        LEFT JOIN books b ON r.book_id = b.id
        WHERE r.document_type = 'book' AND r.book_id IS NOT NULL AND b.id IS NULL
      `) as Array<{ id: string; book_id: string; user_id: string }>;
      
      for (const reservation of orphanedBookReservations) {
        const issue: ConsistencyIssue = {
          type: 'ORPHANED_RESERVATION',
          severity: 'HIGH',
          description: `Réservation ${reservation.id} référence un livre inexistant ${reservation.book_id}`,
          affected_id: reservation.id,
          fixed: false
        };
        
        if (autoFix) {
          await executeQuery('DELETE FROM reservations WHERE id = ?', [reservation.id]);
          issue.fixed = true;
          issue.fix_action = 'Réservation orpheline supprimée';
        }
        
        issues.push(issue);
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification des réservations orphelines:', error);
    }
    
    return issues;
  }
  
  /**
   * Vérifier et nettoyer les réservations expirées
   */
  static async checkExpiredReservations(autoFix: boolean): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      const expiredReservations = await executeQuery(`
        SELECT id, user_id, expiry_date, DATEDIFF(CURDATE(), expiry_date) as days_expired
        FROM reservations 
        WHERE status = 'active' AND expiry_date < CURDATE()
      `) as Array<{ id: string; user_id: string; expiry_date: string; days_expired: number }>;
      
      for (const reservation of expiredReservations) {
        const issue: ConsistencyIssue = {
          type: 'EXPIRED_RESERVATION',
          severity: 'MEDIUM',
          description: `Réservation ${reservation.id} expirée depuis ${reservation.days_expired} jours`,
          affected_id: reservation.id,
          current_value: 'active',
          expected_value: 'expired',
          fixed: false
        };
        
        if (autoFix) {
          await executeQuery(
            'UPDATE reservations SET status = "expired" WHERE id = ?',
            [reservation.id]
          );
          issue.fixed = true;
          issue.fix_action = 'Statut changé vers "expired"';
        }
        
        issues.push(issue);
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification des réservations expirées:', error);
    }
    
    return issues;
  }
  
  /**
   * Vérifier l'ordre des priorités des réservations
   */
  static async checkReservationPriorities(autoFix: boolean): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Grouper par document et vérifier les priorités
      const reservationGroups = await executeQuery(`
        SELECT 
          COALESCE(book_id, academic_document_id) as document_id,
          document_type,
          GROUP_CONCAT(id ORDER BY priority_order) as reservation_ids,
          GROUP_CONCAT(priority_order ORDER BY priority_order) as priorities
        FROM reservations 
        WHERE status = 'active'
        GROUP BY COALESCE(book_id, academic_document_id), document_type
        HAVING COUNT(*) > 1
      `) as Array<{ 
        document_id: string; 
        document_type: string; 
        reservation_ids: string; 
        priorities: string; 
      }>;
      
      for (const group of reservationGroups) {
        const priorities = group.priorities.split(',').map(Number);
        const reservationIds = group.reservation_ids.split(',');
        
        // Vérifier si les priorités sont consécutives à partir de 1
        const expectedPriorities = Array.from({ length: priorities.length }, (_, i) => i + 1);
        const hasIssue = !priorities.every((p, i) => p === expectedPriorities[i]);
        
        if (hasIssue) {
          const issue: ConsistencyIssue = {
            type: 'INVALID_PRIORITY_ORDER',
            severity: 'MEDIUM',
            description: `Ordre de priorité incorrect pour le document ${group.document_id}: [${priorities.join(', ')}] au lieu de [${expectedPriorities.join(', ')}]`,
            affected_id: group.document_id,
            current_value: priorities,
            expected_value: expectedPriorities,
            fixed: false
          };
          
          if (autoFix) {
            // Corriger les priorités
            for (let i = 0; i < reservationIds.length; i++) {
              await executeQuery(
                'UPDATE reservations SET priority_order = ? WHERE id = ?',
                [i + 1, reservationIds[i]]
              );
            }
            issue.fixed = true;
            issue.fix_action = `Priorités corrigées: ${priorities.join(', ')} → ${expectedPriorities.join(', ')}`;
          }
          
          issues.push(issue);
        }
      }
      
    } catch (error) {
      console.error('Erreur lors de la vérification des priorités:', error);
    }
    
    return issues;
  }
}
