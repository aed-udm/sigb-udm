"use client";

/**
 * Page de recherche avancée conforme aux standards SIGB
 * Compatible avec Koha, PMB, Evergreen
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, SlidersHorizontal, Grid, List, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAdvancedSearch } from '@/hooks';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { SearchFacets } from './SearchFacets';
import { SearchStats } from './SearchStats';

export function AdvancedSearchPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showFilters, setShowFilters] = useState(true);
  
  const {
    searchState,
    results,
    availableFacets,
    searchStats,
    suggestions,
    updateQuery,
    updateType,
    updateFilter,
    removeFilter,
    clearFilters,
    updateSort,
    updatePage,
    updateLimit,
    search,
    reset
  } = useAdvancedSearch({
    autoSearch: false,
    debounceMs: 300
  });

  const handleSearch = () => {
    search();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
      {/* Header */}
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Search className="h-6 w-6 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Recherche Avancée
                </h1>
              </div>
              <Badge variant="outline" className="text-xs">
                Standards SIGB
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtres
              </Button>
              
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Filtres */}
          {showFilters && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
              className="lg:col-span-1"
            >
              <div className="space-y-6">
                {/* Recherche principale */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Search className="h-5 w-5 mr-2" />
                      Recherche
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Rechercher dans tous les documents..."
                        value={searchState.query}
                        onChange={(e) => updateQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={searchState.type} onValueChange={updateType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type de document" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="books">Livres</SelectItem>
                        <SelectItem value="theses">Thèses</SelectItem>
                        <SelectItem value="memoires">Mémoires</SelectItem>
                        <SelectItem value="stage_reports">Rapports de stage</SelectItem>
                        <SelectItem value="users">Utilisateurs</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button onClick={handleSearch} className="w-full">
                      <Search className="h-4 w-4 mr-2" />
                      Rechercher
                    </Button>
                  </CardContent>
                </Card>

                {/* Filtres avancés */}
                <SearchFilters
                  searchState={searchState}
                  availableFacets={availableFacets}
                  onUpdateFilter={updateFilter}
                  onRemoveFilter={removeFilter}
                  onClearFilters={clearFilters}
                />

                {/* Facettes */}
                <SearchFacets
                  facets={results.facets}
                  onFilterSelect={updateFilter}
                />

                {/* Statistiques */}
                <SearchStats
                  searchStats={searchStats}
                  results={results}
                  searchState={searchState}
                />
              </div>
            </motion.div>
          )}

          {/* Contenu principal */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}
          >
            <div className="space-y-6">
              {/* Filtres actifs */}
              {searchStats?.hasFilters && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Filtres actifs ({searchStats?.activeFiltersCount || 0})
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Tout effacer
                      </Button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(searchState.filters).map(([key, value]) => {
                        if (value === undefined || value === null || value === '') return null;
                        
                        return (
                          <Badge
                            key={key}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <span className="text-xs font-medium">{key}:</span>
                            <span className="text-xs">{value}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFilter(key)}
                              className="h-4 w-4 p-0 ml-1 hover:bg-red-100"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Barre d'outils résultats */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {results.loading ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            Recherche en cours...
                          </div>
                        ) : (
                          <div className="flex items-center space-x-4">
                            <span>
                              {results.total?.toLocaleString() || '0'} résultat{results.total > 1 ? 's' : ''}
                            </span>
                            {results.searchTime > 0 && (
                              <span className="flex items-center text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {results.searchTime}ms
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Select
                        value={`${searchState.sortBy}-${searchState.sortOrder}`}
                        onValueChange={(value) => {
                          const [sortBy, sortOrder] = value.split('-');
                          updateSort(sortBy, sortOrder as 'asc' | 'desc');
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance-desc">Pertinence</SelectItem>
                          <SelectItem value="title-asc">Titre (A-Z)</SelectItem>
                          <SelectItem value="title-desc">Titre (Z-A)</SelectItem>
                          <SelectItem value="author-asc">Auteur (A-Z)</SelectItem>
                          <SelectItem value="author-desc">Auteur (Z-A)</SelectItem>
                          <SelectItem value="date-desc">Plus récent</SelectItem>
                          <SelectItem value="date-asc">Plus ancien</SelectItem>
                          <SelectItem value="popularity-desc">Plus populaire</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select
                        value={searchState.limit.toString()}
                        onValueChange={(value) => updateLimit(parseInt(value))}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Résultats */}
              <SearchResults
                results={results}
                searchState={searchState}
                viewMode={viewMode}
                onPageChange={updatePage}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
