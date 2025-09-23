"use client";

/**
 * 👤 CARTE DÉTAILS UTILISATEUR
 * 
 * Composant pour afficher les informations complètes d'un utilisateur
 * incluant emprunts, réservations, limites et statut
 */

import { useState, useEffect } from 'react';
import {
  User,
  BookOpen,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStatusColor } from '@/lib/utils';

interface UserDetailsCardProps {
  userId: string;
  onUserStatusChange?: (canBorrow: boolean, canReserve: boolean) => void;
}

interface UserDetails {
  id: string;
  full_name: string;
  email: string;
  barcode: string;
  matricule?: string;
  max_loans: number;
  max_reservations: number;
  is_active: boolean;
  user_type: string;
  current_loans: number;
  current_reservations: number;
  overdue_loans: number;
  can_borrow: boolean;
  can_reserve: boolean;
  loans_remaining: number;
  reservations_remaining: number;
  active_loans: Array<{
    id: string;
    document_type: string;
    document_title: string;
    document_author: string;
    due_date: string;
    status: string;
    days_overdue: number;
    effective_days_overdue: number;
  }>;
  active_reservations: Array<{
    id: string;
    document_type: string;
    document_title: string;
    document_author: string;
    priority_order: number;
    expiry_date: string;
    days_until_expiry: number;
  }>;
}

export function UserDetailsCard({ userId, onUserStatusChange }: UserDetailsCardProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoans, setShowLoans] = useState(false);
  const [showReservations, setShowReservations] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  useEffect(() => {
    if (userDetails && onUserStatusChange) {
      onUserStatusChange(userDetails.can_borrow, userDetails.can_reserve);
    }
  }, [userDetails, onUserStatusChange]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/users/${userId}/details`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des détails');
      }
      
      const data = await response.json();
      setUserDetails(data);
    } catch (error) {
      console.error('Erreur:', error);
      setError('Impossible de charger les détails de l\'utilisateur');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="text-sm text-gray-600">Chargement des détails...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !userDetails) {
    return (
      <Card className="w-full border-red-200 bg-red-50 dark:bg-red-800/90">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <span className="text-sm">{error || 'Utilisateur non trouvé'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUserStatusColor = () => {
    if (!userDetails.is_active) return getStatusColor('inactive', 'user');
    if (userDetails.overdue_loans > 0) return getStatusColor('overdue', 'user');
    if (!userDetails.can_borrow) return getStatusColor('limited', 'user');
    return getStatusColor('active', 'user');
  };

  const getStatusText = () => {
    if (!userDetails.is_active) return 'Inactif';
    if (userDetails.overdue_loans > 0) return 'Retards';
    if (!userDetails.can_borrow) return 'Limite atteinte';
    if (!userDetails.can_reserve) return 'Réservations pleines';
    return 'Actif';
  };

  const getStatusIcon = () => {
    if (!userDetails.is_active) return <XCircle className="h-4 w-4" />;
    if (userDetails.overdue_loans > 0) return <AlertTriangle className="h-4 w-4" />;
    if (!userDetails.can_borrow) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        {/* Informations de base */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                {userDetails.full_name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                {userDetails.email}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {userDetails.matricule || userDetails.barcode} • {userDetails.user_type}
              </p>
            </div>
          </div>
          
          <Badge className={`${getUserStatusColor()} flex items-center space-x-1`}>
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-2 gap-4">
          {/* Emprunts */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Emprunts
              </span>
              <Badge variant={userDetails.can_borrow ? "default" : "destructive"}>
                {userDetails.current_loans}/{userDetails.max_loans}
              </Badge>
            </div>
            {userDetails.overdue_loans > 0 && (
              <div className="flex items-center space-x-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs">{userDetails.overdue_loans} en retard</span>
              </div>
            )}
          </div>

          {/* Réservations */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Réservations
              </span>
              <Badge variant={userDetails.can_reserve ? "default" : "destructive"}>
                {userDetails.current_reservations}/{userDetails.max_reservations}
              </Badge>
            </div>
            <div className="text-xs text-gray-500">
              {userDetails.reservations_remaining} disponible{userDetails.reservations_remaining !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Détails des emprunts */}
        {userDetails.active_loans.length > 0 && (
          <div>
            <div className="w-full flex items-center justify-between p-2 h-auto bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Emprunts actifs ({userDetails.active_loans.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowLoans(!showLoans);
                }}
                className="h-6 w-6 p-0"
              >
                {showLoans ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            {showLoans && (
              <div className="space-y-2 mt-2">
                {userDetails.active_loans.map((loan) => (
                  <div key={loan.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium truncate">{loan.document_title}</div>
                    <div className="text-gray-600 dark:text-gray-400 truncate">{loan.document_author}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-500">Échéance: {new Date(loan.due_date).toLocaleDateString()}</span>
                      {loan.status === 'overdue' && (
                        <Badge variant="destructive" className="text-xs">
                          {loan.effective_days_overdue && loan.effective_days_overdue > 0
                            ? `${loan.effective_days_overdue}j retard`
                            : `Grâce (${loan.days_overdue}j)`
                          }
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Détails des réservations */}
        {userDetails.active_reservations.length > 0 && (
          <div>
            <div className="w-full flex items-center justify-between p-2 h-auto bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Réservations actives ({userDetails.active_reservations.length})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowReservations(!showReservations);
                }}
                className="h-6 w-6 p-0"
              >
                {showReservations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
            {showReservations && (
              <div className="space-y-2 mt-2">
                {userDetails.active_reservations.map((reservation) => (
                  <div key={reservation.id} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                    <div className="font-medium truncate">{reservation.document_title}</div>
                    <div className="text-gray-600 dark:text-gray-400 truncate">{reservation.document_author}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-gray-500">Priorité: #{reservation.priority_order}</span>
                      <span className="text-gray-500">
                        Expire dans {reservation.days_until_expiry}j
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages d'alerte */}
        {!userDetails.can_borrow && (
          <div className="p-2 bg-yellow-50 dark:bg-yellow-800/90 border border-yellow-200 dark:border-yellow-800 rounded">
            <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
              <Info className="h-4 w-4" />
              <span className="text-xs">
                {!userDetails.is_active ? 'Compte inactif' :
                 userDetails.overdue_loans > 0 ? 'Retours en retard' :
                 'Limite d\'emprunts atteinte'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
