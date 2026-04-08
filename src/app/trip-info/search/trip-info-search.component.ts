import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';

import { SbbExpansionPanel } from '@sbb-esta/angular/accordion';
import { SbbDialog } from '@sbb-esta/angular/dialog';
import { SbbNotificationToast } from '@sbb-esta/angular/notification-toast';

import * as OJP from 'ojp-sdk';

import { APP_STAGE, APP_STAGEs, DEFAULT_APP_STAGE, OJP_VERSION, REQUESTOR_REF } from '../../config/constants';

import { UserTripService } from '../../shared/services/user-trip.service';
import { TripInfoService } from '../trip-info.service';
import { DebugXmlPopoverComponent } from '../../search-form/debug-xml-popover/debug-xml-popover.component';
import { CustomTripInfoXMLPopoverComponent } from './custom-trip-info-xml-popover/custom-trip-info-xml-popover.component';
import { LanguageService } from '../../shared/services/language.service';
import { TripInfoResult } from '../../shared/models/trip-info-result';
import { OJPHelpers } from '../../helpers/ojp-helpers';
import { JourneyService } from '../../shared/models/journey-service';
import { GeoPositionBBOX } from '../../shared/models/geo/geoposition-bbox';
import { JourneyPointType } from '../../shared/types/_all';
import { StopPlace } from '../../shared/models/place/stop-place';
import { TripRequestBuilder } from '../../shared/models/trip/trip-request';
import { TimedLeg } from '../../shared/models/trip/leg/timed-leg';


interface ExampleTripService {
  service: JourneyService;
  name: string;
}

interface PagelModel {
  journeyRef: string
  journeyDateTime: Date,
  appStageOptions: APP_STAGE[],
  isSearching: boolean,
  
  otherVersionURL: string | null,
  permalinkURLAddress: string,

  exampleTripServices: ExampleTripService[],
  loadingExampleTripServices: boolean,
}

@Component({
  selector: 'trip-info-search',
  templateUrl: './trip-info-search.component.html',
  styleUrls: ['./trip-info-search.component.scss']
})
export class TripInfoSearchComponent implements OnInit {
  @ViewChild(SbbExpansionPanel, { static: true }) searchPanel: SbbExpansionPanel | undefined;

  private queryParams: URLSearchParams;

  public model: PagelModel;

  public currentRequestInfo: OJP.RequestInfo | null;

  public headerText: string = 'Search Trip Info';

  private useMocks = false;

  constructor(
    private notificationToast: SbbNotificationToast,
    private debugXmlPopover: SbbDialog,
    private customXmlPopover: SbbDialog,
    private tripInfoService: TripInfoService,
    private languageService: LanguageService,
    public userTripService: UserTripService,
    private router: Router,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
  ) {
    this.queryParams = new URLSearchParams(document.location.search);

    this.model = {
      journeyRef: '',
      journeyDateTime: new Date(),
      appStageOptions: APP_STAGEs,
      isSearching: false,

      otherVersionURL: null,
      permalinkURLAddress: '',

      exampleTripServices: [],
      loadingExampleTripServices: false,
    };

    this.userTripService.currentAppStage = OJPHelpers.computeAppStage();

    this.updateURLs();

    this.currentRequestInfo = null;

    const queryParams = new URLSearchParams(document.location.search);
    
    this.useMocks = queryParams.get('use_mocks') === 'yes';
  }

  async ngOnInit(): Promise<void> {
    this.tripInfoService.tripInfoResultUpdated.subscribe(tripInfoResult => {
      if (tripInfoResult !== null) {
        this.searchPanel?.close();
      }
    });
    
    await this.initFromUserVars();
    this.tripInfoService.stageChanged.emit(this.userTripService.currentAppStage);
  }

