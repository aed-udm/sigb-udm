"use client";

import { cn } from "@/lib/utils";
import { 
  getNotificationBadgeClasses, 
  getNotificationBadgeType, 
  shouldBadgePulse,
  notificationBadgeColors 
} from "@/lib/badge-colors";

interface NotificationBadgeProps {
  value: string | number;
  itemName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: keyof typeof notificationBadgeColors;
  forcePulse?: boolean;
  showTooltip?: boolean;
}

export function NotificationBadge({
  value,
  itemName,
  className,
  size = 'sm',
  variant,
  forcePulse,
  showTooltip = true
}: NotificationBadgeProps) {
  // Détermine automatiquement le type de badge si non spécifié
  const badgeType = variant || getNotificationBadgeType(itemName, value);
  
  // Détermine si le badge doit pulser
  const shouldPulse = forcePulse !== undefined ? forcePulse : shouldBadgePulse(itemName, value);
  
  // Classes de base selon la taille
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };
  
  // Génère les classes CSS
  const badgeClasses = getNotificationBadgeClasses(badgeType, shouldPulse);
  
  // Message de tooltip
  const getTooltipMessage = () => {
    const numValue = typeof value === 'string' ? parseInt(value) || 0 : value;
    
    if (itemName.toLowerCase().includes('emprunt')) {
      return `${numValue} emprunt${numValue > 1 ? 's' : ''} en retard`;
    }
    if (itemName.toLowerCase().includes('réservation')) {
      return `${numValue} réservation${numValue > 1 ? 's' : ''} en attente`;
    }
    if (itemName.toLowerCase().includes('livre') && value === 'Nouveau') {
      return 'Nouveaux documents disponibles';
    }
    if (itemName.toLowerCase().includes('paramètre') && value === '!') {
      return 'Alertes système nécessitant votre attention';
    }
    if (itemName.toLowerCase().includes('coopération')) {
      return `${numValue} demande${numValue > 1 ? 's' : ''} d'échange`;
    }
    
    return `${value} notification${numValue > 1 ? 's' : ''}`;
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center justify-center font-bold rounded-full border flex-shrink-0 transition-all duration-200",
        sizeClasses[size],
        badgeClasses,
        // Effet de hover
        "hover:scale-110 hover:shadow-lg",
        // Animation d'apparition
        "animate-in fade-in-0 zoom-in-95 duration-300",
        className
      )}
      title={showTooltip ? getTooltipMessage() : undefined}
      role="status"
      aria-label={getTooltipMessage()}
    >
      {value}
    </span>
  );
}

// Composant spécialisé pour la sidebar
export function SidebarNotificationBadge({
  value,
  itemName,
  collapsed = false,
  className
}: {
  value: string | number;
  itemName: string;
  collapsed?: boolean;
  className?: string;
}) {
  return (
    <NotificationBadge
      value={value}
      itemName={itemName}
      size={collapsed ? 'sm' : 'sm'}
      className={cn(
        collapsed ? 'ml-1' : 'ml-2',
        className
      )}
      showTooltip={true}
    />
  );
}

// Composant pour les tooltips en mode collapsed
export function CollapsedTooltipBadge({
  value,
  itemName,
  className
}: {
  value: string | number;
  itemName: string;
  className?: string;
}) {
  return (
    <span className={cn(
      "ml-1 px-1 py-0.5 bg-white/20 rounded text-xs font-medium",
      className
    )}>
      {value}
    </span>
  );
}

// Hook pour obtenir les statistiques de badges
export function useBadgeStats(stats: any) {
  return {
    hasOverdueLoans: stats?.overdue_loans > 0,
    hasPendingReservations: stats?.pending_reservations > 0,
    hasNewDocuments: stats?.new_documents > 0,
    hasSystemAlerts: stats?.system_alerts > 0,
    hasExchangeRequests: stats?.exchange_requests > 0,
    totalNotifications: (stats?.overdue_loans || 0) + 
                       (stats?.pending_reservations || 0) + 
                       (stats?.system_alerts || 0) + 
                       (stats?.exchange_requests || 0)
  };
}
