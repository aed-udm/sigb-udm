"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FcfaIcon } from "@/components/ui/fcfa-icon";
import { FcfaIconV2 } from "@/components/ui/fcfa-icon-v2";
import { DollarSign } from "lucide-react";

export default function TestFcfaPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold text-center">Test de l'Icône FCFA</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Test des tailles */}
        <Card>
          <CardHeader>
            <CardTitle>Test des Tailles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-4 w-4 text-green-600" />
              <span>Petite (h-4 w-4)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-6 w-6 text-green-600" />
              <span>Moyenne (h-6 w-6)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-8 w-8 text-green-600" />
              <span>Grande (h-8 w-8)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-12 w-12 text-green-600" />
              <span>Très grande (h-12 w-12)</span>
            </div>
          </CardContent>
        </Card>

        {/* Test des couleurs */}
        <Card>
          <CardHeader>
            <CardTitle>Test des Couleurs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-6 w-6 text-green-600" />
              <span>Vert (text-green-600)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-6 w-6 text-blue-600" />
              <span>Bleu (text-blue-600)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-6 w-6 text-red-600" />
              <span>Rouge (text-red-600)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-6 w-6 text-gray-600" />
              <span>Gris (text-gray-600)</span>
            </div>
          </CardContent>
        </Card>

        {/* Comparaison avec DollarSign */}
        <Card>
          <CardHeader>
            <CardTitle>Comparaison des Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <DollarSign className="h-6 w-6 text-gray-400" />
              <span>Ancienne icône Dollar (pour comparaison)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIcon className="h-6 w-6 text-green-600" />
              <span>FCFA Version 1 (actuelle)</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIconV2 className="h-6 w-6 text-green-600" variant="default" />
              <span>FCFA Version 2 - Default</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIconV2 className="h-6 w-6 text-green-600" variant="filled" />
              <span>FCFA Version 2 - Filled</span>
            </div>
            <div className="flex items-center gap-4">
              <FcfaIconV2 className="h-6 w-6 text-green-600" variant="outline" />
              <span>FCFA Version 2 - Outline</span>
            </div>
          </CardContent>
        </Card>

        {/* Test en contexte */}
        <Card>
          <CardHeader>
            <CardTitle>Test en Contexte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Pénalité de retard:</span>
              <div className="flex items-center gap-2">
                <FcfaIcon className="h-4 w-4 text-red-600" />
                <span className="font-semibold">5,000 FCFA</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Montant payé:</span>
              <div className="flex items-center gap-2">
                <FcfaIcon className="h-4 w-4 text-green-600" />
                <span className="font-semibold">10,000 FCFA</span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <span>Prix du livre:</span>
              <div className="flex items-center gap-2">
                <FcfaIcon className="h-4 w-4 text-blue-600" />
                <span className="font-semibold">25,000 FCFA</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
