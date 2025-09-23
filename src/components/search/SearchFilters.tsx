"use client";

/**
 * Composant de filtres de recherche conforme aux standards SIGB
 */

import React from 'react';
import { Filter, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SearchState } from '@/hooks';

interface SearchFiltersProps {
  searchState: SearchState;
  availableFacets: any;
  onUpdateFilter: (key: string, value: any) => void;
  onRemoveFilter: (key: string) => void;
  onClearFilters: () => void;
}

export function SearchFilters({
  searchState,
  availableFacets,
  onUpdateFilter,
  onRemoveFilter,
  onClearFilters
}: SearchFiltersProps) {
  
  const hasFilters = Object.keys(searchState.filters).length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtres avancés
          </CardTitle>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Filtres communs */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtres généraux
          </h4>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Auteur */}
            <div>
              <Label htmlFor="author" className="text-xs">Auteur</Label>
              <Input
                id="author"
                placeholder="Nom de l'auteur..."
                value={searchState.filters.author || ''}
                onChange={(e) => onUpdateFilter('author', e.target.value)}
                className="text-sm"
              />
            </div>
            
            {/* Titre */}
            <div>
              <Label htmlFor="title" className="text-xs">Titre</Label>
              <Input
                id="title"
                placeholder="Titre du document..."
                value={searchState.filters.title || ''}
                onChange={(e) => onUpdateFilter('title', e.target.value)}
                className="text-sm"
              />
            </div>
            
            {/* Statut */}
            <div>
              <Label className="text-xs">Statut</Label>
              <Select
                value={searchState.filters.status || ''}
                onValueChange={(value) => onUpdateFilter('status', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les statuts</SelectItem>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="borrowed">Prêté</SelectItem>
                  <SelectItem value="reserved">Réservé</SelectItem>
                  <SelectItem value="lost">Perdu</SelectItem>
                  <SelectItem value="damaged">Endommagé</SelectItem>
                  <SelectItem value="withdrawn">Retiré</SelectItem>
                  <SelectItem value="not_for_loan">Pas de prêt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Public cible */}
            <div>
              <Label className="text-xs">Public cible</Label>
              <Select
                value={searchState.filters.target_audience || ''}
                onValueChange={(value) => onUpdateFilter('target_audience', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tous les publics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les publics</SelectItem>
                  <SelectItem value="general">Général</SelectItem>
                  <SelectItem value="beginner">Débutant</SelectItem>
                  <SelectItem value="intermediate">Intermédiaire</SelectItem>
                  <SelectItem value="advanced">Avancé</SelectItem>
                  <SelectItem value="academic">Académique</SelectItem>
                  <SelectItem value="professional">Professionnel</SelectItem>
                  <SelectItem value="undergraduate">Licence</SelectItem>
                  <SelectItem value="graduate">Master</SelectItem>
                  <SelectItem value="postgraduate">Doctorat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Format */}
            <div>
              <Label className="text-xs">Format</Label>
              <Select
                value={searchState.filters.format || ''}
                onValueChange={(value) => onUpdateFilter('format', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Tous les formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les formats</SelectItem>
                  <SelectItem value="print">Imprimé</SelectItem>
                  <SelectItem value="digital">Numérique</SelectItem>
                  <SelectItem value="ebook">Livre électronique</SelectItem>
                  <SelectItem value="audiobook">Livre audio</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="multimedia">Multimédia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Langue */}
            <div>
              <Label className="text-xs">Langue</Label>
              <Select
                value={searchState.filters.language || ''}
                onValueChange={(value) => onUpdateFilter('language', value)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Toutes les langues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les langues</SelectItem>
                  {availableFacets.global?.languages?.map((lang: any) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Filtres spécifiques aux livres */}
        {(searchState.type === 'books' || searchState.type === 'all') && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filtres livres
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {/* Domaine */}
              <div>
                <Label htmlFor="domain" className="text-xs">Domaine</Label>
                <Input
                  id="domain"
                  placeholder="Domaine d'étude..."
                  value={searchState.filters.domain || ''}
                  onChange={(e) => onUpdateFilter('domain', e.target.value)}
                  className="text-sm"
                />
              </div>
              
              {/* Classification Dewey */}
              <div>
                <Label htmlFor="dewey" className="text-xs">Classification Dewey</Label>
                <Input
                  id="dewey"
                  placeholder="Ex: 004 (Informatique)"
                  value={searchState.filters.dewey_classification || ''}
                  onChange={(e) => onUpdateFilter('dewey_classification', e.target.value)}
                  className="text-sm"
                />
              </div>
              
              {/* Éditeur */}
              <div>
                <Label htmlFor="publisher" className="text-xs">Éditeur</Label>
                <Input
                  id="publisher"
                  placeholder="Nom de l'éditeur..."
                  value={searchState.filters.publisher || ''}
                  onChange={(e) => onUpdateFilter('publisher', e.target.value)}
                  className="text-sm"
                />
              </div>
              
              {/* ISBN */}
              <div>
                <Label htmlFor="isbn" className="text-xs">ISBN</Label>
                <Input
                  id="isbn"
                  placeholder="978-2-123456-78-9"
                  value={searchState.filters.isbn || ''}
                  onChange={(e) => onUpdateFilter('isbn', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Filtres académiques */}
        {(searchState.type === 'theses' || searchState.type === 'memoires' || searchState.type === 'stage_reports' || searchState.type === 'all') && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtres académiques
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Année */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="year_min" className="text-xs">Année min</Label>
                    <Input
                      id="year_min"
                      type="number"
                      placeholder="2020"
                      value={searchState.filters.year_min || ''}
                      onChange={(e) => onUpdateFilter('year_min', e.target.value ? parseInt(e.target.value) : '')}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="year_max" className="text-xs">Année max</Label>
                    <Input
                      id="year_max"
                      type="number"
                      placeholder="2024"
                      value={searchState.filters.year_max || ''}
                      onChange={(e) => onUpdateFilter('year_max', e.target.value ? parseInt(e.target.value) : '')}
                      className="text-sm"
                    />
                  </div>
                </div>
                
                {/* Université */}
                <div>
                  <Label htmlFor="university" className="text-xs">Université</Label>
                  <Input
                    id="university"
                    placeholder="Nom de l'université..."
                    value={searchState.filters.university || ''}
                    onChange={(e) => onUpdateFilter('university', e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                {/* Faculté */}
                <div>
                  <Label className="text-xs">Faculté</Label>
                  <Select
                    value={searchState.filters.faculty || ''}
                    onValueChange={(value) => onUpdateFilter('faculty', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Toutes les facultés" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les facultés</SelectItem>
                      {availableFacets.global?.departments?.map((dept: any) => (
                        <SelectItem key={dept.faculty} value={dept.faculty}>
                          {dept.faculty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Directeur/Superviseur */}
                <div>
                  <Label htmlFor="supervisor" className="text-xs">Directeur/Superviseur</Label>
                  <Input
                    id="supervisor"
                    placeholder="Nom du directeur..."
                    value={searchState.filters.supervisor || ''}
                    onChange={(e) => onUpdateFilter('supervisor', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Filtres utilisateurs */}
        {(searchState.type === 'users' || searchState.type === 'all') && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtres utilisateurs
              </h4>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Catégorie utilisateur */}
                <div>
                  <Label className="text-xs">Catégorie</Label>
                  <Select
                    value={searchState.filters.user_category || ''}
                    onValueChange={(value) => onUpdateFilter('user_category', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Toutes les catégories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les catégories</SelectItem>
                      <SelectItem value="student">Étudiant</SelectItem>
                      <SelectItem value="teacher">Enseignant</SelectItem>
                      <SelectItem value="researcher">Chercheur</SelectItem>
                      <SelectItem value="staff">Personnel</SelectItem>
                      <SelectItem value="external">Externe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Niveau d'études */}
                <div>
                  <Label className="text-xs">Niveau d'études</Label>
                  <Select
                    value={searchState.filters.study_level || ''}
                    onValueChange={(value) => onUpdateFilter('study_level', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Tous les niveaux" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les niveaux</SelectItem>
                      <SelectItem value="L1">L1</SelectItem>
                      <SelectItem value="L2">L2</SelectItem>
                      <SelectItem value="L3">L3</SelectItem>
                      <SelectItem value="M1">M1</SelectItem>
                      <SelectItem value="M2">M2</SelectItem>
                      <SelectItem value="PhD">Doctorat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Département */}
                <div>
                  <Label className="text-xs">Département</Label>
                  <Select
                    value={searchState.filters.department || ''}
                    onValueChange={(value) => onUpdateFilter('department', value)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Tous les départements" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les départements</SelectItem>
                      {availableFacets.global?.departments?.map((dept: any) => (
                        <SelectItem key={dept.value} value={dept.value}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
