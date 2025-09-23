/**
 * API d'export pour documents académiques - SIGB UdM
 * Formats supportés : PDF, JSON, XML, CAMES
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/academic-documents/export - Exporter des documents académiques
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'all';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100');

    // Construire la requête selon le type
    let query = '';
    let params: any[] = [];

    if (type === 'all' || type === 'these') {
      query = `
        SELECT 
          'these' as document_type, id, title, main_author as author,
          director as supervisor, target_degree as degree, specialty,
          defense_year as year, defense_date, university, faculty,
          summary, abstract, keywords, keywords_en,
          dewey_classification, cdu_classification, subject_headings,
          document_path, document_size, cames_id, handle, doi
        FROM theses 
        WHERE is_accessible = 1
        ${search ? 'AND (title LIKE ? OR main_author LIKE ?)' : ''}
        ORDER BY defense_year DESC, title
        LIMIT ?
      `;
      
      if (search) {
        params = [`%${search}%`, `%${search}%`, limit];
      } else {
        params = [limit];
      }
    }

    const documents = await executeQuery(query, params) as any[];

    // Traitement selon le format demandé
    switch (format) {
      case 'cames':
        return handleCAMESExport(documents);
      case 'pdf':
        return handlePDFExport(documents);
      case 'xml':
        return handleXMLExport(documents);
      default:
        return NextResponse.json({
          data: documents,
          total: documents.length,
          format: 'json'
        });
    }

  } catch (error) {
    console.error('Erreur lors de l\'export:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'EXPORT_ERROR', 
          message: 'Erreur lors de l\'export des documents académiques' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Export au format CAMES/DICAMES
 */
function handleCAMESExport(documents: any[]) {
  const camesData = documents.map(doc => ({
    cames_id: doc.cames_id,
    title: doc.title,
    author: doc.author,
    supervisor: doc.supervisor,
    university: doc.university,
    year: doc.year,
    degree: doc.degree,
    specialty: doc.specialty,
    keywords_fr: doc.keywords ? JSON.parse(doc.keywords) : [],
    keywords_en: doc.keywords_en ? JSON.parse(doc.keywords_en) : [],
    classification_dewey: doc.dewey_classification,
    classification_cdu: doc.cdu_classification,
    abstract: doc.abstract,
    handle: doc.handle,
    doi: doc.doi,
    document_url: doc.document_path ? `https://repository.udm.edu.cm${doc.document_path}` : null
  }));

  return NextResponse.json({
    data: camesData,
    total: camesData.length,
    format: 'cames',
    export_date: new Date().toISOString()
  });
}

/**
 * Export HTML pour conversion PDF
 */
function handlePDFExport(documents: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Export Documents Académiques - SIGB UdM</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #ffffff; color: #374151; }
        h1 { color: #22c55e; border-bottom: 3px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
        .document { margin-bottom: 30px; page-break-inside: avoid; border-left: 4px solid #22c55e; padding-left: 15px; background-color: #f9fafb; padding: 15px; border-radius: 8px; }
        .title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 8px; }
        .metadata { margin: 10px 0; font-size: 14px; color: #6b7280; }
        .label { font-weight: bold; color: #374151; }
        .header-info { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>Documents Académiques - SIGB UdM</h1>
      <div class="header-info">
        <p><strong>Export généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Nombre de documents:</strong> ${documents.length}</p>
        <p><strong>Université des Montagnes</strong> - Système Intégré de Gestion de Bibliothèque</p>
      </div>
      ${documents.map(doc => `
        <div class="document">
          <div class="title">${doc.title}</div>
          <div class="metadata">
            <div><span class="label">Auteur:</span> ${doc.author}</div>
            <div><span class="label">Encadreur:</span> ${doc.supervisor}</div>
            <div><span class="label">Année:</span> ${doc.year}</div>
            <div><span class="label">Université:</span> ${doc.university}</div>
            <div><span class="label">Spécialité:</span> ${doc.specialty}</div>
            ${doc.abstract ? `<div><span class="label">Résumé:</span> ${doc.abstract}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="documents-academiques-${Date.now()}.html"`
    }
  });
}

/**
 * Export au format XML
 */
function handleXMLExport(documents: any[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<documents>
  ${documents.map(doc => `
  <document type="${doc.document_type}">
    <title>${escapeXML(doc.title)}</title>
    <author>${escapeXML(doc.author)}</author>
    <supervisor>${escapeXML(doc.supervisor)}</supervisor>
    <year>${doc.year}</year>
    <university>${escapeXML(doc.university)}</university>
    <specialty>${escapeXML(doc.specialty)}</specialty>
    ${doc.abstract ? `<abstract>${escapeXML(doc.abstract)}</abstract>` : ''}
    ${doc.cames_id ? `<cames_id>${doc.cames_id}</cames_id>` : ''}
    ${doc.handle ? `<handle>${doc.handle}</handle>` : ''}
  </document>
  `).join('')}
</documents>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="documents-academiques-${Date.now()}.xml"`
    }
  });
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