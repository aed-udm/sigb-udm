/**
 * API d'export pour livres - SIGB UdM
 * Formats supportés : PDF, JSON, XML
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/books/export - Exporter des livres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const search = searchParams.get('search') || '';
    const domain = searchParams.get('domain') || '';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Construire la requête
    let query = `
      SELECT 
        id, title, main_author, secondary_author, publisher, publication_year,
        publication_city, domain, summary, abstract, keywords, keywords_en,
        dewey_classification, cdu_classification, subject_headings, language,
        total_copies, available_copies, barcode, isbn, created_at, updated_at
      FROM books 
      WHERE 1=1
    `;
    
    let params: any[] = [];

    if (search) {
      query += ` AND (title LIKE ? OR main_author LIKE ? OR publisher LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (domain) {
      query += ` AND domain = ?`;
      params.push(domain);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const books = await executeQuery(query, params) as any[];

    // Traitement selon le format demandé
    switch (format) {
      case 'pdf':
        return handlePDFExport(books);
      case 'xml':
        return handleXMLExport(books);
      default:
        return NextResponse.json({
          data: books,
          total: books.length,
          format: 'json'
        });
    }

  } catch (error) {
    console.error('Erreur lors de l\'export des livres:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'EXPORT_ERROR', 
          message: 'Erreur lors de l\'export des livres' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Export HTML pour conversion PDF
 */
function handlePDFExport(books: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Export Livres - SIGB UdM</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #ffffff; color: #374151; }
        h1 { color: #22c55e; border-bottom: 3px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
        .book { margin-bottom: 30px; page-break-inside: avoid; border-left: 4px solid #22c55e; padding-left: 15px; }
        .title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 8px; }
        .metadata { margin: 10px 0; font-size: 14px; color: #6b7280; }
        .label { font-weight: bold; color: #374151; }
        .availability { color: #22c55e; font-weight: bold; }
        .unavailable { color: #6b7280; font-style: italic; }
        .header-info { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>Catalogue des Livres - SIGB UdM</h1>
      <div class="header-info">
        <p><strong>Export généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Nombre de livres:</strong> ${books.length}</p>
        <p><strong>Université des Montagnes</strong> - Système Intégré de Gestion de Bibliothèque</p>
      </div>
      ${books.map(book => `
        <div class="book">
          <div class="title">${escapeHtml(book.title)}</div>
          <div class="metadata">
            <div><span class="label">Auteur principal:</span> ${escapeHtml(book.main_author)}</div>
            ${book.secondary_author ? `<div><span class="label">Auteur secondaire:</span> ${escapeHtml(book.secondary_author)}</div>` : ''}
            <div><span class="label">Éditeur:</span> ${escapeHtml(book.publisher)}</div>
            <div><span class="label">Année:</span> ${book.publication_year}</div>
            <div><span class="label">Ville:</span> ${escapeHtml(book.publication_city)}</div>
            <div><span class="label">Domaine:</span> ${escapeHtml(book.domain)}</div>
            ${book.isbn ? `<div><span class="label">ISBN:</span> ${book.isbn}</div>` : ''}
            <div><span class="label">Code-barres:</span> ${book.barcode}</div>
            <div><span class="label">Disponibilité:</span> 
              <span class="${book.available_copies > 0 ? 'availability' : 'unavailable'}">
                ${book.available_copies}/${book.total_copies} exemplaires disponibles
              </span>
            </div>
            ${book.summary ? `<div><span class="label">Résumé:</span> ${escapeHtml(book.summary)}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="livres-${Date.now()}.html"`
    }
  });
}

/**
 * Export au format XML
 */
function handleXMLExport(books: any[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<books>
  ${books.map(book => `
  <book>
    <title>${escapeXML(book.title)}</title>
    <main_author>${escapeXML(book.main_author)}</main_author>
    ${book.secondary_author ? `<secondary_author>${escapeXML(book.secondary_author)}</secondary_author>` : ''}
    <publisher>${escapeXML(book.publisher)}</publisher>
    <publication_year>${book.publication_year}</publication_year>
    <publication_city>${escapeXML(book.publication_city)}</publication_city>
    <domain>${escapeXML(book.domain)}</domain>
    ${book.isbn ? `<isbn>${book.isbn}</isbn>` : ''}
    <barcode>${book.barcode}</barcode>
    <total_copies>${book.total_copies}</total_copies>
    <available_copies>${book.available_copies}</available_copies>
    ${book.summary ? `<summary>${escapeXML(book.summary)}</summary>` : ''}
  </book>
  `).join('')}
</books>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="livres-${Date.now()}.xml"`
    }
  });
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
