"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, CreditCard } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DarkModeButton } from "@/components/ui/dark-mode-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  full_name: string;
  email: string;
  matricule?: string;
  phone?: string;
  address?: string;
  barcode: string;
  max_loans: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Champs pour le PDF académique
  academic_documents_pdf_path?: string;
  academic_pdf_file_type?: string;
  academic_pdf_file_size?: number;
  academic_pdf_uploaded_at?: string;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Données du formulaire
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    matricule: "",
    phone: "",
    address: "",
    barcode: "",
    max_loans: 3,
    is_active: true,
  });


  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${params.id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Utilisateur non trouvé');
          } else if (response.status === 403) {
            throw new Error('Accès non autorisé');
          } else if (response.status >= 500) {
            throw new Error('Erreur serveur - Veuillez réessayer plus tard');
          } else {
            throw new Error(`Erreur ${response.status} - Impossible de charger l'utilisateur`);
          }
        }

        const data = await response.json();
        const userData = data.data;
        setUser(userData);
        
        // Remplir le formulaire avec les données existantes
        setFormData({
          full_name: userData.full_name || "",
          email: userData.email || "",
          matricule: userData.matricule || "",
          phone: userData.phone || "",
          address: userData.address || "",
          barcode: userData.barcode || "",
          max_loans: userData.max_loans || 3,
          is_active: userData.is_active !== undefined ? userData.is_active : true,
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMessage);

        // Messages d'erreur plus spécifiques
        let userFriendlyMessage = "Impossible de charger les informations de l'utilisateur";
        if (errorMessage.includes('fetch')) {
          userFriendlyMessage = "Problème de connexion au serveur. Vérifiez votre connexion internet.";
        } else if (errorMessage.includes('404') || errorMessage.includes('non trouvé')) {
          userFriendlyMessage = "Cet utilisateur n'existe pas ou a été supprimé.";
        } else if (errorMessage.includes('403') || errorMessage.includes('unauthorized')) {
          userFriendlyMessage = "Vous n'avez pas les permissions pour modifier cet utilisateur.";
        }

        toast({
          title: "Erreur de chargement",
          description: userFriendlyMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchUser();
    }
  }, [params.id, toast]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStatusChange = (value: string) => {
    const isActive = value === "Actif";
    console.log('Changement de statut:', value, '-> booléen:', isActive);
    setFormData(prev => ({
      ...prev,
      is_active: isActive
    }));
  };

  // Validation du format téléphone camerounais
  const validatePhoneFormat = (phone: string): boolean => {
    if (!phone) return true; // Téléphone optionnel
    // Format camerounais: +237 6XX XXX XXX (uniquement des chiffres)
    return /^(\+237|237)?[6-9]\d{8}$/.test(phone.replace(/\s/g, ''));
  };

  const isPhoneValid = validatePhoneFormat(formData.phone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation côté client avant envoi
    if (!isPhoneValid) {
      toast({
        title: "Erreur de validation",
        description: "Le format du numéro de téléphone n'est pas valide. Utilisez le format camerounais : +237 6XX XXX XXX",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // S'assurer que is_active est bien un booléen
      const dataToSend = {
        ...formData,
        is_active: Boolean(formData.is_active)
      };

      console.log('Données à envoyer:', dataToSend);
      const response = await fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Utilisateur mis à jour avec succès",
        });

        // Forcer le rafraîchissement de la page de détails
        router.push(`/users/${params.id}?refresh=${Date.now()}`);
      } else {
        const errorData = await response.json();
        let errorMessage = 'Erreur lors de la mise à jour';

        if (response.status === 422 && errorData.error?.message) {
          errorMessage = errorData.error.message;

          // Si c'est une erreur de validation avec des détails, essayons de les analyser
          if (errorData.error.details && Array.isArray(errorData.error.details)) {
            const validationErrors = errorData.error.details;
            const phoneError = validationErrors.find((err: any) =>
              err.path && err.path.includes('phone')
            );

            if (phoneError) {
              errorMessage = "Format de téléphone invalide. Utilisez le format camerounais : +237 6XX XXX XXX (uniquement des chiffres après +237)";
            } else {
              // Autres erreurs de validation
              const fieldErrors = validationErrors.map((err: any) => {
                if (err.path && err.message) {
                  return `${err.path.join('.')}: ${err.message}`;
                }
                return err.message || 'Erreur de validation';
              }).join(', ');

              if (fieldErrors) {
                errorMessage = `Données invalides: ${fieldErrors}`;
              }
            }
          }
        } else if (response.status === 409) {
          errorMessage = 'Conflit de données - Email ou code-barres déjà utilisé';
        } else if (response.status === 403) {
          errorMessage = 'Accès non autorisé pour cette modification';
        } else if (response.status === 404) {
          errorMessage = 'Utilisateur non trouvé';
        } else if (response.status >= 500) {
          errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
        }

        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);

      // Messages d'erreur plus spécifiques pour la sauvegarde
      let userFriendlyMessage = "Erreur lors de la mise à jour de l'utilisateur";

      if (error.message) {
        if (error.message.includes('fetch')) {
          userFriendlyMessage = "Problème de connexion au serveur. Vérifiez votre connexion internet.";
        } else if (error.message.includes('email') && error.message.includes('existe')) {
          userFriendlyMessage = "Cette adresse email est déjà utilisée par un autre utilisateur.";
        } else if (error.message.includes('barcode') && error.message.includes('existe')) {
          userFriendlyMessage = "Ce code-barres est déjà utilisé par un autre utilisateur.";
        } else if (error.message.includes('Données invalides')) {
          // Essayer de récupérer les détails de validation depuis la réponse
          userFriendlyMessage = "Données invalides. Vérifiez le format du numéro de téléphone (+237 6XX XXX XXX).";
        } else if (error.message.includes('validation')) {
          userFriendlyMessage = "Certaines informations saisies ne sont pas valides. Vérifiez vos données.";
        } else if (error.message.includes('403') || error.message.includes('unauthorized')) {
          userFriendlyMessage = "Vous n'avez pas les permissions pour modifier cet utilisateur.";
        } else if (error.message.includes('404')) {
          userFriendlyMessage = "Cet utilisateur n'existe plus dans le système.";
        } else {
          userFriendlyMessage = error.message;
        }
      }

      toast({
        title: "Erreur de sauvegarde",
        description: userFriendlyMessage,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour imprimer la carte
  const handlePrintCard = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users/${user.id}/print-card`);
      if (response.ok) {
        const cardData = await response.json();

        // Ouvrir une nouvelle fenêtre pour l'impression
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Carte de Bibliothèque - ${cardData.data.user.full_name}</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  .card { border: 2px solid #000; padding: 20px; max-width: 400px; }
                  .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                  .info { margin: 10px 0; }
                  .barcode { font-family: monospace; font-size: 18px; text-align: center; margin: 15px 0; }
                  .rules { font-size: 12px; margin-top: 20px; }
                </style>
              </head>
              <body>
                <div class="card">
                  <div class="header">
                    <h2>CARTE DE BIBLIOTHÈQUE</h2>
                    <p>Université des Montagnes</p>
                  </div>
                  <div class="info"><strong>Nom:</strong> ${cardData.data.user.full_name}</div>
                  <div class="info"><strong>Email:</strong> ${cardData.data.user.email}</div>
                  ${cardData.data.user.matricule ? `<div class="info"><strong>Matricule:</strong> ${cardData.data.user.matricule}</div>` : ''}
                  <div class="info"><strong>Code-barres:</strong> ${cardData.data.user.barcode}</div>
                  <div class="info"><strong>Limite d'emprunts:</strong> ${cardData.data.user.max_loans}</div>
                  <div class="info"><strong>Valide jusqu'au:</strong> ${cardData.data.card.valid_until}</div>
                  <div class="rules">
                    <strong>Règles:</strong><br>
                    ${cardData.data.rules.map((rule: string) => `• ${rule}`).join('<br>')}
                  </div>
                </div>
                <script>window.print(); window.close();</script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }

        toast({
          title: "Carte envoyée à l'impression",
          description: "La carte de bibliothèque a été envoyée à l'imprimante",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur d'impression",
        description: "Impossible d'imprimer la carte",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <motion.div
            className="flex items-center justify-center py-12"
            initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-4"
              >
                <User className="h-12 w-12 text-green-600 mx-auto" />
              </motion.div>
              <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                Chargement de l'utilisateur...
              </span>
            </div>
          </motion.div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !user) {
    return (
      <ProtectedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Utilisateur non trouvé'}</p>
            <Button asChild variant="outline">
              <Link href="/users">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste
              </Link>
            </Button>
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-blue-500/5" />

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/users/${user.id}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Link>
                </Button>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <motion.div
                    animate={{
                      rotateY: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="relative flex-shrink-0"
                  >
                    <User className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Modifier l'Utilisateur
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Mettre à jour les informations de l'utilisateur
                    </motion.p>
                  </div>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <DarkModeButton asChild variant="outline" buttonType="nav">
                  <Link href={`/users/${user.id}`}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Annuler
                  </Link>
                </DarkModeButton>
              </motion.div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-4 py-8">

        {/* Formulaire */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="max-w-full mx-4 lg:mx-8">
            <CardHeader>
              <CardTitle>Informations de l'Utilisateur</CardTitle>
              <CardDescription>
                Modifiez les informations de l'utilisateur dans le système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informations principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="full_name">Nom complet <span className="text-red-500">*</span></Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => handleInputChange("full_name", e.target.value)}
                      placeholder="Nom complet de l'utilisateur"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="Adresse email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="matricule">Matricule étudiant</Label>
                    <Input
                      id="matricule"
                      value={formData.matricule}
                      onChange={(e) => handleInputChange("matricule", e.target.value.toUpperCase())}
                      placeholder="UDM2024001"
                      className="font-mono"
                      maxLength={20}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Matricule unique de l'étudiant (6-20 caractères alphanumériques)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="barcode">Code-barres <span className="text-red-500">*</span></Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      placeholder="Code-barres généré automatiquement"
                      disabled
                      className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Le code-barres est généré automatiquement et ne peut pas être modifié
                    </p>
                  </div>
                </div>

                {/* Contact et paramètres */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+237 6XX XXX XXX"
                      className={!isPhoneValid ? "border-red-500 focus:border-red-500" : ""}
                    />
                    {!isPhoneValid && formData.phone && (
                      <p className="text-xs text-red-500 mt-1">
                        Format invalide. Utilisez : +237 6XX XXX XXX (uniquement des chiffres)
                      </p>
                    )}
                    {(!formData.phone || isPhoneValid) && (
                      <p className="text-xs text-gray-500 mt-1">
                        Format camerounais : +237 6XX XXX XXX
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="max_loans">Nombre maximum d'emprunts</Label>
                    <Input
                      id="max_loans"
                      type="number"
                      value={formData.max_loans}
                      onChange={(e) => handleInputChange("max_loans", parseInt(e.target.value))}
                      min="1"
                      max="10"
                    />
                  </div>
                  <div>
                    <Combobox
                      label="Statut"
                      placeholder="Sélectionner un statut..."
                      value={formData.is_active ? "Actif" : "Inactif"}
                      onValueChange={handleStatusChange}
                      options={[
                        "Actif",
                        "Inactif"
                      ]}
                      allowCustom={false}
                      required={true}
                    />
                  </div>
                </div>

                {/* Adresse complète */}
                <div>
                  <Label htmlFor="address">Adresse complète</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Adresse complète de l'utilisateur"
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Section informative */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formData.max_loans}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-white">
                      Emprunts maximum autorisés
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formData.is_active ? 'ACTIF' : 'INACTIF'}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-white">
                      Statut du compte
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {formData.barcode}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 dark:text-white">
                      Code-barres unique
                    </div>
                  </div>
                </div>

                {/* Section Impression de Carte */}
                <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/90 rounded-lg border border-gray-200 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Carte de Bibliothèque
                  </h3>

                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Imprimez une nouvelle carte de bibliothèque pour cet utilisateur avec toutes les informations à jour.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrintCard}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900/30"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Imprimer la carte
                  </Button>
                </div>

                {/* Boutons d'action */}
                <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    * Champs obligatoires
                  </div>
                  <div className="flex space-x-3">
                    <DarkModeButton asChild variant="outline" size="lg" buttonType="nav">
                      <Link href={`/users/${user.id}`}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Annuler
                      </Link>
                    </DarkModeButton>
                    <Button
                      type="submit"
                      disabled={saving || !isPhoneValid}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Save className="h-4 w-4" />
                          </motion.div>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Enregistrer les modifications
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
