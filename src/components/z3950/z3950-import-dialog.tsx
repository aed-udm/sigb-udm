'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Download, BookOpen, Globe, Database, Library, Zap, FileText, ExternalLink } from 'lucide-react';

interface Z3950ImportDialogProps {
  onImportSuccess?: (book: any) => void;
  trigger?: React.ReactNode;
}

interface SearchResult {
  success: boolean;
  book?: any;
  source?: {
    server: string;
    serverName: string;
    isbn: string;
  };
  preview?: boolean;
  message?: string;
}

export function Z3950ImportDialog({ onImportSuccess, trigger }: Z3950ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [server, setServer] = useState('PROFESSIONAL_SOURCES');
  const [copies, setCopies] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const { toast } = useToast();

  // Sources modernes réellement utilisées et fiables
  const servers = [
    { value: 'MODERN_APIS', label: 'APIs modernes (Recommandé)', icon: Zap, description: 'Google Books + OpenLibrary - Sources fiables et rapides' },
    { value: 'GOOGLE_BOOKS', label: 'Google Books API', icon: BookOpen, description: 'Base de données Google - Très fiable et complète' },
    { value: 'OPENLIBRARY', label: 'OpenLibrary API', icon: Library, description: 'Bibliothèque numérique ouverte - Catalogue mondial' },
    { value: 'PROFESSIONAL_SOURCES', label: 'Sources bibliothèques nationales', icon: Database, description: 'BNF, SUDOC et autres catalogues officiels' }
  ];

  const handleSearch = async () => {
    if (!isbn.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un ISBN",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setSearchResult(null);

    try {
      const response = await fetch('/api/z3950/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: isbn.trim(),
          server,
          copies,
          autoSave: false // Prévisualisation d'abord
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSearchResult(data);
        toast({
          title: "Livre trouvé !",
          description: `Données importées depuis ${data.source?.serverName}`,
        });
      } else {
        toast({
          title: "Aucun résultat",
          description: data.error || "Aucun livre trouvé pour cet ISBN",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de la recherche de livre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!searchResult?.book) return;

    setLoading(true);

    try {
      const response = await fetch('/api/z3950/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isbn: isbn.trim(),
          server,
          copies,
          autoSave: true // Sauvegarder maintenant
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast({
          title: "Import réussi !",
          description: `Le livre "${data.book.title}" a été ajouté à la bibliothèque`,
        });
        
        if (onImportSuccess) {
          onImportSuccess(data.book);
        }
        
        // Réinitialiser le formulaire
        setIsbn('');
        setCopies(1);
        setSearchResult(null);
        setOpen(false);
      } else {
        toast({
          title: "Erreur d'import",
          description: data.error || "Impossible d'importer le livre",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'import du livre",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIsbn('');
    setCopies(1);
    setSearchResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Database className="h-4 w-4" />
            Import Z39.50
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-600" />
            Import automatique de livres
          </DialogTitle>
          <DialogDescription>
            Importez automatiquement des livres depuis Google Books, OpenLibrary et la BNF via leurs APIs officielles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Formulaire de recherche */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Recherche par ISBN</CardTitle>
              <CardDescription>
                Recherchez un livre dans les catalogues bibliographiques internationaux
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Informations sur les sources */}
              <div className="bg-green-50 dark:bg-green-800/90 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Sources de données disponibles</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-green-700 dark:text-green-300">
                  {servers.map((srv) => {
                    const IconComponent = srv.icon;
                    return (
                      <div key={srv.value} className="flex items-center gap-1">
                        <IconComponent className="h-3 w-3" />
                        <span>{srv.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    placeholder="978-2-123-45678-9"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label htmlFor="server">Source de données</Label>
                  <Select value={server} onValueChange={setServer} disabled={loading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {servers.map((srv) => {
                        const IconComponent = srv.icon;
                        return (
                          <SelectItem key={srv.value} value={srv.value}>
                            <span className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{srv.label}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="copies">Nombre d'exemplaires</Label>
                  <Input
                    id="copies"
                    type="number"
                    min="1"
                    max="100"
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleSearch} 
                    disabled={loading || !isbn.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Rechercher
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Résultat de la recherche */}
          {searchResult && searchResult.book && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-800/85">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  Livre trouvé
                  <Badge variant="secondary" className="ml-auto">
                    {searchResult.source?.serverName}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Titre</Label>
                    <p className="font-semibold">{searchResult.book.title}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Auteur</Label>
                    <p>{searchResult.book.main_author || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Éditeur</Label>
                    <p>{searchResult.book.publisher || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Année</Label>
                    <p>{searchResult.book.publication_year || 'Non renseignée'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">ISBN</Label>
                    <p className="font-mono text-sm">{searchResult.book.isbn}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">Exemplaires</Label>
                    <p>{copies}</p>
                  </div>
                </div>
                
                {/* Affichage des résumés - français et/ou anglais */}
                {searchResult.book.summary && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Résumé (Français)
                    </Label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                      {searchResult.book.summary}
                    </p>
                  </div>
                )}

                {searchResult.book.abstract && (
                  <div className={searchResult.book.summary ? "mt-3" : ""}>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Résumé (Anglais)
                    </Label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 leading-relaxed">
                      {searchResult.book.abstract}
                    </p>
                  </div>
                )}

                {/* Affichage des versions numériques */}
                {searchResult.book.digital_versions && searchResult.book.digital_versions.totalFound > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Versions numériques vérifiées ({searchResult.book.digital_versions.totalFound})
                    </Label>



                    <div className="mt-3 space-y-2">
                      {searchResult.book.digital_versions.versions.slice(0, 5).map((version: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {version.format}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {version.source}
                            </Badge>
                            <Badge
                              variant={version.access?.includes('Libre') ? 'success' : 'secondary'}
                              className="text-xs"
                            >
                              {version.access}
                            </Badge>
                          </div>
                          {version.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(version.url, '_blank')}
                              className="h-6 px-2"
                              title={`Ouvrir ${version.format} depuis ${version.source}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {searchResult.book.digital_versions.totalFound > 5 && (
                        <p className="text-xs text-gray-500 text-center">
                          ... et {searchResult.book.digital_versions.totalFound - 5} autres versions vérifiées
                        </p>
                      )}
                    </div>


                  </div>
                )}

                {/* Message si aucune version numérique */}
                {searchResult.book.digital_versions && searchResult.book.digital_versions.totalFound === 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 font-medium mb-2">
                      <FileText className="h-4 w-4" />
                      Aucune version numérique complète trouvée
                    </p>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <p>• Ce livre n'est pas disponible gratuitement en version numérique</p>
                      <p>• Consultez votre bibliothèque locale pour d'autres options</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleImport} disabled={loading} className="flex-1">
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Importer ce livre
                  </Button>
                  <Button variant="outline" onClick={resetForm} disabled={loading}>
                    Nouvelle recherche
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
