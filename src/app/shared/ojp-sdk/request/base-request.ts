import xmlbuilder from 'xmlbuilder';
import { RequestErrorData } from './request-error'
import { StageConfig } from '../types/stage-config';

export interface RequestData {
  requestXmlS: string | null
  requestDatetime: Date | null
  responseXmlS: string | null
  responseDatetime: Date | null
}

export class OJPBaseRequest {
  protected serviceRequestNode: xmlbuilder.XMLElement;
  protected stageConfig: StageConfig

  protected logRequests: boolean

  public lastRequestData: RequestData | null

  constructor(stageConfig: StageConfig) {
    this.stageConfig = stageConfig
    this.serviceRequestNode = this.computeServiceRequestNode();
    this.logRequests = false

    this.lastRequestData = {
      requestXmlS: null,
      requestDatetime: null,
      responseXmlS: null,
      responseDatetime: null,
    }
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

  public fetchOJPResponse(bodyXML_s: string, completion: (responseText: string, error: RequestErrorData | null) => void) {
    const apiEndpoint = this.stageConfig.apiEndpoint
    const requestHeaders = {
      "Content-Type": "text/xml",
      "Authorization": "Bearer " + this.stageConfig.authBearerKey,
    };

    const responsePromise = fetch(apiEndpoint, {
      headers: requestHeaders,
      body: bodyXML_s,
      method: 'POST'
    });

    if (this.logRequests) {
      console.log('OJP Request: /POST - ' + apiEndpoint);
      console.log(bodyXML_s);
    }

    const requestData = <RequestData>{
      requestXmlS: bodyXML_s,
      requestDatetime: new Date(),
      responseXmlS: null,
      responseDatetime: null,
    }
    this.lastRequestData = requestData

    responsePromise.then(response => {
      response.text().then(responseText => {
        requestData.responseXmlS = responseText
        requestData.responseDatetime = new Date()

        completion(responseText, null);
      }).catch(reason => {
        const errorData: RequestErrorData = {
          error: 'ParseTextError',
          message: reason
        }
        completion('', errorData);
      })
    }).catch(reason => {
      const errorData: RequestErrorData = {
        error: 'FetchError',
        message: 'API Endpoint Error: ' + reason
      }
      completion('', errorData);
    })
  }
}
