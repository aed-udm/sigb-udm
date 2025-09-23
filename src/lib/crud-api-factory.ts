import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/mysql';
import { isZodError, createValidationErrorResponse, createDatabaseErrorResponse } from '@/lib/utils';
import { z } from 'zod';
import { logCrudOperation, logError } from '@/lib/system-logger';
import { UdMFileServerService } from '@/lib/services/file-server';

/**
 * Factory pour créer des APIs CRUD génériques
 * Élimine la duplication de code entre books/[id], users/[id], theses/[id], etc.
 */

export interface CRUDConfig<T extends Record<string, any>> {
  tableName: string;
  entityName: string;
  schema: z.ZodObject<any>;
  getByIdFunction: (id: string) => Promise<T | null>;
  searchableFields?: string[];
  requiredFields?: string[];
  updateableFields?: string[];
}

/**
 * Créer une API GET générique pour récupérer une entité par ID
 */
export function createGetByIdHandler<T extends Record<string, any>>(config: CRUDConfig<T>) {
  return async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await params;

      const entity = await config.getByIdFunction(id);

      if (!entity) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `${config.entityName} non trouvé(e)` } },
          { status: 404 }
        );
      }

      return NextResponse.json({ data: entity });
    } catch (error) {
      console.error(`Error fetching ${config.entityName}:`, error);
      return NextResponse.json(
        { error: { code: 'FETCH_ERROR', message: `Erreur lors de la récupération du/de la ${config.entityName}` } },
        { status: 500 }
      );
    }
  };
}

/**
 * Créer une API PUT générique pour mettre à jour une entité
 */
export function createUpdateHandler<T extends Record<string, any>>(config: CRUDConfig<T>) {
  return async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await params;

      // Vérifier que l'ID est fourni
      if (!id) {
        return NextResponse.json(
          { error: { code: 'MISSING_ID', message: 'ID manquant' } },
          { status: 400 }
        );
      }

      let body;
      try {
        body = await request.json();
      } catch (error) {
        return NextResponse.json(
          { error: { code: 'INVALID_JSON', message: 'Corps de requête JSON invalide' } },
          { status: 400 }
        );
      }

      // Vérifier que l'entité existe
      const existingEntity = await config.getByIdFunction(id);

      if (!existingEntity) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `${config.entityName} non trouvé(e)` } },
          { status: 404 }
        );
      }

      // Validation partielle - seulement les champs fournis
      let validatedData;
      try {
        // Utiliser partial() pour permettre la mise à jour partielle
        const partialSchema = config.schema.partial();
        validatedData = partialSchema.parse(body);
      } catch (validationError) {
        console.error('Validation error:', validationError);
        if (isZodError(validationError)) {
          return createValidationErrorResponse(validationError);
        }
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Erreur de validation des données' } },
          { status: 400 }
        );
      }

      // Filtrer seulement les champs autorisés à la mise à jour
      const updateFields = config.updateableFields || Object.keys(validatedData);
      const fieldsToUpdate = updateFields.filter(field =>
        validatedData.hasOwnProperty(field) && validatedData[field] !== undefined
      );

      if (fieldsToUpdate.length === 0) {
        return NextResponse.json(
          { error: { code: 'NO_FIELDS_TO_UPDATE', message: 'Aucun champ valide à mettre à jour' } },
          { status: 400 }
        );
      }

      // Construire la requête de mise à jour
      const setClause = fieldsToUpdate.map(field => `${field} = ?`).join(', ');
      const values = fieldsToUpdate.map(field => {
        const value = (validatedData as any)[field];
        // Convertir les arrays en JSON string pour MySQL
        if (Array.isArray(value)) {
          return JSON.stringify(value);
        }
        // Convertir null/undefined en null explicite
        if (value === undefined) {
          return null;
        }
        return value;
      });

      console.log(`Updating ${config.tableName} with fields:`, fieldsToUpdate);
      console.log('Values:', values);

      await executeQuery(
        `UPDATE ${config.tableName} SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, id]
      );

      // Récupérer l'entité mise à jour
      const updatedEntity = await config.getByIdFunction(id);

      // Logger la mise à jour
      await logCrudOperation(
        'update',
        config.tableName,
        id,
        undefined,
        {
          updated_fields: fieldsToUpdate,
          changes: validatedData
        }
      );

      return NextResponse.json({
        data: updatedEntity,
        message: `${config.entityName} mis(e) à jour avec succès`
      });

    } catch (error) {
      console.error(`Error updating ${config.entityName}:`, error);

      await logError(error as Error, { 
        action: `update_${config.tableName}`,
        requestUrl: `/api/${config.tableName}/[id]`
      });

      if (isZodError(error)) {
        return createValidationErrorResponse(error);
      }

      return createDatabaseErrorResponse(error);
    }
  };
}

/**
 * Créer une API DELETE générique pour supprimer une entité
 */
export function createDeleteHandler<T extends Record<string, any>>(config: CRUDConfig<T>) {
  return async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const { id } = await params;

      // Vérifier que l'entité existe
      const existingEntity = await config.getByIdFunction(id);

      if (!existingEntity) {
        return NextResponse.json(
          { error: { code: 'NOT_FOUND', message: `${config.entityName} non trouvé(e)` } },
          { status: 404 }
        );
      }

      // Supprimer le fichier du serveur si il existe
      if (existingEntity.document_path) {
        try {
          await UdMFileServerService.deleteFile(existingEntity.document_path);
          console.log(`✅ Fichier supprimé du serveur: ${existingEntity.document_path}`);
        } catch (fileError) {
          console.warn(`⚠️ Impossible de supprimer le fichier: ${existingEntity.document_path}`, fileError);
          // Ne pas faire échouer la suppression de l'entité si le fichier ne peut pas être supprimé
        }
      }

      // Logger la suppression avant de supprimer
      await logCrudOperation(
        'delete',
        config.tableName,
        id,
        undefined,
        { deleted_entity: existingEntity }
      );

      // Supprimer l'entité
      await executeQuery(
        `DELETE FROM ${config.tableName} WHERE id = ?`,
        [id]
      );

      return NextResponse.json({
        message: `${config.entityName} supprimé(e) avec succès`
      });

    } catch (error) {
      await logError(error as Error, { 
        action: `delete_${config.tableName}`,
        requestUrl: `/api/${config.tableName}/[id]`
      });
      return createDatabaseErrorResponse(error);
    }
  };
}

/**
 * Créer une API LIST générique pour lister les entités
 */
export function createListHandler<T extends Record<string, any>>(config: CRUDConfig<T>) {
  return async function GET(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const sortBy = searchParams.get('sortBy') || 'id';
      const sortOrder = searchParams.get('sortOrder') || 'DESC';

      const offset = (page - 1) * limit;

      // Construire la clause WHERE pour la recherche
      let whereClause = '';
      let queryParams: any[] = [];

      if (search && config.searchableFields) {
        const searchConditions = config.searchableFields.map(field => `${field} LIKE ?`);
        whereClause = `WHERE (${searchConditions.join(' OR ')})`;
        queryParams = config.searchableFields.map(() => `%${search}%`);
      }

      // Requête pour compter le total
      const countQuery = `SELECT COUNT(*) as total FROM ${config.tableName} ${whereClause}`;
      const [countResult] = await executeQuery(countQuery, queryParams) as Array<{ total: number }>;
      const total = countResult.total;

      // Requête pour récupérer les données
      const dataQuery = `
        SELECT * FROM ${config.tableName} 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      const entities = await executeQuery(dataQuery, [...queryParams, limit, offset]);

      return NextResponse.json({
        data: entities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      return createDatabaseErrorResponse(error);
    }
  };
}

