import { createGetByIdHandler, createUpdateHandler, createDeleteHandler } from '@/lib/crud-api-factory';
import { bookSchema } from '@/lib/validations';
import { getBookById } from '@/lib/mysql';

// Configuration CRUD pour les livres
const booksConfig = {
  tableName: 'books',
  entityName: 'livre',
  schema: bookSchema,
  getByIdFunction: getBookById,
  searchableFields: ['title', 'main_author', 'isbn', 'mfn'],
  updateableFields: [
    'title', 'main_author', 'isbn', 'publisher', 'publication_year', 'domain', 'availability',
    'subtitle', 'parallel_title', 'secondary_author', 'edition', 'publication_city', 
    'acquisition_mode', 'price', 'collection', 'summary', 'abstract', 'keywords', 'keywords_en',
    'dewey_classification', 'cdu_classification', 'subject_headings', 'available_copies', 'total_copies',
    'document_path', 'file_type', 'document_size', 'digital_versions', 'has_digital_version',
    'language', 'format', 'target_audience', 'physical_location', 'status'
  ]
};

// Handlers CRUD génériques - REMPLACE TOUT LE CODE DUPLIQUÉ
export const GET = createGetByIdHandler(booksConfig);
export const PUT = createUpdateHandler(booksConfig);
export const DELETE = createDeleteHandler(booksConfig);


