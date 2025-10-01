/**
 * Script de test pour la protection anti-plagiat
 * Vérifie que les thèses, mémoires et rapports de stage ne peuvent être empruntés à domicile
 */

const testAntiPlagiarismProtection = async () => {
  console.log('🔒 Test de la protection anti-plagiat...\n');

  const baseUrl = 'http://localhost:3000';
  
  // Données de test
  const testUserId = '398aff3c-ce7a-4e0d-83ac-4f52ca0ffd4e'; // ID utilisateur existant
  const testAcademicDocId = '4c93ca62-986c-41c3-abcc-6612281ef147'; // ID document académique existant
  
  const testCases = [
    {
      name: 'Tentative d\'emprunt à domicile d\'une thèse',
      data: {
        user_id: testUserId,
        academic_document_id: testAcademicDocId,
        document_type: 'these',
        loan_type: 'loan', // Emprunt à domicile (interdit)
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
        loan_type: 'loan', // Emprunt à domicile (interdit)
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
        loan_type: 'loan', // Emprunt à domicile (interdit)
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
        loan_type: 'reading_room', // Lecture sur place (autorisé)
        due_date: '2025-10-01'
      },
      shouldFail: false
    },
    {
      name: 'Consultation sur place d\'un mémoire (autorisé)',
      data: {
        user_id: testUserId,
        academic_document_id: testAcademicDocId,
        document_type: 'memoire',
        loan_type: 'reading_room', // Lecture sur place (autorisé)
        due_date: '2025-10-01'
      },
      shouldFail: false
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    
    try {
      const response = await fetch(`${baseUrl}/api/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data),
      });

      const result = await response.json();

      if (testCase.shouldFail) {
        if (!response.ok && result.error?.code === 'HOME_LOAN_NOT_ALLOWED') {
          console.log('✅ SUCCÈS: Protection anti-plagiat activée');
          console.log(`   Message: ${result.error.message}`);
          passedTests++;
        } else {
          console.log('❌ ÉCHEC: La protection anti-plagiat n\'a pas fonctionné');
          console.log(`   Réponse: ${JSON.stringify(result)}`);
        }
      } else {
        if (response.ok) {
          console.log('✅ SUCCÈS: Consultation sur place autorisée');
          console.log(`   ID emprunt: ${result.data?.id}`);
          passedTests++;
          
          // Nettoyer: supprimer l'emprunt de test
          if (result.data?.id) {
            await fetch(`${baseUrl}/api/loans/${result.data.id}`, {
              method: 'DELETE'
            });
          }
        } else {
          console.log('❌ ÉCHEC: La consultation sur place devrait être autorisée');
          console.log(`   Erreur: ${JSON.stringify(result)}`);
        }
      }
    } catch (error) {
      console.log('❌ ERREUR:', error.message);
    }
    
    console.log(''); // Ligne vide pour la lisibilité
  }

  console.log(`\n📊 RÉSULTATS: ${passedTests}/${totalTests} tests réussis`);
  
  if (passedTests === totalTests) {
    console.log('🎉 TOUS LES TESTS SONT PASSÉS! La protection anti-plagiat fonctionne correctement.');
  } else {
    console.log('⚠️  CERTAINS TESTS ONT ÉCHOUÉ. Vérifiez la configuration.');
  }
};

// Exécuter les tests
testAntiPlagiarismProtection().catch(console.error);
