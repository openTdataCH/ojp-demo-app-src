// WARNING - this is copy/paste from OJP SDK
//      - TODO: fix it there
export class XML_Helpers {
  public static extractTripLegXML(sourceXml: string, tripId: string, legId: string, tripIndex: number, legIndex: number): string | null {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sourceXml, 'application/xml');

    if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
      return null;
    }

    const elements = Array.from(xmlDoc.getElementsByTagName('*'));
    const hasDirectId = (element: Element, expectedId: string, idNames: string[]) => {
      return Array.from(element.children).some(child => {
        return idNames.includes(child.localName.toLowerCase()) && child.textContent?.trim() === expectedId;
      });
    };

    const tripElements = elements.filter(element => element.localName.toLowerCase() === 'trip');
    const tripElement = tripElements.find(element => {
      return element.localName.toLowerCase() === 'trip' && hasDirectId(element, tripId, ['id', 'tripid']);
    }) ?? tripElements[tripIndex] ?? null;

    const legElements = Array.from((tripElement ?? xmlDoc).getElementsByTagName('*'));
    const matchingLegElements = legElements.filter(element => {
      const elementName = element.localName.toLowerCase();
      return ['leg', 'tripleg'].includes(elementName);
    });
    const legElement = matchingLegElements.find(element => hasDirectId(element, legId, ['id', 'legid']))
      ?? matchingLegElements[legIndex]
      ?? null;

    if (legElement === null) {
      return null;
    }

    return new XMLSerializer().serializeToString(legElement);
  }

  // from https://stackoverflow.com/a/47317538
  public static prettyPrintXML(sourceXml: string): string {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(sourceXml, 'application/xml');
    
    const xsltString = `
      <xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
        <xsl:strip-space elements="*"/>
        <xsl:output indent="yes"/>
        
        <!-- change to just text() to strip space in text nodes -->
        <xsl:template match="para[content-style][not(text())]">
          <xsl:value-of select="normalize-space(.)"/>
        </xsl:template>
        <xsl:template match="node()|@*">
          <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
        </xsl:template>
      </xsl:stylesheet>
    `;
    const xsltDoc = parser.parseFromString(xsltString, 'application/xml');
    
    var xsltProcessor = new XSLTProcessor();
    xsltProcessor.importStylesheet(xsltDoc);
    const transformedDoc = xsltProcessor.transformToDocument(xmlDoc);
    const serializer = new XMLSerializer();
    const resultXml = serializer.serializeToString(transformedDoc);

    return resultXml;
  }
}