  private async initFromUserVars() {
    const journeyRef = this.queryParams.get('ref');
    if (journeyRef) {
      this.model.journeyRef = journeyRef;

      const dayRef = this.queryParams.get('day');
      if (dayRef) {
        this.model.journeyDateTime = new Date(dayRef);
      }

      this.updateURLs();
      
      this.fetchTripInfo();
    } else {
      await this.updateExampleJourneys();
    }

    if (this.useMocks) {
      if (this.useMocks && document.location.hostname === 'localhost') {
        this.fetchTripInfoRequestFromMocks();
        return;
      }
    }
  }

  public onDateTimeChanged() {
    this.updateURLs();
  }

  public isSearchButtonDisabled(): boolean {
    if (this.model.isSearching) {
      return true;
    }

    return false;
  }

  public searchButtonClicked() {
    if (this.model.journeyRef.trim() === '') {
      this.notificationToast.open('JourneyRef cant be empty', {
        type: 'error',
        verticalPosition: 'top',
      });
      return;
    }

    this.notificationToast.dismiss();

    this.fetchTripInfo();
  }

  private computeQueryParams(): URLSearchParams {
    const queryParams = new URLSearchParams();
    if (this.model.journeyRef !== '') {
      queryParams.set('ref', this.model.journeyRef);
    }
    
    const dayS = OJP.DateHelpers.formatDate(this.model.journeyDateTime).substring(0, 10);
    const nowDayS = OJP.DateHelpers.formatDate(new Date()).substring(0, 10);
    if (dayS !== nowDayS) {
      queryParams.set('day', dayS);
    }

    if (this.userTripService.currentAppStage !== DEFAULT_APP_STAGE) {
      const stageS = this.userTripService.currentAppStage.toLowerCase();
      queryParams.append('stage', stageS);
    }

    if (OJP_VERSION === '1.0') {
      queryParams.append('v', '1');
    }

    return queryParams;
  }

  private updateCurrentURL(router: Router, route: ActivatedRoute, urlSearchParams: URLSearchParams) {
    const queryParams = Object.fromEntries(urlSearchParams.entries());

    router.navigate([], {
      relativeTo: route,
      queryParams: queryParams,
    });
  }

  private updateURLs() {
    const queryParams = this.computeQueryParams();
    this.updateCurrentURL(this.router, this.route, queryParams);

    const urlAddress = document.location.pathname + '?' + queryParams.toString();
    
    this.model.permalinkURLAddress = urlAddress;
    this.updateLinkedURLs(queryParams);
  }

  private updateLinkedURLs(queryParams: URLSearchParams) {
    const isOJPv2 = OJP_VERSION === '2.0';

    const otherVersionQueryParams = new URLSearchParams(queryParams);
    this.userTripService.updateStageLinkedURL(otherVersionQueryParams, isOJPv2);
    if (isOJPv2) {
      // v1
      otherVersionQueryParams.set('v', '1');
      this.userTripService.otherVersionURLText = 'OJP 1.0';
    } else {
      // v2
      otherVersionQueryParams.delete('v');
      this.userTripService.otherVersionURLText = 'OJP 2.0';
    }

    this.model.otherVersionURL = 'trip?' + otherVersionQueryParams.toString();
  }

  private async fetchTripInfo() {
    const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = ojpSDK.requests.TripInfoRequest.initWithJourneyRef(this.model.journeyRef, this.model.journeyDateTime);
    request.enableTrackProjection();

    this.model.isSearching = true;
    try {
      const response = await request.fetchResponse(ojpSDK);
      const tripInfoResult = TripInfoResult.initWithTripInfoResponse(OJP_VERSION, response);
      this.parseTripInfo(request.requestInfo, tripInfoResult);
    } catch (err: any) {
      this.notificationToast.open('Response XML Error', {
        type: 'error',
        verticalPosition: 'top',
      });

      console.error('SDK response error:');
      console.log(err);
    }
    this.model.isSearching = false;
  }

  private async fetchTripInfoRequestFromMocks() {
    const mockURL = '/path/to/mock.xml';

    const mockText = await (await fetch(mockURL)).text();

    await this.handleCustomResponse(mockText);
  }

