import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const verb = searchParams.get('verb');
    const metadataPrefix = searchParams.get('metadataPrefix');
    const identifier = searchParams.get('identifier');

    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}/api/oai-pmh`;
    const responseDate = new Date().toISOString();

    let responseXml = '';

    switch (verb) {
      case 'Identify':
        responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="Identify">${baseUrl}</request>
  <Identify>
    <repositoryName>SIGB UDM - Système Intégré de Gestion Bibliographique</repositoryName>
    <baseURL>${baseUrl}</baseURL>
    <protocolVersion>2.0</protocolVersion>
    <adminEmail>admin@udm.edu.cm</adminEmail>
    <earliestDatestamp>2024-01-01T00:00:00Z</earliestDatestamp>
    <deletedRecord>transient</deletedRecord>
    <granularity>YYYY-MM-DDThh:mm:ssZ</granularity>
    <description>
      <oai-identifier xmlns="http://www.openarchives.org/OAI/2.0/oai-identifier"
                      xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/oai-identifier
                      http://www.openarchives.org/OAI/2.0/oai-identifier.xsd">
        <scheme>oai</scheme>
        <repositoryIdentifier>udm.edu.cm</repositoryIdentifier>
        <delimiter>:</delimiter>
        <sampleIdentifier>oai:udm.edu.cm:123456</sampleIdentifier>
      </oai-identifier>
    </description>
  </Identify>
</OAI-PMH>`;
        break;

      case 'ListMetadataFormats':
        responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="ListMetadataFormats">${baseUrl}</request>
  <ListMetadataFormats>
    <metadataFormat>
      <metadataPrefix>oai_dc</metadataPrefix>
      <schema>http://www.openarchives.org/OAI/2.0/oai_dc.xsd</schema>
      <metadataNamespace>http://www.openarchives.org/OAI/2.0/oai_dc/</metadataNamespace>
    </metadataFormat>
    <metadataFormat>
      <metadataPrefix>marc21</metadataPrefix>
      <schema>http://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd</schema>
      <metadataNamespace>http://www.loc.gov/MARC21/slim</metadataNamespace>
    </metadataFormat>
  </ListMetadataFormats>
</OAI-PMH>`;
        break;

      case 'ListSets':
        responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="ListSets">${baseUrl}</request>
  <ListSets>
    <set>
      <setSpec>books</setSpec>
      <setName>Livres</setName>
      <setDescription>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:description>Collection de livres de la bibliothèque UDM</dc:description>
        </oai_dc:dc>
      </setDescription>
    </set>
    <set>
      <setSpec>theses</setSpec>
      <setName>Thèses</setName>
      <setDescription>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:description>Collection de thèses et mémoires</dc:description>
        </oai_dc:dc>
      </setDescription>
    </set>
  </ListSets>
</OAI-PMH>`;
        break;

      case 'ListRecords':
        responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request verb="ListRecords" metadataPrefix="${metadataPrefix || 'oai_dc'}">${baseUrl}</request>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:udm.edu.cm:123456</identifier>
        <datestamp>2024-01-01T00:00:00Z</datestamp>
        <setSpec>books</setSpec>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/"
                   xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Document de test</dc:title>
          <dc:creator>Auteur Test</dc:creator>
          <dc:subject>Test</dc:subject>
          <dc:description>Description de test</dc:description>
          <dc:publisher>Éditeur Test</dc:publisher>
          <dc:date>2024</dc:date>
          <dc:type>Text</dc:type>
          <dc:format>application/pdf</dc:format>
          <dc:identifier>oai:udm.edu.cm:123456</dc:identifier>
          <dc:language>fr</dc:language>
        </oai_dc:dc>
      </metadata>
    </record>
  </ListRecords>
</OAI-PMH>`;
        break;

      default:
        responseXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/
         http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">
  <responseDate>${responseDate}</responseDate>
  <request>${baseUrl}</request>
  <error code="badVerb">Illegal OAI verb</error>
</OAI-PMH>`;
    }

    return new NextResponse(responseXml, {
      headers: { 'Content-Type': 'application/xml' }
    });
  } catch (error) {
    console.error('Erreur OAI-PMH:', error);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}