"use client";


import { motion } from "framer-motion";
import { 
  Shield, 
  User, 
  BookOpen, 
  Users, 
  Calendar,
  Check,
  X,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { InstantPageHeader } from "@/components/ui/instant-components";
import { useUserRole, setUserRole, getAvailableRoles, type UserRole } from "@/hooks";
import { useToast } from "@/hooks/use-toast";

const roleIcons: Record<UserRole, any> = {
  admin: Shield,
  bibliothecaire: BookOpen,
  enregistrement: Users,
  etudiant: User,
  user: User,
};

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800 border-red-200 dark:bg-red-800/90 dark:text-red-300 dark:border-red-800",
  bibliothecaire: "bg-green-100 text-blue-800 border-green-200 dark:bg-green-800/90 dark:text-green-300 dark:border-green-800",
  enregistrement: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-800",
  etudiant: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-800/90 dark:text-blue-300 dark:border-blue-800",
  user: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-800",
};

const rolePermissions: Record<UserRole, string[]> = {
  admin: [
    "Accès complet à toutes les fonctionnalités",
    "Gestion des paramètres système",
    "Gestion des utilisateurs et permissions",
    "Accès aux statistiques avancées"
  ],
  bibliothecaire: [
    "Enregistrement des livres, thèses, mémoires",
    "Import de documents en masse",
    "Gestion du catalogue complet",
    "Accès aux statistiques"
  ],

  enregistrement: [
    "Enregistrement des étudiants (usagers)",
    "Gestion complète des emprunts et retours",
    "Gestion des réservations et circulation",
    "Modification des profils utilisateurs",
    "Accueil et orientation des étudiants"
  ],
  etudiant: [
    "Consultation du catalogue",
    "Réservation de documents",
    "Gestion du profil personnel",
    "Suivi des emprunts personnels"
  ],
  user: [
    "Consultation du catalogue public",
    "Gestion du profil personnel"
  ]
};

export default function RolesPage() {
  const { role: currentRole, displayName } = useUserRole();
  const { toast } = useToast();
  const availableRoles = getAvailableRoles() || [];

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole !== currentRole) {
      setUserRole(newRole);
      toast({
        title: "Rôle modifié",
        description: `Vous êtes maintenant connecté en tant que ${rolePermissions[newRole][0]}`,
      });
    }
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 relative overflow-hidden">
        {/* Éléments d'arrière-plan animés */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl" />

        {/* Header */}
        <InstantPageHeader
          title="Gestion des Rôles"
          subtitle="Configuration des rôles et permissions des agents de la bibliothèque"
          icon={Shield}
        />

        <div className="container mx-auto px-4 py-8 space-y-8 relative z-10">
          {/* Rôle actuel */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-green-600" />
                  Rôle Actuel
                </CardTitle>
                <CardDescription>
                  Votre rôle actuel et ses permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="p-3 bg-green-100 dark:bg-blue-800/90 rounded-lg">
                    {roleIcons[currentRole] && (() => {
                      const IconComponent = roleIcons[currentRole];
                      return <IconComponent className="h-6 w-6 text-green-600 dark:text-green-400" />;
                    })()}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Rôle actif dans le système
                    </p>
                  </div>
                  <Badge className={roleColors[currentRole]}>
                    Actuel
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Liste des rôles disponibles */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Rôles Disponibles
                </CardTitle>
                <CardDescription>
                  Cliquez sur un rôle pour l'activer (démonstration)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!availableRoles || availableRoles.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">Aucun rôle disponible</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {availableRoles.map((roleOption) => {
                    const RoleIcon = roleIcons[roleOption.value];
                    const isActive = roleOption.value === currentRole;
                    
                    return (
                      <motion.div
                        key={roleOption.value}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className={`p-6 border-2 rounded-lg transition-all cursor-pointer ${
                          isActive 
                            ? 'border-green-500 bg-green-50 dark:bg-green-800/90 shadow-md' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                        }`}
                        onClick={() => handleRoleChange(roleOption.value)}
                      >
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg ${
                            roleOption.value === 'admin' ? 'bg-red-100 dark:bg-red-800/90' :
                            roleOption.value === 'bibliothecaire' ? 'bg-green-100 dark:bg-blue-800/90' :
                            roleOption.value === 'circulation' ? 'bg-green-100 dark:bg-green-800/90' :
                            roleOption.value === 'enregistrement' ? 'bg-gray-100 dark:bg-gray-800/90' :
                            roleOption.value === 'etudiant' ? 'bg-blue-100 dark:bg-blue-800/90' :
                            'bg-gray-100 dark:bg-gray-800/90'
                          }`}>
                            <RoleIcon className={`h-6 w-6 ${
                              roleOption.value === 'admin' ? 'text-red-600 dark:text-red-300' :
                              roleOption.value === 'bibliothecaire' ? 'text-green-600 dark:text-green-300' :
                              roleOption.value === 'circulation' ? 'text-green-600 dark:text-green-300' :
                              roleOption.value === 'enregistrement' ? 'text-gray-600 dark:text-gray-300' :
                              roleOption.value === 'etudiant' ? 'text-blue-600 dark:text-blue-300' :
                              'text-gray-600 dark:text-gray-300'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {roleOption.label}
                              </h3>
                              {isActive && (
                                <Check className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <ul className="space-y-1">
                              {rolePermissions[roleOption.value].map((permission, index) => (
                                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                                  {permission}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Information sur les agents */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-gray-600" />
                  Agents de la Bibliothèque UdM
                </CardTitle>
                <CardDescription>
                  Les 3 agents spécialisés de la bibliothèque et leurs responsabilités
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <BookOpen className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                        Bibliothécaire Généraliste
                      </h4>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-green-200">
                      Responsable de l'enregistrement des documents et de l'import des données.
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-800/90 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold text-green-900 dark:text-green-100">
                        Agent d'Accueil
                      </h4>
                    </div>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Chargé de l'accueil, orientation et gestion des emprunts/retours.
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-gray-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        Agent d'Enregistrement
                      </h4>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      Responsable de l'enregistrement des usagers et gestion des emprunts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
