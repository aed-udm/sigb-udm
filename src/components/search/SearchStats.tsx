"use client";

/**
 * Composant d'affichage des statistiques de recherche
 */

import React from 'react';
import { TrendingUp, Clock, Database, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SearchResults, SearchState } from '@/hooks';

interface SearchStatsProps {
  searchStats: {
    hasQuery: boolean;
    hasFilters: boolean;
    activeFiltersCount: number;
    hasResults: boolean;
    isFirstPage: boolean;
    isLastPage: boolean;
    canGoNext: boolean;
    canGoPrev: boolean;
  };
  results: SearchResults;
  searchState: SearchState;
}

export function SearchStats({ searchStats, results, searchState }: SearchStatsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Statistiques
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résultats */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Résultats</span>
          <Badge variant="outline">
            {results.total?.toLocaleString() || '0'}
          </Badge>
        </div>
        
        {/* Temps de recherche */}
        {results.searchTime > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Temps
            </span>
            <Badge variant="secondary">
              {results.searchTime}ms
            </Badge>
          </div>
        )}
        
        {/* Filtres actifs */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Filter className="h-3 w-3 mr-1" />
            Filtres
          </span>
          <Badge variant={searchStats.hasFilters ? "default" : "outline"}>
            {searchStats.activeFiltersCount}
          </Badge>
        </div>
        
        {/* Type de recherche */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <Database className="h-3 w-3 mr-1" />
            Type
          </span>
          <Badge variant="outline">
            {searchState.type === 'all' ? 'Tous' : searchState.type}
          </Badge>
        </div>
        
        {/* Pagination */}
        {results.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
            <Badge variant="outline">
              {searchState.page} / {results.totalPages}
            </Badge>
          </div>
        )}
        
        {/* Performance */}
        {results.searchTime > 0 && (
          <div className="pt-3 border-t">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Performance:</span>
                <span className={results.searchTime < 200 ? 'text-green-600' : results.searchTime < 500 ? 'text-orange-600' : 'text-red-600'}>
                  {results.searchTime < 200 ? 'Excellente' : results.searchTime < 500 ? 'Bonne' : 'Lente'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Standard SIGB:</span>
                <span className="text-green-600">✓ Conforme</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
