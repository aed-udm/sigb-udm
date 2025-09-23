'use client';

import { useEffect } from 'react';

/**
 * Composant pour détecter les polices de fallback et optimiser l'affichage
 */
export function FontFallbackDetector({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Détecter si les polices personnalisées sont chargées
    const detectFontLoad = () => {
      const testElement = document.createElement('div');
      testElement.style.fontFamily = 'Inter, system-ui, sans-serif';
      testElement.style.fontSize = '16px';
      testElement.style.position = 'absolute';
      testElement.style.visibility = 'hidden';
      testElement.textContent = 'Test';
      
      document.body.appendChild(testElement);
      
      // Vérifier si la police Inter est chargée
      const computedStyle = window.getComputedStyle(testElement);
      const fontFamily = computedStyle.fontFamily;
      
      if (fontFamily.includes('Inter')) {
        document.documentElement.classList.add('font-loaded');
      } else {
        document.documentElement.classList.add('font-fallback');
      }
      
      document.body.removeChild(testElement);
    };

    // Détecter immédiatement
    detectFontLoad();
    
    // Détecter après le chargement des polices
    if (document.fonts) {
      document.fonts.ready.then(detectFontLoad);
    }
  }, []);

  return <>{children}</>;
}
