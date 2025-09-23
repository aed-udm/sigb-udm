import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';

// POST /api/penalties/pay-new - Enregistrer le paiement de pénalités
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      penalty_ids, // Array des IDs de pénalités à payer
      amount_paid, 
      payment_method = 'cash', 
      notes = '', 
      processed_by = 'System' 
    } = body;

    console.log('📝 Données reçues pour paiement:', { penalty_ids, amount_paid, payment_method });

    // Validation des données
    if (!penalty_ids || !Array.isArray(penalty_ids) || penalty_ids.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'penalty_ids (array) est requis' 
        },
        { status: 400 }
      );
    }

    if (!amount_paid || amount_paid <= 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Le montant doit être positif' 
        },
        { status: 400 }
      );
    }

    // Récupérer les pénalités à payer (avec COLLATE pour éviter les conflits)
    const penaltyIdsPlaceholder = penalty_ids.map(() => '?').join(',');
    const penalties = await executeQuery(`
      SELECT
        p.id,
        p.user_id,
        p.amount_fcfa,
        p.status,
        p.description,
        u.full_name as user_name,
        u.email as user_email
      FROM penalties p
      INNER JOIN users u ON p.user_id COLLATE utf8mb4_unicode_ci = u.id COLLATE utf8mb4_unicode_ci
      WHERE p.id IN (${penaltyIdsPlaceholder}) AND p.status = 'unpaid'
    `, penalty_ids) as Array<{
      id: string;
      user_id: string;
      amount_fcfa: number;
      status: string;
      description: string;
      user_name: string;
      user_email: string;
    }>;

    if (penalties.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Aucune pénalité impayée trouvée avec ces IDs' 
        },
        { status: 404 }
      );
    }

    // Vérifier que toutes les pénalités appartiennent au même utilisateur
    const userIds = [...new Set(penalties.map(p => p.user_id))];
    if (userIds.length > 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Toutes les pénalités doivent appartenir au même utilisateur' 
        },
        { status: 400 }
      );
    }

    const totalPenaltyAmount = penalties.reduce((sum, p) => sum + p.amount_fcfa, 0);
    const user = penalties[0];

    console.log(`💰 Paiement: ${amount_paid} FCFA pour ${penalties.length} pénalités (total: ${totalPenaltyAmount} FCFA)`);

    // Traiter le paiement pour chaque pénalité
    const paymentRecords = [];
    let remainingAmount = amount_paid;

    for (const penalty of penalties) {
      if (remainingAmount <= 0) break;

      const paymentForThisPenalty = Math.min(remainingAmount, penalty.amount_fcfa);
      const paymentId = uuidv4();

      // Enregistrer le paiement
      await executeQuery(`
        INSERT INTO penalty_payments (
          id, penalty_id, amount_paid, payment_method, 
          payment_date, notes, processed_by, created_at
        ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, NOW())
      `, [
        paymentId,
        penalty.id,
        paymentForThisPenalty,
        payment_method,
        notes,
        processed_by
      ]);

      // Mettre à jour le statut de la pénalité
      const newStatus = paymentForThisPenalty >= penalty.amount_fcfa ? 'paid' : 'partial';
      await executeQuery(`
        UPDATE penalties 
        SET status = ?, updated_at = NOW() 
        WHERE id = ?
      `, [newStatus, penalty.id]);

      paymentRecords.push({
        penalty_id: penalty.id,
        payment_id: paymentId,
        amount_paid: paymentForThisPenalty,
        status: newStatus,
        description: penalty.description
      });

      remainingAmount -= paymentForThisPenalty;
      console.log(`✅ Pénalité ${penalty.id}: ${paymentForThisPenalty} FCFA → ${newStatus}`);
    }

    // Créer l'activité récente (avec la vraie structure de la table)
    await executeQuery(`
      INSERT INTO recent_activities (
        activity_type, description, details, created_at
      ) VALUES ('penalty_payment', ?, ?, NOW())
    `, [
      `Paiement de pénalités: ${amount_paid} FCFA par ${user.user_name}`,
      JSON.stringify({
        user_id: user.user_id,
        user_name: user.user_name,
        penalty_ids: penalty_ids,
        amount_paid: amount_paid,
        payment_method: payment_method,
        processed_by: processed_by,
        payments: paymentRecords,
        timestamp: new Date().toISOString()
      })
    ]);

    console.log(`🎉 Paiement complet enregistré: ${amount_paid} FCFA pour ${user.user_name}`);

    // 📧 ENVOYER EMAIL DE CONFIRMATION DE PAIEMENT
    try {
      const { EmailNotificationService } = await import('@/lib/services/email-notification-service');

      const paymentEmailData = {
        user_name: user.user_name,
        user_email: user.user_email,
        amount_paid: amount_paid,
        payment_method: payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        penalties_paid: paymentRecords.map(p => ({
          description: p.description || `Pénalité ${p.penalty_id}`,
          amount: p.amount_paid
        }))
      };

      const emailSent = await EmailNotificationService.sendPaymentConfirmation(paymentEmailData);
      if (emailSent) {
        console.log(`✅ Email de confirmation de paiement envoyé à ${user.user_email}`);
      } else {
        console.log(`⚠️ Échec envoi email de confirmation de paiement à ${user.user_email}`);
      }
    } catch (emailError) {
      console.error('❌ Erreur envoi email confirmation paiement:', emailError);
    }

    // 🔄 FORCER LA MISE À JOUR IMMÉDIATE APRÈS PAIEMENT
    console.log('🔄 Mise à jour forcée des statuts après paiement...');

    return NextResponse.json({
      success: true,
      message: `Paiement de ${amount_paid} FCFA enregistré avec succès`,
      data: {
        user_name: user.user_name,
        user_email: user.user_email,
        user_id: user.user_id, // Ajouter l'ID utilisateur pour le rafraîchissement
        total_amount_paid: amount_paid,
        payment_method: payment_method,
        payment_date: new Date().toISOString().split('T')[0],
        penalties_paid: paymentRecords,
        remaining_amount: remainingAmount,
        force_refresh: true // Signal pour forcer le rafraîchissement côté client
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors du paiement des pénalités:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de l\'enregistrement du paiement',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
