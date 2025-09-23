/**
 * API de disponibilité des documents - SIGB UdM
 * Endpoint: /api/documents/availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { DocumentAvailabilityService } from '@/lib/document-availability';

// GET /api/documents/availability - Vérifier la disponibilité d'un document
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const document_id = searchParams.get('document_id');
    const document_type = searchParams.get('document_type') as 'book' | 'these' | 'memoire' | 'rapport_stage';

    if (!document_id) {
      return NextResponse.json(
        { error: 'ID du document requis' },
        { status: 400 }
      );
    }

    if (!document_type) {
      return NextResponse.json(
        { error: 'Type de document requis' },
        { status: 400 }
      );
    }

    const availability = await DocumentAvailabilityService.getDocumentAvailability(
      document_id,
      document_type
    );

    if (!availability) {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: availability
    });

  } catch (error) {
    console.error('Erreur lors de la vérification de disponibilité:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la vérification de disponibilité',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
