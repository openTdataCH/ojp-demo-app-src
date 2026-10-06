// WARNING - this is copy/paste from OJP SDK
//      - TODO: fix it there
export class XML_Helpers {
  public static extractTripLegXML(
    sourceXml: string,
    tripId: string,
    legId: string,
    tripIndex: number,
    legIndex: number,
    isOJPv2: boolean,
    xmlConfig: {
      defaultNS: 'ojp' | 'siri' | null;
      mapNS: Record<string, string>;
    },
  ): string | null {
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
    const legIdName = isOJPv2 ? 'id' : 'legid';
    const legElement = matchingLegElements.find(element => hasDirectId(element, legId, [legIdName]))
      ?? matchingLegElements[legIndex]
      ?? null;

    if (legElement === null) {
      return null;
    }

    const standaloneDoc = document.implementation.createDocument(null, null);
    const namespacePrefix = (namespaceURI: string | null) => {
      if (namespaceURI === null) {
        return null;
      }

      return Object.entries(xmlConfig.mapNS).find(([, uri]) => uri === namespaceURI)?.[0] ?? null;
    };
    const cloneWithConfiguredNamespaces = (sourceElement: Element): Element => {
      const prefix = namespacePrefix(sourceElement.namespaceURI);
      const qualifiedName = (prefix !== null) && (prefix !== xmlConfig.defaultNS)
        ? `${prefix}:${sourceElement.localName}`
        : sourceElement.localName;
      const clonedElement = standaloneDoc.createElementNS(sourceElement.namespaceURI, qualifiedName);

      Array.from(sourceElement.attributes).forEach(attribute => {
        if (attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/') {
          return;
        }

        clonedElement.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
      });
      Array.from(sourceElement.childNodes).forEach(child => {
        clonedElement.appendChild(child.nodeType === Node.ELEMENT_NODE
          ? cloneWithConfiguredNamespaces(child as Element)
          : standaloneDoc.importNode(child, true));
      });

      return clonedElement;
    };

    const standaloneLeg = cloneWithConfiguredNamespaces(legElement);
    Object.entries(xmlConfig.mapNS).forEach(([prefix, namespaceURI]) => {
      const attributeName = prefix === xmlConfig.defaultNS ? 'xmlns' : `xmlns:${prefix}`;
      standaloneLeg.setAttributeNS('http://www.w3.org/2000/xmlns/', attributeName, namespaceURI);
    });
    standaloneDoc.appendChild(standaloneLeg);

    return new XMLSerializer().serializeToString(standaloneDoc);
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
