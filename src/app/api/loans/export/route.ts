/**
 * API d'export pour prêts - SIGB UdM
 * Formats supportés : PDF, JSON, XML
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/loans/export - Exporter des prêts
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
        l.id, l.user_id, l.book_id, l.loan_date, l.due_date, l.return_date,
        l.status, l.created_at, l.updated_at, l.fine_amount, l.fine_paid,
        u.full_name as user_name, u.email as user_email, u.matricule as student_id,
        b.title as book_title, b.main_author as book_author, b.barcode as book_barcode,
        CASE 
          WHEN l.status = 'active' AND l.due_date < NOW() THEN 'overdue'
          ELSE l.status 
        END as computed_status,
        CASE 
          WHEN l.status = 'active' AND l.due_date < NOW() THEN DATEDIFF(NOW(), l.due_date)
          ELSE 0 
        END as days_overdue
      FROM loans l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN books b ON l.book_id = b.id
      WHERE 1=1
    `;
    
    let params: any[] = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR b.title LIKE ? OR u.student_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      if (status === 'overdue') {
        query += ` AND l.status = 'active' AND l.due_date < NOW()`;
      } else {
        query += ` AND l.status = ?`;
        params.push(status);
      }
    }

    query += ` ORDER BY l.created_at DESC LIMIT ?`;
    params.push(limit);

    const loans = await executeQuery(query, params) as any[];

    // Traitement selon le format demandé
    switch (format) {
      case 'pdf':
        return handlePDFExport(loans);
      case 'xml':
        return handleXMLExport(loans);
      default:
        return NextResponse.json({
          data: loans,
          total: loans.length,
          format: 'json'
        });
    }

  } catch (error) {
    console.error('Erreur lors de l\'export des prêts:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'EXPORT_ERROR', 
          message: 'Erreur lors de l\'export des prêts' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Export HTML pour conversion PDF
 */
function handlePDFExport(loans: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Export Prêts - SIGB UdM</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #ffffff; color: #374151; }
        h1 { color: #22c55e; border-bottom: 3px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
        .loan { margin-bottom: 30px; page-break-inside: avoid; border-left: 4px solid #22c55e; padding-left: 15px; background-color: #f9fafb; padding: 15px; border-radius: 8px; }
        .title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 8px; }
        .metadata { margin: 10px 0; font-size: 14px; color: #6b7280; }
        .label { font-weight: bold; color: #374151; }
        .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        .active { background-color: #dcfce7; color: #22c55e; font-weight: bold; }
        .overdue { background-color: #f3f4f6; color: #6b7280; font-style: italic; }
        .returned { background-color: #f3f4f6; color: #6b7280; }
        .overdue-info { color: #6b7280; font-weight: bold; }
        .header-info { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>Prêts - SIGB UdM</h1>
      <div class="header-info">
        <p><strong>Export généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Nombre de prêts:</strong> ${loans.length}</p>
        <p><strong>Université des Montagnes</strong> - Système Intégré de Gestion de Bibliothèque</p>
      </div>
      ${loans.map(loan => `
        <div class="loan">
          <div class="title">Prêt #${loan.id}</div>
          <div class="metadata">
            <div><span class="label">Utilisateur:</span> ${escapeHtml(loan.user_name)} (${loan.student_id})</div>
            <div><span class="label">Email:</span> ${escapeHtml(loan.user_email)}</div>
            <div><span class="label">Livre:</span> ${escapeHtml(loan.book_title)}</div>
            <div><span class="label">Auteur:</span> ${escapeHtml(loan.book_author)}</div>
            <div><span class="label">Code-barres:</span> ${loan.book_barcode}</div>
            <div><span class="label">Date de prêt:</span> ${new Date(loan.loan_date).toLocaleDateString('fr-FR')}</div>
            <div><span class="label">Date d'échéance:</span> ${new Date(loan.due_date).toLocaleDateString('fr-FR')}</div>
            ${loan.return_date ? `<div><span class="label">Date de retour:</span> ${new Date(loan.return_date).toLocaleDateString('fr-FR')}</div>` : ''}
            <div><span class="label">Renouvellements:</span> ${loan.renewal_count}</div>
            <div><span class="label">Statut:</span> 
              <span class="status ${getStatusClass(loan.computed_status)}">${getStatusText(loan.computed_status)}</span>
              ${loan.days_overdue > 0 ? `<span class="overdue-info"> (${loan.days_overdue} jours de retard)</span>` : ''}
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
      'Content-Disposition': `attachment; filename="prets-${Date.now()}.html"`
    }
  });
}

/**
 * Export au format XML
 */
function handleXMLExport(loans: any[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<loans>
  ${loans.map(loan => `
  <loan id="${loan.id}">
    <user>
      <name>${escapeXML(loan.user_name)}</name>
      <email>${escapeXML(loan.user_email)}</email>
      <student_id>${loan.student_id}</student_id>
    </user>
    <book>
      <title>${escapeXML(loan.book_title)}</title>
      <author>${escapeXML(loan.book_author)}</author>
      <barcode>${loan.book_barcode}</barcode>
    </book>
    <loan_date>${loan.loan_date}</loan_date>
    <due_date>${loan.due_date}</due_date>
    ${loan.return_date ? `<return_date>${loan.return_date}</return_date>` : ''}
    <status>${loan.computed_status}</status>
    <renewal_count>${loan.renewal_count}</renewal_count>
    ${loan.days_overdue > 0 ? `<days_overdue>${loan.days_overdue}</days_overdue>` : ''}
    <created_at>${loan.created_at}</created_at>
  </loan>
  `).join('')}
</loans>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="prets-${Date.now()}.xml"`
    }
  });
}

/**
 * Obtenir la classe CSS pour le statut
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'active': return 'active';
    case 'overdue': return 'overdue';
    case 'returned': return 'returned';
    default: return '';
  }
}

/**
 * Obtenir le texte du statut
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'active': return 'Actif';
    case 'overdue': return 'En retard';
    case 'returned': return 'Retourné';
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
