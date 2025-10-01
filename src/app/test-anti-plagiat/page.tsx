'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  details?: any;
}

export default function TestAntiPlagiatPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const testUserId = '398aff3c-ce7a-4e0d-83ac-4f52ca0ffd4e';
    const testAcademicDocId = '4c93ca62-986c-41c3-abcc-6612281ef147';

    const testCases = [
      {
        name: 'Tentative d\'emprunt à domicile d\'une thèse',
        data: {
          user_id: testUserId,
          academic_document_id: testAcademicDocId,
          document_type: 'these',
          loan_type: 'loan',
          due_date: '2025-10-01'
        },
        shouldFail: true
      },
      {
        name: 'Tentative d\'emprunt à domicile d\'un mémoire',
        data: {
          user_id: testUserId,
          academic_document_id: testAcademicDocId,
          document_type: 'memoire',
          loan_type: 'loan',
          due_date: '2025-10-01'
        },
        shouldFail: true
      },
      {
        name: 'Tentative d\'emprunt à domicile d\'un rapport de stage',
        data: {
          user_id: testUserId,
          academic_document_id: testAcademicDocId,
          document_type: 'rapport_stage',
          loan_type: 'loan',
          due_date: '2025-10-01'
        },
        shouldFail: true
      },
      {
        name: 'Consultation sur place d\'une thèse (autorisé)',
        data: {
          user_id: testUserId,
          academic_document_id: testAcademicDocId,
          document_type: 'these',
          loan_type: 'reading_room',
          due_date: '2025-10-01'
        },
        shouldFail: false
      }
    ];

    const newResults: TestResult[] = [];

    for (const testCase of testCases) {
      try {
        const response = await fetch('/api/loans', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase.data),
        });

        const result = await response.json();

        if (testCase.shouldFail) {
          if (!response.ok && result.error?.code === 'HOME_LOAN_NOT_ALLOWED') {
            newResults.push({
              name: testCase.name,
              success: true,
              message: '✅ Protection anti-plagiat activée',
              details: result.error.message
            });
          } else {
            newResults.push({
              name: testCase.name,
              success: false,
              message: '❌ La protection anti-plagiat n\'a pas fonctionné',
              details: result
            });
          }
        } else {
          if (response.ok) {
            newResults.push({
              name: testCase.name,
              success: true,
              message: '✅ Consultation sur place autorisée',
              details: `ID emprunt: ${result.data?.id}`
            });

            // Nettoyer: supprimer l'emprunt de test
            if (result.data?.id) {
              await fetch(`/api/loans/${result.data.id}`, {
                method: 'DELETE'
              });
            }
          } else {
            newResults.push({
              name: testCase.name,
              success: false,
              message: '❌ La consultation sur place devrait être autorisée',
              details: result
            });
          }
        }
      } catch (error) {
        newResults.push({
          name: testCase.name,
          success: false,
          message: '❌ Erreur lors du test',
          details: error instanceof Error ? error.message : 'Erreur inconnue'
        });
      }
    }

    setResults(newResults);
    setIsRunning(false);
  };

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>🔒 Test de Protection Anti-Plagiat</CardTitle>
          <CardDescription>
            Vérification que les thèses, mémoires et rapports de stage ne peuvent être empruntés à domicile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runTests} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? 'Tests en cours...' : 'Lancer les tests'}
            </Button>

            {results.length > 0 && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  successCount === totalCount 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <h3 className="font-semibold">
                    📊 Résultats: {successCount}/{totalCount} tests réussis
                  </h3>
                  {successCount === totalCount ? (
                    <p className="text-green-700">
                      🎉 TOUS LES TESTS SONT PASSÉS! La protection anti-plagiat fonctionne correctement.
                    </p>
                  ) : (
                    <p className="text-red-700">
                      ⚠️ CERTAINS TESTS ONT ÉCHOUÉ. Vérifiez la configuration.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  {results.map((result, index) => (
                    <Card key={index} className={
                      result.success 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }>
                      <CardContent className="p-4">
                        <h4 className="font-medium">{result.name}</h4>
                        <p className="text-sm">{result.message}</p>
                        {result.details && (
                          <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                            {typeof result.details === 'string' 
                              ? result.details 
                              : JSON.stringify(result.details, null, 2)
                            }
                          </pre>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
