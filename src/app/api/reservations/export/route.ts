/**
 * API d'export pour réservations - SIGB UdM
 * Formats supportés : PDF, JSON, XML
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/reservations/export - Exporter des réservations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Construire la requête
    let query = `
      SELECT 
        r.id, r.user_id, r.book_id, r.reservation_date, r.expiry_date, 
        r.status, r.created_at, r.updated_at,
        u.full_name as user_name, u.email as user_email, u.matricule as student_id,
        b.title as book_title, b.main_author as book_author, b.barcode as book_barcode
      FROM reservations r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN books b ON r.book_id = b.id
      WHERE 1=1
    `;
    
    let params: any[] = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR b.title LIKE ? OR u.matricule LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY r.created_at DESC LIMIT ?`;
    params.push(limit);

    const reservations = await executeQuery(query, params) as any[];

    // Traitement selon le format demandé
    switch (format) {
      case 'pdf':
        return handlePDFExport(reservations);
      case 'xml':
        return handleXMLExport(reservations);
      default:
        return NextResponse.json({
          data: reservations,
          total: reservations.length,
          format: 'json'
        });
    }

  } catch (error) {
    console.error('Erreur lors de l\'export des réservations:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'EXPORT_ERROR', 
          message: 'Erreur lors de l\'export des réservations' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Export HTML pour conversion PDF
 */
function handlePDFExport(reservations: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Export Réservations - SIGB UdM</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #ffffff; color: #374151; }
        h1 { color: #22c55e; border-bottom: 3px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
        .reservation { margin-bottom: 30px; page-break-inside: avoid; border-left: 4px solid #22c55e; padding-left: 15px; background-color: #f9fafb; padding: 15px; border-radius: 8px; }
        .title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 8px; }
        .metadata { margin: 10px 0; font-size: 14px; color: #6b7280; }
        .label { font-weight: bold; color: #374151; }
        .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        .active { background-color: #dcfce7; color: #22c55e; font-weight: bold; }
        .expired { background-color: #f3f4f6; color: #6b7280; font-style: italic; }
        .fulfilled { background-color: #f3f4f6; color: #6b7280; }
        .header-info { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>Réservations - SIGB UdM</h1>
      <div class="header-info">
        <p><strong>Export généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Nombre de réservations:</strong> ${reservations.length}</p>
        <p><strong>Université des Montagnes</strong> - Système Intégré de Gestion de Bibliothèque</p>
      </div>
      ${reservations.map(reservation => `
        <div class="reservation">
          <div class="title">Réservation #${reservation.id}</div>
          <div class="metadata">
            <div><span class="label">Utilisateur:</span> ${escapeHtml(reservation.user_name)} (${reservation.student_id})</div>
            <div><span class="label">Email:</span> ${escapeHtml(reservation.user_email)}</div>
            <div><span class="label">Livre:</span> ${escapeHtml(reservation.book_title)}</div>
            <div><span class="label">Auteur:</span> ${escapeHtml(reservation.book_author)}</div>
            <div><span class="label">Code-barres:</span> ${reservation.book_barcode}</div>
            <div><span class="label">Date de réservation:</span> ${new Date(reservation.reservation_date).toLocaleDateString('fr-FR')}</div>
            <div><span class="label">Date d'expiration:</span> ${new Date(reservation.expiry_date).toLocaleDateString('fr-FR')}</div>
            <div><span class="label">Statut:</span> 
              <span class="status ${getStatusClass(reservation.status)}">${getStatusText(reservation.status)}</span>
            </div>
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations-${Date.now()}.html"`
    }
  });
}

/**
 * Export au format XML
 */
function handleXMLExport(reservations: any[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<reservations>
  ${reservations.map(reservation => `
  <reservation id="${reservation.id}">
    <user>
      <name>${escapeXML(reservation.user_name)}</name>
      <email>${escapeXML(reservation.user_email)}</email>
      <student_id>${reservation.student_id}</student_id>
    </user>
    <book>
      <title>${escapeXML(reservation.book_title)}</title>
      <author>${escapeXML(reservation.book_author)}</author>
      <barcode>${reservation.book_barcode}</barcode>
    </book>
    <reservation_date>${reservation.reservation_date}</reservation_date>
    <expiry_date>${reservation.expiry_date}</expiry_date>
    <status>${reservation.status}</status>
    <created_at>${reservation.created_at}</created_at>
  </reservation>
  `).join('')}
</reservations>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="reservations-${Date.now()}.xml"`
    }
  });
}

/**
 * Obtenir la classe CSS pour le statut
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'active': return 'active';
    case 'expired': return 'expired';
    case 'fulfilled': return 'fulfilled';
    default: return '';
  }
}

/**
 * Obtenir le texte du statut
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'expired': return 'Expirée';
    case 'fulfilled': return 'Satisfaite';
    default: return status;
  }
}

/**
 * Échapper les caractères HTML
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Échapper les caractères XML
 */
function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
