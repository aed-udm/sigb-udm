"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/use-settings";
import { motion } from 'framer-motion';
import { Users, Save, ArrowLeft, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import ProtectedLayout from "@/components/layout/protected-layout";
import { useToast } from "@/hooks/use-toast";
import { userSchema, type UserFormData } from "@/lib/validations";
import { generateCameroonBarcode, formatCameroonPhone } from "@/lib/utils";

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { settings, isLoading: settingsLoading } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<UserFormData>>({
    email: "",
    full_name: "",
    barcode: generateCameroonBarcode('user'),
    matricule: "",
    phone: "",
    address: "",
    is_active: true,
    max_loans: 0, // Sera initialisé avec les paramètres système
    max_reservations: 0, // Sera initialisé avec les paramètres système
    // Nouveaux champs pour les filtres avancés
    faculty: "",
    user_category: "student",
    study_level: undefined,
    department: "",
    account_status: "active",
    institution: "Université des Montagnes",
  });

  const [showPrintCard, setShowPrintCard] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

  // Initialiser les valeurs par défaut avec les paramètres système
  useEffect(() => {
    if (!settingsLoading && settings) {
      setFormData(prev => ({
        ...prev,
        max_loans: settings.general.max_loans_per_user,
        max_reservations: settings.general.max_reservations_per_user,
      }));
    }
  }, [settings, settingsLoading]);

  const handleInputChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation avec Zod
      const validatedData = userSchema.parse(formData);

      // Envoi à l'API
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      if (response.ok) {
        const data = await response.json();
        const newUserId = data.data.id;


        toast({
          title: "Utilisateur ajouté avec succès",
          description: `${validatedData.full_name} a été ajouté avec le code-barres ${validatedData.barcode}`,
        });

        // Sauvegarder l'ID de l'utilisateur créé et proposer l'impression de carte
        setCreatedUserId(newUserId);
        setShowPrintCard(true);

        // Redirection après 5 secondes si l'utilisateur ne fait rien
        setTimeout(() => {
          if (showPrintCard) {
            setShowPrintCard(false);
            router.push(`/users/${newUserId}?refresh=${Date.now()}`);
          }
        }, 5000);
      } else {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error?.message || "Erreur lors de l'ajout de l'utilisateur",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      if (error.name === 'ZodError') {
        toast({
          title: "Erreur de validation",
          description: error.errors?.[0]?.message || "Veuillez vérifier les données saisies",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erreur",
          description: "Erreur lors de l'ajout de l'utilisateur",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 relative overflow-hidden">
        {/* Header professionnel avec glassmorphism */}
        <motion.div
          className="glass-nav shadow-lg border-b border-white/20 dark:border-gray-700/20 relative overflow-hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Effet glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-gray-500/5" />

          <div className="relative z-10 container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/users">
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
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 drop-shadow-lg" />
                  </motion.div>
                  <div>
                    <motion.h1
                      className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-800 via-green-600 to-slate-800 dark:from-slate-200 dark:via-green-400 dark:to-slate-200 bg-clip-text text-transparent"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      Ajouter un Usager
                    </motion.h1>
                    <motion.p
                      className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1 font-medium"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    >
                      Créer un nouveau compte utilisateur
                    </motion.p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-7 lg:py-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-full mx-4 lg:mx-8">
              <CardHeader className="pb-8">
                <CardTitle className="text-2xl">Informations de l'Usager</CardTitle>
                <CardDescription className="text-base">
                  Remplissez tous les champs requis pour créer le compte utilisateur
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 lg:px-12 pb-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Informations personnelles */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Informations Personnelles
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="full_name" className="text-base font-medium">Nom complet <span className="text-red-500">*</span></Label>
                        <Input
                          id="full_name"
                          value={formData.full_name}
                          onChange={(e) => handleInputChange("full_name", e.target.value)}
                          placeholder="Prénom Nom"
                          className="h-12 text-base"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-base font-medium">Adresse email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          placeholder="utilisateur@example.com"
                          className="h-12 text-base"
                        />
                      </div>

                      <div>
                        <Label htmlFor="matricule" className="text-base font-medium">Matricule étudiant <span className="text-red-500">*</span></Label>
                        <Input
                          id="matricule"
                          value={formData.matricule}
                          onChange={(e) => handleInputChange("matricule", e.target.value.toUpperCase())}
                          placeholder="UDM2024001"
                          className="h-12 text-base font-mono"
                          maxLength={20}
                          required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Matricule unique de l'étudiant (6-20 caractères alphanumériques)
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <Label htmlFor="phone" className="text-base font-medium">Téléphone <span className="text-red-500">*</span></Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                          placeholder="+237 6XX XX XX XX"
                          className="h-12 text-base"
                          required
                        />
                      </div>
                      <div>
                        <Combobox
                          label="Limite d'emprunts"
                          placeholder="Sélectionner une limite..."
                          value={`${formData.max_loans || 3} emprunt${(formData.max_loans || 3) > 1 ? 's' : ''}`}
                          onValueChange={(value) => {
                            // Extraire le nombre de la chaîne (ex: "3 emprunts" -> 3)
                            const number = parseInt(value.split(' ')[0]);
                            handleInputChange("max_loans", number);
                          }}
                          options={[
                            "1 emprunt",
                            "2 emprunts",
                            "3 emprunts",
                            "4 emprunts",
                            "5 emprunts",
                            "10 emprunts"
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>
                      <div>
                        <Combobox
                          label="Limite de réservations"
                          placeholder="Sélectionner une limite..."
                          value={`${formData.max_reservations || 3} réservation${(formData.max_reservations || 3) > 1 ? 's' : ''}`}
                          onValueChange={(value) => {
                            // Extraire le nombre de la chaîne (ex: "3 réservations" -> 3)
                            const number = parseInt(value.split(' ')[0]);
                            handleInputChange("max_reservations", number);
                          }}
                          options={[
                            "1 réservation",
                            "2 réservations",
                            "3 réservations",
                            "4 réservations",
                            "5 réservations",
                            "10 réservations"
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="address" className="text-base font-medium">Adresse complète</Label>
                      <textarea
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        placeholder="Adresse complète..."
                        className="w-full h-32 px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-base"
                      />
                    </div>
                  </div>

                  {/* Informations académiques */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Informations Académiques
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <Combobox
                          label="Catégorie d'utilisateur"
                          placeholder="Sélectionner une catégorie..."
                          value={formData.user_category || ""}
                          onValueChange={(value) => handleInputChange("user_category", value)}
                          options={[
                            { value: "student", label: "Étudiant" },
                            { value: "teacher", label: "Enseignant" },
                            { value: "researcher", label: "Chercheur" },
                            { value: "staff", label: "Personnel" },
                            { value: "external", label: "Externe" },
                            { value: "guest", label: "Invité" },
                            { value: "alumni", label: "Alumni" },
                            { value: "visitor", label: "Visiteur" }
                          ]}
                          allowCustom={false}
                          required={true}
                        />
                      </div>

                      <div>
                        <Combobox
                          label="Niveau d'études"
                          placeholder="Sélectionner un niveau..."
                          value={formData.study_level || ""}
                          onValueChange={(value) => handleInputChange("study_level", value)}
                          options={[
                            { value: "L1", label: "Licence 1" },
                            { value: "L2", label: "Licence 2" },
                            { value: "L3", label: "Licence 3" },
                            { value: "M1", label: "Master 1" },
                            { value: "M2", label: "Master 2" },
                            { value: "PhD", label: "Doctorat" },
                            { value: "PostDoc", label: "Post-Doctorat" },
                            { value: "Professor", label: "Professeur" },
                            { value: "Researcher", label: "Chercheur" },
                            { value: "Staff", label: "Personnel" },
                            { value: "Other", label: "Autre" }
                          ]}
                          allowCustom={false}
                          required={false}
                        />
                      </div>

                      <div>
                        <Label htmlFor="faculty" className="text-base font-medium">Faculté</Label>
                        <Input
                          id="faculty"
                          value={formData.faculty}
                          onChange={(e) => handleInputChange("faculty", e.target.value)}
                          placeholder="Ex: Faculté des Sciences"
                          className="h-12 text-base"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="department" className="text-base font-medium">Département</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleInputChange("department", e.target.value)}
                          placeholder="Ex: Informatique"
                          className="h-12 text-base"
                        />
                      </div>

                      <div>
                        <Label htmlFor="institution" className="text-base font-medium">Institution</Label>
                        <Input
                          id="institution"
                          value={formData.institution}
                          onChange={(e) => handleInputChange("institution", e.target.value)}
                          placeholder="Université des Montagnes"
                          className="h-12 text-base"
                        />
                      </div>
                    </div>
                  </div>


                  {/* Code-barres */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-3">
                      Identification
                    </h3>

                    <div>
                      <Label htmlFor="barcode" className="text-base font-medium">Code-barres unique <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                        <Input
                          id="barcode"
                          value={formData.barcode}
                          placeholder="Code-barres généré automatiquement"
                          className="pl-12 h-12 text-base bg-gray-100 dark:bg-gray-800"
                          disabled
                          readOnly
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        Format camerounais: BIB + année + mois + numéro séquentiel
                      </p>
                    </div>
                  </div>

                  {/* Statut du compte */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Statut du Compte
                    </h3>
                    
                    <div className="flex items-center space-x-3">
                      <input
                        id="is_active"
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange("is_active", e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <Label htmlFor="is_active" className="text-sm">
                        Compte actif (l'utilisateur peut emprunter des livres)
                      </Label>
                    </div>
                  </div>

                  {/* Aperçu du compte */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Aperçu du compte
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                      <p><strong>Nom:</strong> {formData.full_name || "Non renseigné"}</p>
                      <p><strong>Email:</strong> {formData.email || "Non renseigné"}</p>
                      <p><strong>Code-barres:</strong> {formData.barcode}</p>
                      <p><strong>Limite d'emprunts:</strong> {formData.max_loans} emprunt(s)</p>
                      <p><strong>Limite de réservations:</strong> {formData.max_reservations} réservation(s)</p>
                      <p><strong>Statut:</strong> {formData.is_active ? "Actif" : "Inactif"}</p>
                    </div>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex justify-end space-x-4 pt-6">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/users">Annuler</Link>
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Création...</span>
                        </div>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Créer l'utilisateur
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Modal d'impression de carte */}
        {showPrintCard && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Utilisateur créé avec succès !
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  Voulez-vous imprimer la carte de bibliothèque maintenant ?
                </p>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPrintCard(false);
                      router.push(`/users/${createdUserId}?refresh=${Date.now()}`);
                    }}
                    className="flex-1"
                  >
                    Voir l'utilisateur
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        // Récupérer les données de carte depuis l'API
                        const response = await fetch(`/api/users/${createdUserId}/print-card`);
                        if (response.ok) {
                          const cardData = await response.json();

                          // Ouvrir une nouvelle fenêtre pour l'impression avec charte UdM
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Carte de Bibliothèque - ${cardData.data.user.full_name}</title>
                                  <style>
                                    body {
                                      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                      margin: 20px;
                                      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                                    }
                                    .card {
                                      border: 3px solid #16a34a;
                                      padding: 25px;
                                      max-width: 420px;
                                      background: white;
                                      border-radius: 12px;
                                      box-shadow: 0 8px 25px rgba(22, 163, 74, 0.15);
                                      position: relative;
                                      overflow: hidden;
                                    }
                                    .card::before {
                                      content: '';
                                      position: absolute;
                                      top: 0;
                                      left: 0;
                                      right: 0;
                                      height: 6px;
                                      background: linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%);
                                    }
                                    .header {
                                      text-align: center;
                                      border-bottom: 2px solid #22c55e;
                                      padding-bottom: 15px;
                                      margin-bottom: 20px;
                                      margin-top: 10px;
                                    }
                                    .header h2 {
                                      color: #15803d;
                                      font-size: 20px;
                                      font-weight: bold;
                                      margin: 0 0 8px 0;
                                      text-transform: uppercase;
                                      letter-spacing: 1px;
                                    }
                                    .header p {
                                      color: #64748b;
                                      font-size: 14px;
                                      margin: 0;
                                      font-weight: 500;
                                    }
                                    .info {
                                      margin: 12px 0;
                                      padding: 8px 12px;
                                      background: #f8fafc;
                                      border-left: 4px solid #22c55e;
                                      border-radius: 4px;
                                    }
                                    .info strong {
                                      color: #15803d;
                                      font-weight: 600;
                                    }
                                    .barcode {
                                      font-family: 'Courier New', monospace;
                                      font-size: 20px;
                                      text-align: center;
                                      margin: 20px 0;
                                      padding: 15px;
                                      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                                      color: white;
                                      border-radius: 8px;
                                      font-weight: bold;
                                      letter-spacing: 2px;
                                    }
                                    .rules {
                                      font-size: 11px;
                                      margin-top: 25px;
                                      padding: 15px;
                                      background: #f1f5f9;
                                      border-radius: 8px;
                                      border: 1px solid #e2e8f0;
                                    }
                                    .rules strong {
                                      color: #334155;
                                      font-size: 12px;
                                    }
                                    .footer {
                                      text-align: center;
                                      margin-top: 20px;
                                      padding-top: 15px;
                                      border-top: 1px solid #e2e8f0;
                                      color: #64748b;
                                      font-size: 10px;
                                    }
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
                                      <strong>Règles de la bibliothèque:</strong><br>
                                      ${cardData.data.rules.map((rule: string) => `• ${rule}`).join('<br>')}
                                    </div>
                                    <div class="footer">
                                      Bibliothèque Universitaire - UdM © ${new Date().getFullYear()}
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

                      setShowPrintCard(false);
                      router.push(`/users/${createdUserId}?refresh=${Date.now()}`);
                    }}
                    className="flex-1"
                  >
                    Imprimer la carte
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
