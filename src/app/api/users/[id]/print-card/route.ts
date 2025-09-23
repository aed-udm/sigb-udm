import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/users/[id]/print-card - Générer les données pour l'impression de carte
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Récupérer les informations complètes de l'utilisateur
    const users = await executeQuery(
      `SELECT 
        id, email, full_name, barcode, matricule, phone, address, 
        is_active, max_loans, created_at, updated_at,
        profile_photo_path, photo_file_type
       FROM users WHERE id = ?`,
      [userId]
    ) as Array<{
      id: string;
      email: string;
      full_name: string;
      barcode: string;
      matricule: string | null;
      phone: string | null;
      address: string | null;
      is_active: boolean;
      max_loans: number;
      created_at: string;
      updated_at: string;
      profile_photo_path: string | null;
      photo_file_type: string | null;
    }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = users[0];

    // Vérifier que l'utilisateur est actif
    if (!user.is_active) {
      return NextResponse.json(
        { error: { code: 'USER_INACTIVE', message: 'Impossible d\'imprimer une carte pour un utilisateur inactif' } },
        { status: 400 }
      );
    }

    // Récupérer les statistiques d'emprunt de l'utilisateur
    const loanStats = await executeQuery(
      `SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_loans,
        COUNT(CASE WHEN status = 'returned' THEN 1 END) as returned_loans
       FROM loans WHERE user_id = ?`,
      [userId]
    ) as Array<{
      total_loans: number;
      active_loans: number;
      overdue_loans: number;
      returned_loans: number;
    }>;

    // Récupérer les amendes impayées
    const penalties = await executeQuery(
      `SELECT
        COUNT(*) as total_penalties,
        COALESCE(SUM(amount_fcfa), 0) as total_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as unpaid_penalties,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_fcfa ELSE 0 END), 0) as unpaid_amount
       FROM penalties WHERE user_id = ?`,
      [userId]
    ) as Array<{
      total_penalties: number;
      total_amount: number;
      unpaid_penalties: number;
      unpaid_amount: number;
    }>;

    const stats = loanStats[0] || { total_loans: 0, active_loans: 0, overdue_loans: 0, returned_loans: 0 };
    const penaltyStats = penalties[0] || { total_penalties: 0, total_amount: 0, unpaid_penalties: 0, unpaid_amount: 0 };

    // Récupérer les paramètres de pénalité pour tous les types de documents
    const penaltySettings = await executeQuery(`
      SELECT document_type, daily_rate, max_penalty, grace_period_days
      FROM penalty_settings
      WHERE is_active = 1
      ORDER BY document_type
    `) as any[];

    // Créer les règles dynamiques basées sur les paramètres de pénalité
    const createPenaltyRules = () => {
      if (penaltySettings.length === 0) {
        return ['Amendes selon le type de document (voir règlement)'];
      }

      const rules: string[] = [];
      const documentLabels: Record<string, string> = {
        'book': 'Livres',
        'these': 'Thèses',
        'memoire': 'Mémoires',
        'rapport_stage': 'Rapports de stage'
      };

      penaltySettings.forEach((setting: any) => {
        const label = documentLabels[setting.document_type] || setting.document_type;
        let rule = `${label} : ${setting.daily_rate} FCFA/jour`;

        if (setting.grace_period_days > 0) {
          rule += ` (après ${setting.grace_period_days} jour${setting.grace_period_days > 1 ? 's' : ''} de grâce)`;
        }

        if (setting.max_penalty > 0) {
          rule += `, max ${setting.max_penalty} FCFA`;
        }

        rules.push(rule);
      });

      return rules;
    };

    // Générer les données de la carte
    const cardData = {
      // Informations utilisateur
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        barcode: user.barcode,
        matricule: user.matricule,
        phone: user.phone,
        address: user.address,
        max_loans: user.max_loans,
        member_since: new Date(user.created_at).toLocaleDateString('fr-FR'),
        profile_photo_path: user.profile_photo_path,
        photo_file_type: user.photo_file_type
      },
      
      // Statistiques
      statistics: {
        loans: stats,
        penalties: penaltyStats
      },
      
      // Informations de la carte
      card: {
        issue_date: new Date().toLocaleDateString('fr-FR'),
        issue_time: new Date().toLocaleTimeString('fr-FR'),
        valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'), // Valide 1 an
        library_name: 'Bibliothèque Université des Montagnes',
        library_address: 'Bangangté, Cameroun',
        library_phone: '+237 233 36 15 15',
        library_email: 'bibliotheque@univ-montagnes.cm'
      },
      
      // Règles et conditions
      rules: [
        'Présenter cette carte à chaque emprunt',
        `Maximum ${user.max_loans} documents simultanément`,
        'Durée d\'emprunt : 21 jours (renouvelable)',
        ...createPenaltyRules(),
        'Signaler immédiatement toute perte ou vol',
        'Carte non transférable'
      ],
      
      // QR Code data pour la carte
      qr_code_data: JSON.stringify({
        user_id: user.id,
        barcode: user.barcode,
        full_name: user.full_name,
        matricule: user.matricule,
        issue_date: new Date().toISOString(),
        library: 'UdM'
      }),
      
      // Statut de l'utilisateur
      status: {
        can_borrow: stats.active_loans < user.max_loans && penaltyStats.unpaid_amount === 0,
        blocking_reason: stats.active_loans >= user.max_loans 
          ? 'Limite d\'emprunts atteinte' 
          : penaltyStats.unpaid_amount > 0 
            ? `Amendes impayées: ${penaltyStats.unpaid_amount} FCFA`
            : null
      }
    };

    // Enregistrer l'activité d'impression
    await executeQuery(
      `INSERT INTO recent_activities (activity_type, description, created_at)
       VALUES ('card_print', ?, NOW())`,
      [
        `Impression de carte pour ${user.full_name} (${user.barcode}) - ID: ${userId}`
      ]
    );

    return NextResponse.json({
      data: cardData,
      message: 'Données de carte générées avec succès'
    });

  } catch (error) {
    console.error('Error generating card data:', error);
    return NextResponse.json(
      { error: { code: 'CARD_GENERATION_ERROR', message: 'Erreur lors de la génération des données de carte' } },
      { status: 500 }
    );
  }
}

// POST /api/users/[id]/print-card - Marquer une carte comme imprimée
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { printer_name, copies = 1 } = body;

    // Vérifier que l'utilisateur existe
    const users = await executeQuery(
      'SELECT id, full_name, barcode FROM users WHERE id = ?',
      [userId]
    ) as Array<{ id: string; full_name: string; barcode: string }>;

    if (users.length === 0) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouvé' } },
        { status: 404 }
      );
    }

    const user = users[0];

    // Enregistrer l'impression dans les activités
    await executeQuery(
      `INSERT INTO recent_activities (activity_type, description, created_at)
       VALUES ('card_printed', ?, NOW())`,
      [
        `Carte imprimée pour ${user.full_name} (${user.barcode}) - ${copies} copie(s)${printer_name ? ` sur ${printer_name}` : ''} - ID: ${userId}`
      ]
    );

    return NextResponse.json({
      message: 'Impression de carte enregistrée avec succès',
      data: {
        user_id: userId,
        user_name: user.full_name,
        barcode: user.barcode,
        copies: copies,
        printer_name: printer_name,
        printed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error recording card print:', error);
    return NextResponse.json(
      { error: { code: 'PRINT_RECORD_ERROR', message: 'Erreur lors de l\'enregistrement de l\'impression' } },
      { status: 500 }
    );
  }
}
