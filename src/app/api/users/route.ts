import { NextRequest, NextResponse } from 'next/server';
import { userSchema } from '@/lib/validations';
import { getUsers, executeQuery } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import { logCrudOperation, logError } from '@/lib/system-logger';
import { DocumentIdentifierService } from '@/lib/services/document-identifier-service';

// GET /api/users - Récupérer tous les usagers avec pagination et filtres
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const active = searchParams.get('active');

    // Construire les filtres pour MySQL
    const filters: Record<string, unknown> = {};

    if (search) {
      filters.search = search;
      // Vérifier si c'est une recherche par matricule
      if (searchParams.get('matricule') === 'true') {
        filters.matricule = search;
      }
    }

    if (active !== null) {
      filters.active_only = active === 'true';
    }

    // Récupérer tous les utilisateurs avec filtres depuis MySQL
    const allUsers = await getUsers(filters);

    // Calculer la pagination
    const total = allUsers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const users = allUsers.slice(startIndex, endIndex);

    const response = {
      data: users || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        has_next: startIndex + limit < total,
        has_prev: page > 1
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: { code: 'FETCH_ERROR', message: 'Erreur lors de la récupération des usagers' } },
      { status: 500 }
    );
  }
}

// POST /api/users - Créer un nouvel usager
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation des données
    const validatedData = userSchema.parse(body);

    // Vérifier si l'email existe déjà
    const existingEmailUsers = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [validatedData.email]
    ) as Array<{ id: string }>;

    if (existingEmailUsers.length > 0) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Cet email existe déjà' } },
        { status: 422 }
      );
    }

    // Générer les identifiants complets pour le nouvel utilisateur
    const identifiers = await DocumentIdentifierService.generateCompleteIdentifier(
      'user',
      new Date().getFullYear(),
      {
        generateHandle: true
      }
    );

    // Vérifier si le code-barres généré existe déjà (sécurité supplémentaire)
    const existingBarcodeUsers = await executeQuery(
      'SELECT id FROM users WHERE barcode = ?',
      [identifiers.barcode]
    ) as Array<{ id: string }>;

    if (existingBarcodeUsers.length > 0) {
      return NextResponse.json(
        { error: { code: 'BARCODE_EXISTS', message: 'Code-barres généré déjà existant, veuillez réessayer' } },
        { status: 422 }
      );
    }

    // Vérifier si le matricule existe déjà (s'il est fourni)
    if (validatedData.matricule) {
      const existingMatriculeUsers = await executeQuery(
        'SELECT id FROM users WHERE matricule = ?',
        [validatedData.matricule]
      ) as Array<{ id: string }>;

      if (existingMatriculeUsers.length > 0) {
        return NextResponse.json(
          { error: { code: 'MATRICULE_EXISTS', message: 'Ce matricule existe déjà' } },
          { status: 422 }
        );
      }
    }

    // Utiliser l'UUID généré par le service d'identifiants
    const userId = identifiers.uuid;

    // Récupérer les paramètres par défaut depuis system_settings avec la nouvelle fonction utilitaire
    const { getDefaultUserSettings } = await import('@/lib/system-settings');
    const defaultSettings = await getDefaultUserSettings();

    const defaultMaxLoans = defaultSettings.max_loans_per_user;
    const defaultMaxReservations = defaultSettings.max_reservations_per_user;

    // Créer le nouvel usager dans MySQL
    await executeQuery(
      `INSERT INTO users (id, email, full_name, barcode, cames_id, local_id, handle, matricule, phone, address, is_active, max_loans, max_reservations,
                         academic_documents_pdf_path, academic_pdf_file_type, academic_pdf_file_size,
                         faculty, user_category, study_level, department, account_status,
                         suspension_reason, expiry_date, institution)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        validatedData.email,
        validatedData.full_name,
        identifiers.barcode,
        identifiers.cames_id,
        identifiers.local_id,
        identifiers.handle,
        validatedData.matricule || null,
        validatedData.phone || null,
        validatedData.address || null,
        validatedData.is_active !== undefined ? validatedData.is_active : true,
        validatedData.max_loans || defaultMaxLoans,
        validatedData.max_reservations || defaultMaxReservations,
        validatedData.academic_documents_pdf_path || null,
        validatedData.academic_pdf_file_type || null,
        validatedData.academic_pdf_file_size || null,
        validatedData.faculty || null,
        validatedData.user_category || 'student',
        validatedData.study_level || null,
        validatedData.department || null,
        validatedData.account_status || 'active',
        validatedData.suspension_reason || null,
        validatedData.expiry_date || null,
        validatedData.institution || null
      ]
    );

    // Récupérer l'utilisateur créé
    const newUsers = await executeQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    ) as Array<{ id: string; email: string; full_name: string; barcode: string }>;

    const newUser = newUsers[0];

    // Logger la création de l'utilisateur
    await logCrudOperation(
      'create',
      'users',
      userId,
      undefined,
      {
        email: validatedData.email,
        full_name: validatedData.full_name,
        barcode: identifiers.barcode,
        matricule: validatedData.matricule,
        user_category: validatedData.user_category || 'student'
      }
    );

    return NextResponse.json(
      { data: newUser, message: 'Usager créé avec succès' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating user:', error);
    await logError(error as Error, { 
      action: 'create_user',
      requestUrl: '/api/users'
    });
    return NextResponse.json(
      { error: { code: 'CREATE_ERROR', message: 'Erreur lors de la création de l\'utilisateur' } },
      { status: 500 }
    );
  }
}

// Note: PUT et DELETE en lot ne sont pas implémentés pour des raisons de sécurité
// Ces opérations doivent être effectuées individuellement via les routes [id]
