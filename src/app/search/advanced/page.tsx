/**
 * Page de recherche avancée conforme aux standards SIGB
 */

import { Metadata } from 'next';
import { AdvancedSearchPage } from '@/components/search/AdvancedSearchPage';

export const metadata: Metadata = {
  title: 'Recherche Avancée | Bibliothèque UDM',
  description: 'Recherche avancée dans la bibliothèque universitaire conforme aux standards SIGB internationaux (Koha, PMB, Evergreen)',
  keywords: [
    'recherche avancée',
    'bibliothèque',
    'SIGB',
    'livres',
    'thèses',
    'mémoires',
    'rapports de stage',
    'UDM',
    'Cameroun',
    'filtres',
    'facettes'
  ],
};

export default function AdvancedSearchPageRoute() {
  return <AdvancedSearchPage />;
}
