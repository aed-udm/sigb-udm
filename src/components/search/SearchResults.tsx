"use client";

/**
 * Composant d'affichage des résultats de recherche
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Book, 
  GraduationCap, 
  FileText, 
  Briefcase, 
  User, 
  Calendar, 
  MapPin, 
  Eye,
  Download,
  ExternalLink,
  Clock,
  Star
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SearchResults as SearchResultsType, SearchState } from '@/hooks';
import { getStatusColor } from '@/lib/utils';

interface SearchResultsProps {
  results: SearchResultsType;
  searchState: SearchState;
  viewMode: 'grid' | 'list';
  onPageChange: (page: number) => void;
}

export function SearchResults({
  results,
  searchState,
  viewMode,
  onPageChange
}: SearchResultsProps) {

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'book': return <Book className="h-5 w-5" />;
      case 'these': return <GraduationCap className="h-5 w-5" />;
      case 'memoire': return <FileText className="h-5 w-5" />;
      case 'rapport_stage': return <Briefcase className="h-5 w-5" />;
      case 'user': return <User className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLabels = {
      'available': 'Disponible',
      'borrowed': 'Prêté',
      'reserved': 'Réservé',
      'lost': 'Perdu',
      'damaged': 'Endommagé'
    };

    const label = statusLabels[status as keyof typeof statusLabels] || status;

    return (
      <Badge className={getStatusColor(status, 'badge')}>
        {label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const renderDocumentCard = (item: any, index: number) => (
    <motion.div
      key={item.id}
      initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            {/* Icône du type de document */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400">
                {getDocumentIcon(item.document_type)}
              </div>
            </div>

            {/* Contenu principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Titre */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Auteur */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-medium">Auteur:</span> {item.main_author || item.author || 'Non spécifié'}
                  </p>

                  {/* Informations spécifiques selon le type */}
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {item.document_type === 'book' && (
                      <>
                        {item.publisher && (
                          <p><span className="font-medium">Éditeur:</span> {item.publisher}</p>
                        )}
                        {item.publication_year && (
                          <p><span className="font-medium">Année:</span> {item.publication_year}</p>
                        )}
                        {item.isbn && (
                          <p><span className="font-medium">ISBN:</span> {item.isbn}</p>
                        )}
                        {item.domain && (
                          <p><span className="font-medium">Domaine:</span> {item.domain}</p>
                        )}
                      </>
                    )}

                    {(item.document_type === 'thesis' || item.document_type === 'memoire') && (
                      <>
                        {item.director && (
                          <p><span className="font-medium">Directeur:</span> {item.director}</p>
                        )}
                        {item.supervisor && (
                          <p><span className="font-medium">Superviseur:</span> {item.supervisor}</p>
                        )}
                        {item.university && (
                          <p><span className="font-medium">Université:</span> {item.university}</p>
                        )}
                        {item.target_degree && (
                          <p><span className="font-medium">Diplôme:</span> {item.target_degree}</p>
                        )}
                        {(item.defense_year || item.academic_year) && (
                          <p><span className="font-medium">Année:</span> {item.defense_year || item.academic_year}</p>
                        )}
                      </>
                    )}

                    {item.document_type === 'stage_report' && (
                      <>
                        {item.company_name && (
                          <p><span className="font-medium">Entreprise:</span> {item.company_name}</p>
                        )}
                        {item.supervisor && (
                          <p><span className="font-medium">Superviseur:</span> {item.supervisor}</p>
                        )}
                        {item.company_supervisor && (
                          <p><span className="font-medium">Superviseur entreprise:</span> {item.company_supervisor}</p>
                        )}
                        {item.academic_year && (
                          <p><span className="font-medium">Année:</span> {item.academic_year}</p>
                        )}
                      </>
                    )}

                    {item.document_type === 'user' && (
                      <>
                        {item.email && (
                          <p><span className="font-medium">Email:</span> {item.email}</p>
                        )}
                        {item.matricule && (
                          <p><span className="font-medium">Matricule:</span> {item.matricule}</p>
                        )}
                        {item.user_category && (
                          <p><span className="font-medium">Catégorie:</span> {item.user_category}</p>
                        )}
                        {item.study_level && (
                          <p><span className="font-medium">Niveau:</span> {item.study_level}</p>
                        )}
                        {item.department && (
                          <p><span className="font-medium">Département:</span> {item.department}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Résumé/Abstract */}
                  {(item.summary || item.abstract) && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-3">
                      {item.summary || item.abstract}
                    </p>
                  )}
                </div>

                {/* Badges et actions */}
                <div className="flex flex-col items-end space-y-2 ml-4">
                  {/* Statut */}
                  {item.status && getStatusBadge(item.status)}
                  
                  {/* Public cible */}
                  {item.target_audience && (
                    <Badge variant="outline" className="text-xs">
                      {item.target_audience}
                    </Badge>
                  )}
                  
                  {/* Format */}
                  {item.format && (
                    <Badge variant="secondary" className="text-xs">
                      {item.format}
                    </Badge>
                  )}
                  
                  {/* Langue */}
                  {item.language && item.language !== 'fr' && (
                    <Badge variant="outline" className="text-xs">
                      {item.language.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Métadonnées supplémentaires */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  {item.view_count !== undefined && (
                    <div className="flex items-center">
                      <Eye className="h-3 w-3 mr-1" />
                      {item.view_count} vues
                    </div>
                  )}
                  
                  {item.created_at && (
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Ajouté le {formatDate(item.created_at)}
                    </div>
                  )}
                  
                  {item.physical_location && (
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {item.physical_location}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  
                  {item.document_path && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Télécharger
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPagination = () => {
    if (results.totalPages <= 1) return null;

    const pages = [];
    const currentPage = searchState.page;
    const totalPages = results.totalPages;
    
    // Logique de pagination intelligente
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    if (endPage - startPage < 4) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + 4);
      } else {
        startPage = Math.max(1, endPage - 4);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Précédent
        </Button>
        
        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="text-gray-400">...</span>}
          </>
        )}
        
        {pages.map(page => (
          <Button
            key={page}
            variant={page === currentPage ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Suivant
        </Button>
      </div>
    );
  };

  if (results.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Recherche en cours...</p>
        </div>
      </div>
    );
  }

  if (results.error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <ExternalLink className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Erreur de recherche</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{results.error}</p>
        </CardContent>
      </Card>
    );
  }

  if (results.total === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <FileText className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Aucun résultat trouvé</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Essayez de modifier vos critères de recherche ou d'utiliser des termes plus généraux.
          </p>
          <div className="text-sm text-gray-500">
            <p>Suggestions :</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Vérifiez l'orthographe des mots-clés</li>
              <li>Utilisez des termes plus généraux</li>
              <li>Réduisez le nombre de filtres appliqués</li>
              <li>Essayez des synonymes</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Résultats */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-6' : 'space-y-4'}>
        {results.data.map((item, index) => renderDocumentCard(item, index))}
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
}
