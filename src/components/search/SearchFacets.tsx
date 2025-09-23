"use client";

/**
 * Composant d'affichage des facettes de recherche
 */

import React from 'react';
import { BarChart3, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FacetData } from '@/lib/validations';

interface SearchFacetsProps {
  facets: FacetData[];
  onFilterSelect: (key: string, value: any) => void;
}

export function SearchFacets({ facets, onFilterSelect }: SearchFacetsProps) {
  if (!facets || facets.length === 0) {
    return null;
  }

  const renderFacetGroup = (facet: FacetData) => {
    const maxCount = Math.max(...facet.values.map(v => v.count));
    
    return (
      <div key={facet.field} className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
          {facet.field.replace('_', ' ')}
        </h4>
        
        <div className="space-y-2">
          {facet.values.slice(0, 8).map((value) => {
            const percentage = (value.count / maxCount) * 100;
            
            return (
              <div
                key={value.value}
                className="group cursor-pointer"
                onClick={() => onFilterSelect(facet.field, value.value)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-green-600 transition-colors">
                    {value.label || value.value}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {value.count}
                  </Badge>
                </div>
                
                <Progress 
                  value={percentage} 
                  className="h-1 group-hover:h-2 transition-all duration-200"
                />
              </div>
            );
          })}
          
          {facet.values.length > 8 && (
            <Button variant="ghost" size="sm" className="text-xs w-full">
              Voir plus ({facet.values.length - 8} autres)
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Affiner la recherche
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {facets.map(renderFacetGroup)}
      </CardContent>
    </Card>
  );
}
