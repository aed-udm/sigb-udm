import { NextRequest, NextResponse } from 'next/server';
import { CAMESExportService } from '@/lib/services/cames-export-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const type = searchParams.get('type') || 'thesis';
    const limit = parseInt(searchParams.get('limit') || '10');

    // Données de test pour CAMES/DICAMES
    const testData = {
      id: 'test-cames-001',
      title: 'Thèse de test CAMES',
      author: 'Auteur Test',
      director: 'Directeur Test',
      university: 'Université de Douala',
      faculty: 'Faculté des Sciences',
      department: 'Département Informatique',
      year: 2024,
      degree: 'Doctorat/PhD',
      discipline: 'Informatique',
      specialization: 'Intelligence Artificielle',
      keywords: ['IA', 'Machine Learning', 'Test'],
      abstract: 'Résumé de la thèse de test pour validation CAMES',
      language: 'fr',
      pages: 250,
      cames_id: 'CAMES-2024-001',
      dicames_compliant: true,
      defense_date: '2024-06-15',
      jury_members: [
        { name: 'Prof. Test 1', role: 'Président', institution: 'UDM' },
        { name: 'Prof. Test 2', role: 'Rapporteur', institution: 'UY1' }
      ]
    };

    const camesService = new CAMESExportService();

    switch (format) {
      case 'xml':
        const xmlData = camesService.exportToXML(testData);
        return new NextResponse(xmlData, {
          headers: { 'Content-Type': 'application/xml' }
        });

      case 'json':
        const jsonData = camesService.exportToJSON(testData);
        return NextResponse.json(jsonData);

      case 'dicames':
        const dicamesData = camesService.exportToDICAMES(testData);
        return NextResponse.json(dicamesData);

      default:
        return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erreur export CAMES:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { format = 'json' } = data;

    const camesService = new CAMESExportService();

    switch (format) {
      case 'xml':
        const xmlData = camesService.exportToXML(data);
        return new NextResponse(xmlData, {
          headers: { 'Content-Type': 'application/xml' }
        });

      case 'json':
        const jsonData = camesService.exportToJSON(data);
        return NextResponse.json(jsonData);

      case 'dicames':
        const dicamesData = camesService.exportToDICAMES(data);
        return NextResponse.json(dicamesData);

      default:
        return NextResponse.json({ error: 'Format non supporté' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erreur export CAMES POST:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}