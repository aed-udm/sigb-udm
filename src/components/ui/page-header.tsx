"use client";

import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  backHref?: string;
  backLabel?: string;
  iconColor?: string;
  actions?: React.ReactNode | Array<{
    action: "add" | "export" | "import" | "filter" | "search";
    href?: string;
    onClick?: () => void;
    exportType?: string;
    children?: React.ReactNode;
    disabled?: boolean;
  }>;
  // Nouvelles props pour la fonctionnalité smart
  entity?: string;
  customRefreshFn?: () => Promise<void>;
  lastUpdated?: Date;
  className?: string;
  showRefreshButton?: boolean;
  showLastUpdated?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  backHref,
  backLabel = "Retour",
  iconColor = "text-green-600",
  actions,
  entity,
  customRefreshFn,
  lastUpdated,
  className,
  showRefreshButton = false,
  showLastUpdated = false
}: PageHeaderProps) {
  // Déterminer si on utilise les actions smart ou classiques
  const isSmartActions = Array.isArray(actions);

  return (
    <div className={cn(
      "glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md",
      className
    )}>
      {/* Effet glassmorphism background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />
      <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {backHref && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {backLabel}
                </Link>
              </Button>
            )}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconColor}`} />
              </motion.div>
              <div>
                <motion.h1
                  className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  {title}
                </motion.h1>
                <motion.p
                  className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  {description}
                </motion.p>
              </div>
            </div>
          </div>
          {actions && (
            <motion.div
              className="w-full sm:w-auto"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              {Array.isArray(actions) ? (
                <div className="flex gap-2">
                  {actions.map((action, index) => (
                    <div key={index}>{action.children}</div>
                  ))}
                </div>
              ) : (
                actions
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
