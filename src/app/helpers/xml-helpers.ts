// WARNING - this is copy/paste from OJP SDK
//      - TODO: fix it there
export class XML_Helpers {
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