/**
 * Créer une API CREATE générique pour créer une entité
 */
export function createCreateHandler<T extends Record<string, any>>(config: CRUDConfig<T>) {
  return async function POST(request: NextRequest) {
    try {
      const body = await request.json();

      // Valider les données
      const validatedData = config.schema.parse(body);

      // Construire la requête d'insertion
      const fields = Object.keys(validatedData);
      const placeholders = fields.map(() => '?').join(', ');
      const values = fields.map(field => (validatedData as any)[field]);

      const result = await executeQuery(
        `INSERT INTO ${config.tableName} (${fields.join(', ')}, created_at, updated_at) VALUES (${placeholders}, NOW(), NOW())`,
        values
      ) as any;

      // Récupérer l'entité créée
      const newEntity = await config.getByIdFunction(result.insertId.toString());

      return NextResponse.json({
        data: newEntity,
        message: `${config.entityName} créé(e) avec succès`
      }, { status: 201 });

    } catch (error) {
      if (isZodError(error)) {
        return createValidationErrorResponse(error);
      }
      return createDatabaseErrorResponse(error);
    }
  };
}

/**
 * Créer un ensemble complet d'handlers CRUD
 */
export function createCRUDHandlers<T extends Record<string, any>>(config: CRUDConfig<T>) {
  return {
    GET: createGetByIdHandler(config),
    PUT: createUpdateHandler(config),
    DELETE: createDeleteHandler(config),
    LIST: createListHandler(config),
    POST: createCreateHandler(config)
  };
}

/**
 * Configurations prédéfinies pour les entités communes
 */
export const CRUD_CONFIGS = {
  books: {
    tableName: 'books',
    entityName: 'livre',
    searchableFields: ['title', 'main_author', 'isbn', 'mfn'],
    updateableFields: ['title', 'main_author', 'isbn', 'publisher', 'publication_year', 'domain', 'availability']
  },
  users: {
    tableName: 'users',
    entityName: 'utilisateur',
    searchableFields: ['full_name', 'email', 'barcode'],
    updateableFields: ['full_name', 'email', 'phone', 'address', 'max_loans', 'max_reservations']
  },
  theses: {
    tableName: 'theses',
    entityName: 'thèse',
    searchableFields: ['title', 'author', 'supervisor', 'university'],
    updateableFields: ['title', 'author', 'supervisor', 'university', 'specialty', 'defense_date']
  },
  agents: {
    tableName: 'agents',
    entityName: 'agent',
    searchableFields: ['full_name', 'email', 'employee_id'],
    updateableFields: ['full_name', 'email', 'phone', 'role', 'permissions']
  },
  loans: {
    tableName: 'loans',
    entityName: 'emprunt',
    searchableFields: ['user_id', 'book_id'],
    updateableFields: ['due_date', 'return_date', 'status', 'notes']
  }
};
