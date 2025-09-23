/**
 * API d'export pour utilisateurs - SIGB UdM
 * Formats supportés : PDF, JSON, XML
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';

// GET /api/users/export - Exporter des utilisateurs
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
        id, matricule as student_id, full_name, email, phone, address,
        created_at as registration_date,
        CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END as status,
        user_category as user_type, faculty, department, study_level as level,
        created_at, updated_at,
        (SELECT COUNT(*) FROM loans WHERE user_id = users.id AND status = 'active') as active_loans,
        (SELECT COUNT(*) FROM reservations WHERE user_id = users.id AND status = 'active') as active_reservations
      FROM users
      WHERE 1=1
    `;
    
    let params: any[] = [];

    if (search) {
      query += ` AND (full_name LIKE ? OR email LIKE ? OR student_id LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      if (status === 'active') {
        query += ` AND is_active = 1`;
      } else if (status === 'inactive') {
        query += ` AND is_active = 0`;
      }
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const users = await executeQuery(query, params) as any[];

    // Traitement selon le format demandé
    switch (format) {
      case 'pdf':
        return handlePDFExport(users);
      case 'xml':
        return handleXMLExport(users);
      default:
        return NextResponse.json({
          data: users,
          total: users.length,
          format: 'json'
        });
    }

  } catch (error) {
    console.error('Erreur lors de l\'export des utilisateurs:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'EXPORT_ERROR', 
          message: 'Erreur lors de l\'export des utilisateurs' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Export HTML pour conversion PDF
 */
function handlePDFExport(users: any[]) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Export Utilisateurs - SIGB UdM</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #ffffff; color: #374151; }
        h1 { color: #22c55e; border-bottom: 3px solid #22c55e; padding-bottom: 10px; margin-bottom: 20px; }
        .user { margin-bottom: 30px; page-break-inside: avoid; border-left: 4px solid #22c55e; padding-left: 15px; background-color: #f9fafb; padding: 15px; border-radius: 8px; }
        .title { font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 8px; }
        .metadata { margin: 10px 0; font-size: 14px; color: #6b7280; }
        .label { font-weight: bold; color: #374151; }
        .status { padding: 3px 8px; border-radius: 3px; font-size: 12px; }
        .active { background-color: #dcfce7; color: #22c55e; font-weight: bold; }
        .inactive { background-color: #f3f4f6; color: #6b7280; }
        .suspended { background-color: #f3f4f6; color: #6b7280; }
        .stats { background-color: #ffffff; padding: 10px; margin-top: 10px; border-radius: 5px; border: 1px solid #e5e7eb; }
        .header-info { background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <h1>Utilisateurs - SIGB UdM</h1>
      <div class="header-info">
        <p><strong>Export généré le:</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
        <p><strong>Nombre d'utilisateurs:</strong> ${users.length}</p>
        <p><strong>Université des Montagnes</strong> - Système Intégré de Gestion de Bibliothèque</p>
      </div>
      ${users.map(user => `
        <div class="user">
          <div class="title">${escapeHtml(user.full_name)} (${user.student_id})</div>
          <div class="metadata">
            <div><span class="label">Email:</span> ${escapeHtml(user.email)}</div>
            <div><span class="label">Téléphone:</span> ${escapeHtml(user.phone || 'Non renseigné')}</div>
            <div><span class="label">Adresse:</span> ${escapeHtml(user.address || 'Non renseignée')}</div>
            <div><span class="label">Date de naissance:</span> ${user.birth_date ? new Date(user.birth_date).toLocaleDateString('fr-FR') : 'Non renseignée'}</div>
            <div><span class="label">Date d'inscription:</span> ${new Date(user.registration_date).toLocaleDateString('fr-FR')}</div>
            <div><span class="label">Type:</span> ${getUserTypeText(user.user_type)}</div>
            <div><span class="label">Faculté:</span> ${escapeHtml(user.faculty || 'Non renseignée')}</div>
            <div><span class="label">Département:</span> ${escapeHtml(user.department || 'Non renseigné')}</div>
            <div><span class="label">Niveau:</span> ${escapeHtml(user.level || 'Non renseigné')}</div>
            <div><span class="label">Statut:</span> 
              <span class="status ${getStatusClass(user.status)}">${getStatusText(user.status)}</span>
            </div>
            <div class="stats">
              <div><span class="label">Prêts actifs:</span> ${user.active_loans}</div>
              <div><span class="label">Réservations actives:</span> ${user.active_reservations}</div>
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
      'Content-Disposition': `attachment; filename="utilisateurs-${Date.now()}.html"`
    }
  });
}

/**
 * Export au format XML
 */
function handleXMLExport(users: any[]) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<users>
  ${users.map(user => `
  <user id="${user.id}">
    <student_id>${user.student_id}</student_id>
    <full_name>${escapeXML(user.full_name)}</full_name>
    <email>${escapeXML(user.email)}</email>
    <phone>${escapeXML(user.phone || '')}</phone>
    <address>${escapeXML(user.address || '')}</address>
    ${user.birth_date ? `<birth_date>${user.birth_date}</birth_date>` : ''}
    <registration_date>${user.registration_date}</registration_date>
    <status>${user.status}</status>
    <user_type>${user.user_type}</user_type>
    <faculty>${escapeXML(user.faculty || '')}</faculty>
    <department>${escapeXML(user.department || '')}</department>
    <level>${escapeXML(user.level || '')}</level>
    <active_loans>${user.active_loans}</active_loans>
    <active_reservations>${user.active_reservations}</active_reservations>
    <created_at>${user.created_at}</created_at>
  </user>
  `).join('')}
</users>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="utilisateurs-${Date.now()}.xml"`
    }
  });
}

/**
 * Obtenir la classe CSS pour le statut
 */
function getStatusClass(status: string): string {
  switch (status) {
    case 'active': return 'active';
    case 'inactive': return 'inactive';
    case 'suspended': return 'suspended';
    default: return '';
  }
}

/**
 * Obtenir le texte du statut
 */
function getStatusText(status: string): string {
  switch (status) {
    case 'active': return 'Actif';
    case 'inactive': return 'Inactif';
    case 'suspended': return 'Suspendu';
    default: return status;
  }
}

/**
 * Obtenir le texte du type d'utilisateur
 */
function getUserTypeText(userType: string): string {
  switch (userType) {
    case 'student': return 'Étudiant';
    case 'teacher': return 'Enseignant';
    case 'staff': return 'Personnel';
    case 'external': return 'Externe';
    default: return userType;
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
