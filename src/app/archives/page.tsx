"use client";

import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import {
  Archive,
  Building2,
  GraduationCap,
  Calculator,
  Users,
  FileText,
  BarChart3,
  ChevronRight,
  Search
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ProtectedLayout from "@/components/layout/protected-layout";
import { InstantPageHeader } from "@/components/ui/instant-components";

import { UnifiedStatCard } from "@/components/ui/instant-components";

// Services universitaires avec leurs icônes et couleurs
const universityServices = [
  {
    id: "diplomes",
    name: "Service des Diplômes",
    description: "Gestion des dossiers étudiants et documents académiques",
    icon: GraduationCap,
    color: "from-green-600 to-green-700",
    bgColor: "bg-green-50 dark:bg-green-800/90",
    textColor: "text-green-600",
    href: "/archives/diplomes",
    documentsCount: 0, // Sera mis à jour dynamiquement
    studentsCount: 0, // Sera mis à jour dynamiquement
    status: "active"
  },
  {
    id: "comptabilite",
    name: "Service de Comptabilité",
    description: "Archives financières et documents comptables",
    icon: Calculator,
    color: "from-green-600 to-green-700",
    bgColor: "bg-green-50 dark:bg-green-800/90",
    textColor: "text-green-600",
    href: "/archives/comptabilite",
    documentsCount: 0, // Sera mis à jour dynamiquement
    studentsCount: 0, // Sera mis à jour dynamiquement
    status: "coming_soon"
  },
  {
    id: "scolarite",
    name: "Service de la Scolarité",
    description: "Dossiers scolaires et relevés de notes",
    icon: FileText,
    color: "from-gray-600 to-gray-700",
    bgColor: "bg-gray-50 dark:bg-gray-800/90",
    textColor: "text-gray-600",
    href: "/archives/scolarite",
    documentsCount: 0, // Sera mis à jour dynamiquement
    studentsCount: 0, // Sera mis à jour dynamiquement
    status: "coming_soon"
  },
  {
    id: "rh",
    name: "Ressources Humaines",
    description: "Dossiers du personnel et documents RH",
    icon: Users,
    color: "from-gray-600 to-gray-700",
    bgColor: "bg-gray-50 dark:bg-gray-800/90",
    textColor: "text-gray-600",
    href: "/archives/rh",
    documentsCount: 0, // Sera mis à jour dynamiquement
    studentsCount: 0, // Sera mis à jour dynamiquement
    status: "coming_soon"
  },
  {
    id: "administration",
    name: "Service de l'Administration",
    description: "Documents administratifs et correspondances",
    icon: Building2,
    color: "from-gray-600 to-gray-700",
    bgColor: "bg-gray-50 dark:bg-gray-800/90",
    textColor: "text-gray-600",
    href: "/archives/administration",
    documentsCount: 0, // Sera mis à jour dynamiquement
    studentsCount: 0, // Sera mis à jour dynamiquement
    status: "coming_soon"
  },
  {
    id: "statistiques",
    name: "Service des Statistiques",
    description: "Rapports et données statistiques",
    icon: BarChart3,
    color: "from-green-600 to-green-700",
    bgColor: "bg-green-50 dark:bg-green-800/90",
    textColor: "text-green-600",
    href: "/archives/statistiques",
    documentsCount: 0, // Sera mis à jour dynamiquement
    studentsCount: 0, // Sera mis à jour dynamiquement
    status: "coming_soon"
  }
];

export default function ArchivesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [services, setServices] = useState(universityServices);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour récupérer les statistiques réelles
  const fetchRealStatistics = async () => {
    try {
      setIsLoading(true);

      // Récupérer les statistiques pour le service des diplômes (seul service actif)
      const response = await fetch('/api/archives/documents?limit=1000');
      if (response.ok) {
        const data = await response.json();
        const totalArchiveDocuments = data.pagination?.total || 0;

        // Récupérer le nombre d'étudiants avec des documents d'archives
        const uniqueStudents = new Set(data.data?.map((doc: any) => doc.student_id) || []);
        const totalStudentsWithDocs = uniqueStudents.size;

        // Mettre à jour les services avec les vraies données
        const updatedServices = services.map(service => {
          if (service.id === 'diplomes') {
            return {
              ...service,
              documentsCount: totalArchiveDocuments,
              studentsCount: totalStudentsWithDocs
            };
          }
          return service;
        });

        setServices(updatedServices);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRealStatistics();
  }, []);

  // Statistiques globales
  const totalDocuments = services.reduce((sum, service) => sum + service.documentsCount, 0);
  const totalStudents = services.reduce((sum, service) => sum + service.studentsCount, 0);
  const activeServices = services.filter(service => service.status === "active").length;

  // Filtrage des services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = selectedFilter === "all" ||
                         (selectedFilter === "active" && service.status === "active") ||
                         (selectedFilter === "coming_soon" && service.status === "coming_soon") ||
                         (selectedFilter === "high_volume" && service.documentsCount > 1000) ||
                         (selectedFilter === "medium_volume" && service.documentsCount >= 100 && service.documentsCount <= 1000) ||
                         (selectedFilter === "low_volume" && service.documentsCount < 100);

    return matchesSearch && matchesFilter;
  });

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900">
        {/* Header administratif moderne */}
        <InstantPageHeader
          title="Archives Universitaires"
          subtitle="Système centralisé d'archivage documentaire par services"
          icon={Archive}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="bg-green-100 dark:bg-green-700 border border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-600 hover:border-green-400 dark:hover:border-green-500 transition-all duration-200 font-medium text-green-700 dark:text-green-200"
            >
              Actualiser
            </Button>
          }
        />

        <div className="container mx-auto px-4 py-8">
          {/* Statistiques globales avec animations spectaculaires - responsive */}
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <UnifiedStatCard
              stat={{
                value: totalDocuments?.toLocaleString() || '0',
                label: "Total Documents",
                icon: FileText,
                gradient: "from-green-600 to-green-700"
              }}
            />
            <UnifiedStatCard
              stat={{
                value: totalStudents?.toLocaleString() || '0',
                label: "Dossiers Étudiants",
                icon: GraduationCap,
                gradient: "from-green-600 to-green-700"
              }}
            />
            <UnifiedStatCard
              stat={{
                value: activeServices,
                label: "Services Actifs",
                icon: Building2,
                gradient: "from-gray-600 to-gray-700"
              }}
            />
            <UnifiedStatCard
              stat={{
                value: universityServices.length,
                label: "Services Total",
                icon: Archive,
                gradient: "from-gray-600 to-gray-700"
              }}
            />
          </motion.div>

          {/* Barre de recherche et filtres */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <Card className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Rechercher un service..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("all")}
                    >
                      Tous
                    </Button>
                    <Button
                      variant={selectedFilter === "active" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("active")}
                    >
                      Actifs
                    </Button>
                    <Button
                      variant={selectedFilter === "coming_soon" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("coming_soon")}
                    >
                      Bientôt
                    </Button>
                    <Button
                      variant={selectedFilter === "high_volume" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("high_volume")}
                    >
                      Volume élevé (&gt;1000)
                    </Button>
                    <Button
                      variant={selectedFilter === "medium_volume" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("medium_volume")}
                    >
                      Volume moyen (100-1000)
                    </Button>
                    <Button
                      variant={selectedFilter === "low_volume" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedFilter("low_volume")}
                    >
                      Volume faible (&lt;100)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Grille des services */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredServices.map((service, index) => {
              const IconComponent = service.icon;
              const isActive = service.status === "active";
              
              return (
                <motion.div
                  key={service.id}
                  initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.1 * index }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="h-full"
                >
                  <Card className={`h-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${!isActive ? 'opacity-75' : ''}`}>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-3 rounded-xl ${service.bgColor}`}>
                          <IconComponent className={`h-6 w-6 ${service.textColor}`} />
                        </div>
                        {!isActive && (
                          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            Bientôt
                          </span>
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                          {service.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          {service.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Documents:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {service.documentsCount?.toLocaleString() || '0'}
                          </span>
                        </div>
                        {service.studentsCount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Dossiers étudiants:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {service.studentsCount?.toLocaleString() || '0'}
                            </span>
                          </div>
                        )}
                        
                        {isActive ? (
                          <Button asChild className={`w-full bg-gradient-to-r ${service.color} hover:opacity-90 text-white`}>
                            <Link href={service.href} className="flex items-center justify-center">
                              <span>Accéder au service</span>
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Link>
                          </Button>
                        ) : (
                          <Button disabled className="w-full">
                            <span>Bientôt disponible</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Message si aucun résultat */}
          {filteredServices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Archive className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucun service trouvé
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Essayez de modifier vos critères de recherche
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
