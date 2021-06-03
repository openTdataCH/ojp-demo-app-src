import xmlbuilder from 'xmlbuilder';

export class OJPBaseRequest {
  protected serviceRequestNode: xmlbuilder.XMLElement;
  protected isDebug: boolean

  constructor() {
    this.isDebug = false;
    this.serviceRequestNode = this.computeServiceRequestNode();
  }

  private computeServiceRequestNode(): xmlbuilder.XMLElement {
    const ojpNode = xmlbuilder.create('OJP', {
      encoding: 'utf-8',
    });

    ojpNode.att('xmlns', 'http://www.siri.org.uk/siri');
    ojpNode.att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
    ojpNode.att('xmlns:xsd', 'http://www.w3.org/2001/XMLSchema');
    ojpNode.att('xmlns:ojp', 'http://www.vdv.de/ojp');
    ojpNode.att('xsi:schemaLocation', 'http://www.siri.org.uk/siri ../ojp-xsd-v1.0/OJP.xsd');
    ojpNode.att('version', '1.0');

    const serviceRequestNode = ojpNode.ele('OJPRequest').ele('ServiceRequest');
    serviceRequestNode.ele('RequestorRef', 'OJP SDK v1.0');

    return serviceRequestNode;
  }

  protected fetchOJPResponse(completion: (responseXML: Document) => void) {
    const apiEndpoint = 'https://api.opentransportdata.swiss/ojp2020';
    const requestHeaders = {
        "Content-Type": "application/xml",
        "Authorization": "Bearer 57c5dbbbf1fe4d000100001842c323fa9ff44fbba0b9b925f0c052d1"
    };

    const bodyXML_s = this.serviceRequestNode.end();

    const responsePromise = fetch(apiEndpoint, {
        headers: requestHeaders,
        body: bodyXML_s,
        method: 'POST'
    });

    if (this.isDebug) {
      console.log('OJP Request: /POST - https://api.opentransportdata.swiss/ojp2020');
      console.log(bodyXML_s);
    }

    responsePromise.then(response => {
      response.text().then(responseText => {
        const responseXML = new DOMParser().parseFromString(responseText, 'application/xml');
        completion(responseXML);
      });
    });
  }
}