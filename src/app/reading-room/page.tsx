"use client";

import { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { BookOpen, Clock, MapPin, User, Calendar, CheckCircle, XCircle, Eye, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedLayout from "@/components/layout/protected-layout";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/hooks/use-toast";

interface ReadingRoomConsultation {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_barcode: string;
  document_type: 'book' | 'these' | 'memoire' | 'rapport_stage';
  document_title: string;
  document_author: string;
  document_mfn?: string;
  consultation_date: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'cancelled';
  reading_location: string;
  notes?: string;
  created_at: string;
}

export default function ReadingRoomPage() {
  const { toast } = useToast();
  const [consultations, setConsultations] = useState<ReadingRoomConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Charger les consultations
  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await fetch(`/api/reading-room?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.data || []);
      } else {
        throw new Error('Erreur lors du chargement');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les consultations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultations();
  }, [filter]);

  // Terminer une consultation
  const handleCompleteConsultation = async (consultationId: string) => {
    try {
      setCompletingId(consultationId);
      
      const response = await fetch(`/api/reading-room/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' })
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "✅ Consultation terminée",
          description: `Durée: ${data.data.duration_minutes} minutes`,
        });
        
        // Recharger les consultations
        await fetchConsultations();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la finalisation');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la finalisation",
        variant: "destructive",
      });
    } finally {
      setCompletingId(null);
    }
  };

  // Calculer la durée d'une consultation active
  const calculateDuration = (startTime: string) => {
    const start = new Date(`1970-01-01T${startTime}`);
    const now = new Date();
    const current = new Date(`1970-01-01T${now.toTimeString().split(' ')[0]}`);
    const diffMinutes = Math.round((current.getTime() - start.getTime()) / (1000 * 60));
    return diffMinutes > 0 ? diffMinutes : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">En cours</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Terminée</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Annulée</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'book': return 'Livre';
      case 'these': return 'Thèse';
      case 'memoire': return 'Mémoire';
      case 'rapport_stage': return 'Rapport de stage';
      default: return type;
    }
  };

  return (
    <ProtectedLayout>
      <div className="container mx-auto px-4 py-8">
        <PageHeader
          title="Salle de Lecture"
          description="Gestion des consultations sur place"
          icon={BookOpen}
        />

        {/* Filtres et actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex space-x-2">
            <Button
              variant={filter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('active')}
            >
              En cours ({consultations.filter(c => c.status === 'active').length})
            </Button>
            <Button
              variant={filter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Terminées
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Toutes
            </Button>
          </div>

          <Button asChild className="bg-gradient-to-r from-slate-800 to-green-600 hover:from-slate-900 hover:to-green-700">
            <Link href="/loans/new" className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle consultation
            </Link>
          </Button>
        </div>

        {/* Liste des consultations */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : consultations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Aucune consultation
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {filter === 'active' ? 'Aucune consultation en cours' : 'Aucune consultation trouvée'}
              </p>
              <Button asChild>
                <Link href="/loans/new">Démarrer une consultation</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {consultations.map((consultation) => (
              <motion.div
                key={consultation.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
              >
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Informations principales */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                              {consultation.document_title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                              {consultation.document_author} • {getDocumentTypeLabel(consultation.document_type)}
                              {consultation.document_mfn && ` • ${consultation.document_mfn}`}
                            </p>
                          </div>
                          {getStatusBadge(consultation.status)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span>{consultation.user_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>{new Date(consultation.consultation_date).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>
                              {consultation.start_time}
                              {consultation.end_time ? ` - ${consultation.end_time}` : 
                               consultation.status === 'active' ? ` (${calculateDuration(consultation.start_time)} min)` : ''}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span>{consultation.reading_location}</span>
                          </div>
                        </div>

                        {consultation.notes && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <strong>Notes:</strong> {consultation.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {consultation.status === 'active' && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleCompleteConsultation(consultation.id)}
                            disabled={completingId === consultation.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {completingId === consultation.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Terminer
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
