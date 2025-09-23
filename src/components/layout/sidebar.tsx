"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Users,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Home,
  Menu,
  X,
  LogOut,
  Library,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Archive,
  Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSidebarData, useUserRole, useNavigationRefresh } from "@/hooks";
import { SidebarNotificationBadge, CollapsedTooltipBadge } from "@/components/ui/notification-badge";
import { SidebarRefreshIndicator } from "@/components/debug/refresh-indicator";


const getNavigationGroups = (stats: any, canAccess: (module: string) => boolean) => {
  const allGroups = [
    {
      name: "Principal",
      items: [
        {
          name: "Tableau de bord",
          href: "/dashboard",
          icon: Home,
          badge: null,
          module: "dashboard",
        },
      ]
    },
    {
      name: "Catalogue",
      items: [
        {
          name: "Livres",
          href: "/books",
          icon: BookOpen,
          badge: stats?.new_documents > 0 ? "Nouveau" : null,
          module: "books",
        },
        {
          name: "Thèses & Mémoires",
          href: "/theses",
          icon: FileText,
          badge: null,
          module: "theses",
        },
        {
          name: "Autres Documents",
          href: "/others",
          icon: Archive,
          badge: null,
          module: "others",
        },
      ]
    },
    {
      name: "Gestion",
      items: [
        {
          name: "Usagers",
          href: "/users",
          icon: Users,
          badge: null,
          module: "users",
        },
        {
          name: "Emprunts",
          href: "/loans",
          icon: Calendar,
          badge: stats?.overdue_loans > 0 ? stats.overdue_loans.toString() : null,
          module: "loans",
        },
        {
          name: "Salle de Lecture",
          href: "/reading-room",
          icon: BookOpen,
          badge: stats?.active_consultations > 0 ? stats.active_consultations.toString() : null,
          module: "reading_room",
        },
        {
          name: "Réservations",
          href: "/reservations",
          icon: Clock,
          badge: stats?.pending_reservations > 0 ? stats.pending_reservations.toString() : null,
          module: "reservations",
        },
      ]
    },
    {
      name: "Administration",
      items: [
        {
          name: "Statistiques",
          href: "/analytics",
          icon: BarChart3,
          badge: null,
          module: "analytics",
        },
        {
          name: "Archives",
          href: "/archives",
          icon: Archive,
          badge: null,
          module: "archives",
        },
        {
          name: "Standards DICAMES",
          href: "/admin/compliance",
          icon: Shield,
          badge: stats?.non_compliant_docs > 0 ? stats.non_compliant_docs.toString() : null,
          module: "compliance",
        },
        {
          name: "Active Directory",
          href: "/admin/ad-sync",
          icon: Server,
          badge: null,
          module: "ad-sync",
        },
        {
          name: "Paramètres",
          href: "/settings",
          icon: Settings,
          badge: stats?.system_alerts > 0 ? "!" : null,
          module: "settings",
        },
      ]
    },
    {
      name: "Personnel",
      items: [
        {
          name: "Mon Profil",
          href: "/profile",
          icon: Settings,
          badge: null,
          module: "profile",
        },
      ]
    },
  ];

  // Filtrer les groupes et éléments selon les permissions
  return allGroups.map(group => ({
    ...group,
    items: group.items.filter(item => canAccess(item.module))
  })).filter(group => group.items.length > 0);
};

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { stats, userInfo } = useSidebarData();
  const { canAccess } = useUserRole();

  // Hook pour rafraîchir automatiquement lors de la navigation
  useNavigationRefresh();

  // Générer la navigation avec les données dynamiques
  const navigationGroups = getNavigationGroups(stats, canAccess);

  const handleLogout = async () => {
    try {
      // Appeler l'API de déconnexion
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Nettoyer le localStorage
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("authMethod");
    localStorage.removeItem("userRole");

    // Afficher un message de confirmation
    toast({
      title: "Déconnexion réussie",
      description: "Vous avez été déconnecté avec succès",
    });

    // Rediriger vers la page de connexion
    router.push("/auth/login");
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-gray-600 opacity-75" />
        </div>
      )}

      {/* Sidebar - Desktop moderne et collapsible */}
      <motion.div
        initial={false}
        animate={{ width: sidebarCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-30"
        style={{ width: sidebarCollapsed ? 80 : 280 }}
      >
        <div className="glass-nav flex flex-col h-full shadow-2xl relative overflow-hidden">
          {/* Effet de particules glassmorphism */}
          <div className="glass-particles absolute inset-0 pointer-events-none" />
          {/* Header avec logo et bouton collapse */}
          <div className={cn(
            "relative z-10 flex items-center h-16 border-b border-white/20 dark:border-gray-700/20 backdrop-blur-sm transition-all duration-300",
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
          )}>
            <AnimatePresence mode="wait">
              {!sidebarCollapsed ? (
                <motion.div
                  key="expanded"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center space-x-3 min-w-0 flex-1"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 relative">
                    <Library className="h-6 w-6 text-white" />
                    <SidebarRefreshIndicator />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      SGB UdM
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-300font-medium truncate">
                      Université des Montagnes
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <Library className="h-6 w-6 text-white" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Boutons toujours visibles */}
            <div className={cn(
              "flex items-center transition-all duration-300",
              sidebarCollapsed ? "absolute top-2 right-2 flex-col space-y-1" : "space-x-2"
            )}>
              {!sidebarCollapsed && <ThemeToggle />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn(
                  "p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors",
                  sidebarCollapsed ? "bg-white/10 dark:bg-gray-800/90" : ""
                )}
                title={sidebarCollapsed ? "Agrandir la sidebar" : "Réduire la sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                ) : (
                  <ChevronLeft className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                )}
              </Button>
              {sidebarCollapsed && (
                <div className="mt-1">
                  <ThemeToggle />
                </div>
              )}
            </div>
          </div>

          {/* Navigation avec groupes */}
          <nav className={cn(
            "flex-1 py-6 space-y-6 overflow-y-auto overflow-x-hidden",
            sidebarCollapsed ? "px-2" : "px-3"
          )}>
            {navigationGroups.map((group, groupIndex) => (
              <div key={group.name} className="min-w-0">
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.h3
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2, delay: groupIndex * 0.05 }}
                      className="px-3 mb-3 text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider truncate"
                    >
                      {group.name}
                    </motion.h3>
                  )}
                </AnimatePresence>

                <div className="space-y-1">
                  {group.items.map((item, itemIndex) => {
                    const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + "/"));
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.2, delay: (groupIndex * group.items.length + itemIndex) * 0.05 }}
                        className="min-w-0"
                      >
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex items-center text-sm font-medium rounded-xl transition-all duration-200 relative min-w-0",
                            sidebarCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
                            isActive
                              ? "bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg shadow-green-500/30 border border-green-500/20"
                              : "text-gray-700 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white backdrop-blur-sm border border-transparent hover:border-gray-200/50 dark:hover:border-gray-600/50"
                          )}
                        >
                          <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg transition-colors flex-shrink-0",
                            isActive
                              ? "bg-white/20"
                              : "group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                          )}>
                            <item.icon className={cn(
                              "h-5 w-5 transition-colors",
                              isActive
                                ? "text-white"
                                : "text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100"
                            )} />
                          </div>

                          <AnimatePresence>
                            {!sidebarCollapsed && (
                              <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-3 flex items-center justify-between flex-1 min-w-0 overflow-hidden"
                              >
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <SidebarNotificationBadge
                                    value={item.badge}
                                    itemName={item.name}
                                    collapsed={false}
                                  />
                                )}
                                {item.name === "Autres Documents" && (
                                  <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-orange-500 text-white border-orange-400 dark:bg-orange-500 dark:text-white dark:border-orange-400 animate-pulse shadow-sm">
                                     Bientôt
                                  </span>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Tooltip pour mode collapsed */}
                          {sidebarCollapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                              {item.name}
                              {item.badge && (
                                <CollapsedTooltipBadge
                                  value={item.badge}
                                  itemName={item.name}
                                />
                              )}
                            </div>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Section utilisateur moderne */}
          <div className={cn(
            "border-t border-gray-200/50 dark:border-gray-700/50 transition-all duration-300",
            sidebarCollapsed ? "p-2" : "p-4"
          )}>
            <div className={cn(
              "flex items-center transition-all duration-300",
              sidebarCollapsed ? "justify-center" : "space-x-3 mb-3"
            )}>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <AnimatePresence mode="wait">
                {!sidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {(() => {
                        try {
                          const currentUser = localStorage.getItem('currentUser');
                          return currentUser ? JSON.parse(currentUser).full_name : (userInfo?.name || 'Admin');
                        } catch {
                          return userInfo?.name || 'Admin';
                        }
                      })()}
                    </p>
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                        {(() => {
                          try {
                            const currentUser = localStorage.getItem('currentUser');
                            return currentUser ? JSON.parse(currentUser).email : (userInfo?.email || 'admin@udm.cm');
                          } catch {
                            return userInfo?.email || 'admin@udm.cm';
                          }
                        })()}
                      </p>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full border self-start ${
                        (() => {
                          try {
                            const currentUser = localStorage.getItem('currentUser');
                            const role = currentUser ? JSON.parse(currentUser).role : 'admin';
                            return role === 'admin' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-800/90 dark:text-red-300 dark:border-red-800' :
                                   role === 'bibliothecaire' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-800/90 dark:text-green-300 dark:border-green-800' :
                                   role === 'enregistrement' ? 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-800' :
                                   role === 'etudiant' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-800/90 dark:text-blue-300 dark:border-blue-800' :
                                   'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-800';
                          } catch {
                            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-800/90 dark:text-red-300 dark:border-red-800';
                          }
                        })()
                      }`}>
                        {(() => {
                          try {
                            const currentUser = localStorage.getItem('currentUser');
                            const role = currentUser ? JSON.parse(currentUser).role : 'admin';
                            return role === 'admin' ? 'Admin' :
                                   role === 'bibliothecaire' ? 'Biblio' :
                                   role === 'enregistrement' ? 'Enreg.' :
                                   role === 'etudiant' ? 'Étudiant' :
                                   'Utilisateur';
                          } catch {
                            return 'Admin';
                          }
                        })()}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait">
              {!sidebarCollapsed ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2 mt-3"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 flex justify-center"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    onClick={handleLogout}
                    title="Déconnexion"
                  >
                    <LogOut className="h-4 w-4 text-gray-700 dark:text-gray-200" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Mobile Sidebar moderne */}
      <motion.div
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : "-100%",
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header mobile */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-lg">
                <Library className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  SGB UdM
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-300font-medium">
                  Université des Montagnes
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-700 dark:text-gray-200" />
              </Button>
            </div>
          </div>

          {/* Navigation mobile avec groupes */}
          <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
            {navigationGroups.map((group) => (
              <div key={group.name}>
                <h3 className="px-3 mb-3 text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  {group.name}
                </h3>

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (pathname && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group relative",
                          pathname && pathname.startsWith(item.href)
                            ? "bg-green-50 text-green-700 border-l-4 border-green-500 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400 shadow-sm"
                            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50 hover:text-green-600 dark:hover:text-green-400"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors mr-3",
                          isActive
                            ? "bg-white/20"
                            : "group-hover:bg-gray-200 dark:group-hover:bg-gray-700"
                        )}>
                          <item.icon className="h-5 w-5" />
                        </div>

                        <div className="flex items-center justify-between flex-1">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <SidebarNotificationBadge
                              value={item.badge}
                              itemName={item.name}
                              collapsed={false}
                            />
                          )}
                          {item.name === "Autres Documents" && (
                            <span className="px-2.5 py-1 text-xs font-extrabold rounded-full border bg-orange-500 text-white border-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-400 animate-pulse shadow-sm">
                              À VENIR
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Section utilisateur mobile */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-sm font-bold">A</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {(() => {
                    try {
                      const currentUser = localStorage.getItem('currentUser');
                      return currentUser ? JSON.parse(currentUser).full_name : (userInfo?.name || 'Admin');
                    } catch {
                      return userInfo?.name || 'Admin';
                    }
                  })()}
                </p>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-gray-600 dark:text-gray-500 dark:text-gray-300font-medium">
                    {(() => {
                      try {
                        const currentUser = localStorage.getItem('currentUser');
                        return currentUser ? JSON.parse(currentUser).email : (userInfo?.email || 'admin@udm.cm');
                      } catch {
                        return userInfo?.email || 'admin@udm.cm';
                      }
                    })()}
                  </p>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                    (() => {
                      try {
                        const currentUser = localStorage.getItem('currentUser');
                        const role = currentUser ? JSON.parse(currentUser).role : 'admin';
                        return role === 'admin' ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-800/90 dark:text-red-300 dark:border-red-800' :
                               role === 'bibliothecaire' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-800/90 dark:text-green-300 dark:border-green-800' :
                               role === 'enregistrement' ? 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-800' :
                               role === 'etudiant' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-800/90 dark:text-blue-300 dark:border-blue-800' :
                               'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/90 dark:text-gray-300 dark:border-gray-800';
                      } catch {
                        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-800/90 dark:text-red-300 dark:border-red-800';
                      }
                    })()
                  }`}>
                    {(() => {
                      try {
                        const currentUser = localStorage.getItem('currentUser');
                        const role = currentUser ? JSON.parse(currentUser).role : 'admin';
                        return role === 'admin' ? 'Admin' :
                               role === 'bibliothecaire' ? 'Biblio' :
                               role === 'enregistrement' ? 'Enreg.' :
                               role === 'etudiant' ? 'Étudiant' :
                               'Utilisateur';
                      } catch {
                        return 'Admin';
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main content responsive */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar mobile moderne */}
        <header className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 lg:hidden relative overflow-hidden">
          {/* Effet glassmorphism pour mobile */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative z-10 flex items-center h-16 px-4">
            {/* Bouton menu à gauche */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <Menu className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </Button>

            {/* Titre centré */}
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
                  <Library className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  SGB
                </h1>
              </div>
            </div>

            {/* Bouton thème à droite */}
            <ThemeToggle />
          </div>
        </header>

        {/* Page content avec adaptation desktop/mobile */}
        <main className="flex-1 overflow-auto bg-gray-50/30 dark:bg-gray-800/95">
          {/* Desktop: avec marge adaptative */}
          <motion.div
            initial={false}
            animate={{
              marginLeft: sidebarCollapsed ? 80 : 280
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden lg:block min-h-full overflow-x-hidden"
            style={{
              marginLeft: sidebarCollapsed ? 80 : 280,
              width: `calc(100vw - ${sidebarCollapsed ? 80 : 280}px)`
            }}
          >
            <div className="min-w-0 w-full">
              {children}
            </div>
          </motion.div>

          {/* Mobile: sans marge */}
          <div className="lg:hidden min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
