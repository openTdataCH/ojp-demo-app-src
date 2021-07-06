import xmlbuilder from 'xmlbuilder';
import { StageConfig } from '../config/config';

export class OJPBaseRequest {
  protected serviceRequestNode: xmlbuilder.XMLElement;
  protected stageConfig: StageConfig

  constructor(stageConfig: StageConfig) {
    this.stageConfig = stageConfig
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

  protected fetchOJPResponse(completion: (responseText: string) => void) {
    const apiEndpoint = this.stageConfig.apiEndpoint
    const requestHeaders = {
        "Authorization": "Bearer " + this.stageConfig.authBearerKey
      "Content-Type": "text/xml",
    };

    const bodyXML_s = this.serviceRequestNode.end();

    const responsePromise = fetch(apiEndpoint, {
        headers: requestHeaders,
        body: bodyXML_s,
        method: 'POST'
    });

    if (this.stageConfig.logAPIRequests) {
      console.log('OJP Request: /POST - ' + apiEndpoint);
      console.log(bodyXML_s);
    }

    responsePromise.then(response => {
      response.text().then(responseText => {
        completion(responseText);
      });
    });
  }
}
