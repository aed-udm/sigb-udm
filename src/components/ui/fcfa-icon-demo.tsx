"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FcfaIcon } from "./fcfa-icon";

export const FcfaIconDemo: React.FC = () => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FcfaIcon className="h-6 w-6 text-green-600" />
          Démonstration Icône FCFA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <FcfaIcon className="h-4 w-4 text-gray-600 mx-auto mb-1" />
            <p className="text-xs">Petite</p>
          </div>
          <div className="text-center">
            <FcfaIcon className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-xs">Moyenne</p>
          </div>
          <div className="text-center">
            <FcfaIcon className="h-8 w-8 text-blue-600 mx-auto mb-1" />
            <p className="text-xs">Grande</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FcfaIcon className="h-4 w-4 text-red-600" />
            <span className="text-sm">Pénalité: 5,000 FCFA</span>
          </div>
          <div className="flex items-center gap-2">
            <FcfaIcon className="h-4 w-4 text-green-600" />
            <span className="text-sm">Paiement: 10,000 FCFA</span>
          </div>
          <div className="flex items-center gap-2">
            <FcfaIcon className="h-4 w-4 text-blue-600" />
            <span className="text-sm">Prix: 25,000 FCFA</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FcfaIconDemo;