  public showRequestXmlPopover() {
    const dialogRef = this.debugXmlPopover.open(DebugXmlPopoverComponent, {
      position: { top: '20px' },
      width: '50vw',
      height: '90vh',
    });
    dialogRef.afterOpened().subscribe(() => {
      if (this.currentRequestInfo) {
        const popover = dialogRef.componentInstance as DebugXmlPopoverComponent;
        popover.updateRequestData(this.currentRequestInfo);
      }
    });
  }

  private parseTripInfo(requestInfo: OJP.RequestInfo, tripInfoResult: TripInfoResult | null): void {
    this.currentRequestInfo = requestInfo;
    this.tripInfoService.tripInfoResultUpdated.emit(tripInfoResult);
  }

  public async onChangeStageAPI(ev: any) {
    const newAppStage = ev.value as APP_STAGE;
    this.userTripService.currentAppStage = newAppStage;

    this.tripInfoService.stageChanged.emit(newAppStage);

    this.updateURLs();

    if (!this.model.journeyRef) {
      await this.updateExampleJourneys();
    }
  }

  public loadCustomXMLPopover() {
    const dialogRef = this.customXmlPopover.open(CustomTripInfoXMLPopoverComponent, {
      position: { top: '20px' },
    });
    dialogRef.afterOpened().subscribe(() => {
      this.notificationToast.dismiss();

      const popover = dialogRef.componentInstance as CustomTripInfoXMLPopoverComponent;

      const currentRequestXML = this.currentRequestInfo?.requestXML ?? null;
      if (currentRequestXML === null) {
        const isOJPv2 = OJP_VERSION === '2.0';
        const xmlConfig = isOJPv2 ? OJP.DefaultXML_Config : OJP.XML_BuilderConfigOJPv1;
        const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language);
        
        const requestJourneyRef = this.model.journeyRef.trim() === '' ? 'fill_journeyRef' : this.model.journeyRef;
        const request = ojpSDK.requests.TripInfoRequest.initWithJourneyRef(requestJourneyRef, this.model.journeyDateTime);
        popover.customRequestXMLs = request.buildRequestXML(this.languageService.language, REQUESTOR_REF, xmlConfig);
      } else {
        popover.customRequestXMLs = currentRequestXML;
      }

      popover.customRequestSaved.subscribe(async requestInfo => {
        dialogRef.close();
        this.currentRequestInfo = requestInfo;

        if (requestInfo.responseXML) {
          await this.handleCustomResponse(requestInfo.responseXML);
        }
      });

      popover.customResponseSaved.subscribe((responseXML) => {
        dialogRef.close()
        this.handleCustomResponse(responseXML);
      })
    });
  }

  private async handleCustomResponse(responseXML: string) {
    const ojpSDK = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const request = ojpSDK.requests.TripInfoRequest.initWithResponseMock(responseXML);
    request.enableTrackProjection();
   
    this.currentRequestInfo = request.requestInfo;
    
    const response = await request.fetchResponse(ojpSDK);
    if (response.ok) {
      const tripInfoResult = TripInfoResult.initWithTripInfoResponse(OJP_VERSION, response);
      if (tripInfoResult === null) {
        this.notificationToast.open('Cant Parse TripInfoRequest result:', {
          type: 'error',
          verticalPosition: 'top',
        });
      }
      this.parseTripInfo(request.requestInfo, tripInfoResult);
    } else {
      this.notificationToast.open('Invalid TripInfoRequest result: ' + response.error.message, {
        type: 'error',
        verticalPosition: 'top',
      });
      console.log(this.model);
      console.log(response);
    }
  }

  public onJourneyRefChanged() {
    this.updateURLs();
  }

  private async updateExampleJourneys() {
    const sdk = this.userTripService.createOJP_SDK_Instance(this.languageService.language);

    const geoPositions = [
      // Thun
      new OJP.GeoPosition(7.629565, 46.754696),
      // Bern
      new OJP.GeoPosition(7.43913, 46.94883),
      // Klusplatz
      new OJP.GeoPosition(8.5665, 47.36404),
      // Altstetten
      new OJP.GeoPosition(8.489081, 47.391704),
      // Basel
      new OJP.GeoPosition(7.58956, 47.54741),
      // Olten
      new OJP.GeoPosition(7.9077, 47.35193),
      // Lausanne
      new OJP.GeoPosition(6.62909, 46.51679),
      // Geneve Cirque
      new OJP.GeoPosition(6.140675, 46.200601),
    ];
    const randomGeoPositions = OJPHelpers.shuffleArray(geoPositions);

    if (randomGeoPositions.length < 2) {
      return;
    }

    this.model.loadingExampleTripServices = true;

    let fromStopPlaces: StopPlace[] = [];
    let toStopPlaces: StopPlace[] = [];

    const endpointTypes: JourneyPointType[] = ['From', 'To'];
    for (const endpointType of endpointTypes) {
      const isFrom = endpointType === 'From';
      const geoPosition = isFrom ? randomGeoPositions[0] : randomGeoPositions[randomGeoPositions.length - 1];
      const bbox = GeoPositionBBOX.initFromGeoPosition(geoPosition, 200, 200);
      const request = OJP.LocationInformationRequest.initWithBBOX(bbox.asFeatureBBOX(), ['stop'], 10);
      const response = await request.fetchResponse(sdk);
      if (!response.ok) {
        return;
      }

      const stopPlaces = OJPHelpers.parseStopPlaces(OJP_VERSION, response);
      if (stopPlaces.length === 0) {
        console.log(geoPosition);
      }

      if (isFrom) {
        fromStopPlaces = OJPHelpers.shuffleArray(stopPlaces);
      } else {
        toStopPlaces = OJPHelpers.shuffleArray(stopPlaces);
      }
    }

    let mapJourneyServices: Record<string, JourneyService> = {};
    let foundResults = false;
    for (const fromStopPlace of fromStopPlaces) {
      for (const toStopPlace of toStopPlaces) {
        const request = OJP.TripRequest.initWithPlaceRefsOrCoords(fromStopPlace.placeRef.ref, toStopPlace.placeRef.ref);
        const response = await request.fetchResponse(sdk);

        await OJPHelpers.wait(100);

        if (!response.ok) {
          continue;
        }

        const trips = TripRequestBuilder.parseTrips(this.sanitizer, response);
        const services: JourneyService[] = [];
        trips.forEach(trip => {
          trip.legs.forEach(leg => {
            if (leg.type === 'TimedLeg') {
              const timedLeg = leg as TimedLeg;
              const service = timedLeg.service;
              services.push(service);
            }
          });
        });

        if (services.length > 0) {
          mapJourneyServices = {};
          services.forEach(service => {
            mapJourneyServices[service.journeyRef] = service;
          });
          foundResults = true;
        }

        if (foundResults) {
          break;
        }
      }

      if (foundResults) {
        break;
      }
    }

    this.model.loadingExampleTripServices = false;

    const foundServices = Object.values(mapJourneyServices);
    if (foundServices.length === 0) {
      return;
    }

    const exampleTripServices: ExampleTripService[] = [];
    foundServices.forEach(service => {
      const nameParts = [
        service.formatServiceLineName(),
        'to ' + (service.destinationText?.text ?? ''),
      ];

      const exampleTripService: ExampleTripService = {
        service: service,
        name: nameParts.join(' '),
      };
      exampleTripServices.push(exampleTripService);
    });

    this.model.exampleTripServices = OJPHelpers.limitArray(exampleTripServices, 5);
  }

  public async onExampleTripServiceSelected(tripService: ExampleTripService, event: MouseEvent) {
    this.model.journeyRef = tripService.service.journeyRef;
    this.updateURLs();
    this.fetchTripInfo();
  }
}
