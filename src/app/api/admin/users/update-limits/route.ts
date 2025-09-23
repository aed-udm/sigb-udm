/**
 * API Route: /api/admin/users/update-limits
 * Met à jour les limites d'emprunts et de réservations pour tous les utilisateurs existants
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Body reçu:', body);
    
    const { max_loans_per_user, max_reservations_per_user } = body;
    console.log('Valeurs extraites:', { max_loans_per_user, max_reservations_per_user });

    // Validation des paramètres - convertir en nombre si c'est une chaîne
    const maxLoans = typeof max_loans_per_user === 'string' ? parseInt(max_loans_per_user, 10) : max_loans_per_user;
    const maxReservations = typeof max_reservations_per_user === 'string' ? parseInt(max_reservations_per_user, 10) : max_reservations_per_user;

    if (typeof maxLoans !== 'number' || typeof maxReservations !== 'number' || isNaN(maxLoans) || isNaN(maxReservations)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: 'Les limites doivent être des nombres valides'
        }
      }, { status: 400 });
    }

    if (maxLoans < 1 || maxReservations < 1) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_LIMITS',
          message: 'Les limites doivent être supérieures à 0'
        }
      }, { status: 400 });
    }

    // Mettre à jour tous les utilisateurs actifs avec les nouvelles limites
    const updateQuery = `
      UPDATE users 
      SET 
        max_loans = ?,
        max_reservations = ?,
        updated_at = NOW()
      WHERE is_active = 1
    `;

    const result = await executeQuery(updateQuery, [maxLoans, maxReservations]) as any;

    // Compter le nombre d'utilisateurs mis à jour
    const countQuery = `
      SELECT COUNT(*) as total_updated 
      FROM users 
      WHERE is_active = 1 
        AND max_loans = ? 
        AND max_reservations = ?
    `;

    const [countResult] = await executeQuery(countQuery, [maxLoans, maxReservations]) as any[];

    return NextResponse.json({
      success: true,
      data: {
        updated_count: countResult.total_updated,
        max_loans_per_user: maxLoans,
        max_reservations_per_user: maxReservations
      },
      message: `${countResult.total_updated} utilisateurs mis à jour avec succès`
    });

  } catch (error) {
    console.error('Erreur API /api/admin/users/update-limits:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_LIMITS_ERROR',
        message: 'Erreur lors de la mise à jour des limites utilisateurs',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }
    }, { status: 500 });
  }
}
