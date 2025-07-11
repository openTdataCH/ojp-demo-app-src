import * as OJP_Types from 'ojp-shared-types';
import OJP_Legacy from '../../config/ojp-legacy';
import { TripLegLineType } from '../types/map-geometry-types';

export class JourneyService implements OJP_Types.DatedJourneySchema  {
  public conventionalModeOfOperation?: string;
  public operatingDayRef: string;
  public journeyRef: string;
  public publicCode?: string;
  public lineRef: string;
  public directionRef?: string;
  public mode: OJP_Types.ModeStructureSchema;
  public productCategory?: OJP_Types.ProductCategorySchema;
  public publishedServiceName: OJP_Types.InternationalTextSchema;
  public trainNumber?: string;
  public attribute: OJP_Types.GeneralAttributeSchema[];
  public operatorRef?: string;
  public destinationStopPointRef?: string;
  public destinationText?: OJP_Types.InternationalTextSchema;
  public unplanned?: boolean;
  public cancelled?: boolean;
  public deviation?: boolean;
 
  private constructor(operatingDayRef: string, journeyRef: string, lineRef: string, mode: OJP_Types.ModeStructureSchema, publishedServiceName: OJP_Types.InternationalTextSchema, attribute: OJP_Types.GeneralAttributeSchema[]) {
    this.conventionalModeOfOperation = undefined;
    this.operatingDayRef = operatingDayRef;
    this.journeyRef = journeyRef;
    this.publicCode = undefined;
    this.lineRef = lineRef;
    this.directionRef = undefined;
    this.mode = mode;
    this.productCategory = undefined;
    this.publishedServiceName = publishedServiceName;
    this.trainNumber = undefined;
    this.attribute = attribute;
    this.operatorRef = undefined;
    this.destinationStopPointRef = undefined;
    this.destinationText = undefined;
    this.unplanned = undefined;
    this.cancelled = undefined;
    this.deviation = undefined;
  }

  // Init with OJP 2.0 XML schema
  public static initWithDatedJourneySchema(schema: OJP_Types.DatedJourneySchema): JourneyService {
    const service = new JourneyService(schema.operatingDayRef, schema.journeyRef, schema.lineRef, schema.mode, schema.publishedServiceName, schema.attribute);
    
    service.conventionalModeOfOperation = schema.conventionalModeOfOperation;
    service.publicCode = schema.publicCode;
    service.directionRef = schema.directionRef;
    service.productCategory = schema.productCategory;
    service.trainNumber = schema.trainNumber;
    service.operatorRef = schema.operatorRef;
    service.destinationStopPointRef = schema.destinationStopPointRef;
    service.destinationText = schema.destinationText;
    service.unplanned = schema.unplanned;
    service.cancelled = schema.cancelled;
    service.deviation = schema.deviation;
    
    return service;
  }

  // Init with OJP 1.0 XML schema - TripRequest
  // - it needs the TimedLeg because there we have the the 'publishedJourneyNumber' stored
  public static initWithLegacyTripTimedLegSchema(legacyTripLegSchema: OJP_Types.OJPv1_TimedLegSchema): JourneyService {
    const legacyServiceSchema = legacyTripLegSchema.service;
    const publishedServiceName = legacyServiceSchema.publishedLineName;

    const service = new JourneyService(legacyServiceSchema.operatingDayRef, legacyServiceSchema.journeyRef, legacyServiceSchema.lineRef, legacyServiceSchema.mode, publishedServiceName, legacyServiceSchema.attribute);

    service.conventionalModeOfOperation = legacyServiceSchema.conventionalModeOfOperation;
    service.publicCode = legacyServiceSchema.publicCode;
    service.directionRef = legacyServiceSchema.directionRef;
    service.productCategory = legacyServiceSchema.productCategory;
    service.trainNumber = legacyTripLegSchema.extension?.publishedJourneyNumber?.text ?? undefined;
    service.operatorRef = legacyServiceSchema.operatorRef;
    service.destinationStopPointRef = legacyServiceSchema.destinationStopPointRef;
    service.destinationText = legacyServiceSchema.destinationText;
    service.unplanned = legacyServiceSchema.unplanned;
    service.cancelled = legacyServiceSchema.cancelled;
    service.deviation = legacyServiceSchema.deviation;

    return service;
  }

  // Init with OJP 1.0 XML schema - TripInfoRequest
  public static initWithLegacyTripInfoResultSchema(legacyTripInfoResultSchema: OJP_Types.OJPv1_TripInfoResultStructureSchema): JourneyService | null {
    const legacyServiceSchema = legacyTripInfoResultSchema.service ?? null;
    if (legacyServiceSchema === null) {
      return null;
    }
    
    const publishedServiceName = legacyServiceSchema.publishedLineName;

    const service = new JourneyService(legacyServiceSchema.operatingDayRef, legacyServiceSchema.journeyRef, legacyServiceSchema.lineRef, legacyServiceSchema.mode, publishedServiceName, legacyServiceSchema.attribute);

    service.conventionalModeOfOperation = legacyServiceSchema.conventionalModeOfOperation;
    service.publicCode = legacyServiceSchema.publicCode;
    service.directionRef = legacyServiceSchema.directionRef;
    service.productCategory = legacyServiceSchema.productCategory;
    service.trainNumber = legacyTripInfoResultSchema.extension?.publishedJourneyNumber?.text ?? undefined;
    service.operatorRef = legacyServiceSchema.operatorRef;
    service.destinationStopPointRef = legacyServiceSchema.destinationStopPointRef;
    service.destinationText = legacyServiceSchema.destinationText;
    service.unplanned = legacyServiceSchema.unplanned;
    service.cancelled = legacyServiceSchema.cancelled;
    service.deviation = legacyServiceSchema.deviation;

    return service;
  }

  //  Init with old OJP SDK model
  public static initWithOJP_LegacyJourneyService(legacyJourneyService: OJP_Legacy.JourneyService): JourneyService {
    const operatingDayRef = legacyJourneyService.operatingDayRef;
    const journeyRef = legacyJourneyService.journeyRef;
    const lineRef = legacyJourneyService.lineRef ?? 'n/a OJP_Legacy.JourneyService.lineRef';
    const mode: OJP_Types.ModeStructureSchema = {
      ptMode: legacyJourneyService.ptMode.ptMode as OJP_Types.VehicleModesOfTransportEnum,
      name: {
        text: legacyJourneyService.ptMode.name ?? 'n/a OJP_Legacy.mode.name',
      },
      shortName: {
        text: legacyJourneyService.ptMode.shortName ?? 'n/a OJP_Legacy.mode.shortName',
      },
    };
    const publishedServiceName: OJP_Types.InternationalTextSchema = {
      text: legacyJourneyService.serviceLineNumber ?? 'n/a OJP_Legacy.JourneyService.serviceLineNumber',
    };
    const journeyAttributes: OJP_Types.GeneralAttributeSchema[] = Object.values(legacyJourneyService.serviceAttributes).map(el => {
      const journeyAttribute: OJP_Types.GeneralAttributeSchema = {
        userText: {
          text: el.text,
        },
        code: el.code,
      };

      return journeyAttribute;
    });

    const service = new JourneyService(operatingDayRef, journeyRef, lineRef, mode, publishedServiceName, journeyAttributes);

    if (legacyJourneyService.productCategory) {
      service.productCategory = {
        name: {
          text: legacyJourneyService.productCategory.name,
        },
        shortName: {
          text: legacyJourneyService.productCategory.shortName,
        },
        productCategoryRef: legacyJourneyService.productCategory?.productCategoryRef,
      };
    }

    if (legacyJourneyService.journeyNumber) {
      service.trainNumber = legacyJourneyService.journeyNumber;
    }

    if (legacyJourneyService.operatorRef) {
      service.operatorRef = legacyJourneyService.operatorRef;
    }

    if (legacyJourneyService.destinationStopPlace) {
      service.destinationStopPointRef = legacyJourneyService.destinationStopPlace.stopPlaceRef;
      if (legacyJourneyService.destinationStopPlace.stopPlaceName) {
        service.destinationText = {
          text: legacyJourneyService.destinationStopPlace.stopPlaceName,
        };
      }
    }

    service.unplanned = legacyJourneyService.isUnplanned ?? undefined;
    service.cancelled = legacyJourneyService.hasCancellation ?? undefined;
    service.deviation = legacyJourneyService.hasDeviation ?? undefined;

    return service;
  }

  public formatServiceName(): string {
    const nameParts: string[] = [];

    const serviceLineName = this.formatServiceLineName();
    nameParts.push(serviceLineName);
    nameParts.push(' - ');
    nameParts.push(this.trainNumber ?? '');

    nameParts.push('(' + (this.operatorRef ?? 'n/a operatorRef') + ')');

    return nameParts.join(' ');
  }

  public formatServiceLineName(): string {
    const nameParts: string[] = [];

    // HACK adds '' suffix so we can have always strings
    const publishedServiceName = this.publishedServiceName.text + '';

    const modeShortName = this.mode.shortName?.text ?? null;
    if (modeShortName === null) {
      const modeName = this.mode.name?.text ?? null;
      if (modeName !== null) {
        nameParts.push(modeName);
      }
    } else {
      // Avoid EV EV1 or S S1
      if (!publishedServiceName.startsWith(modeShortName)) {
        nameParts.push(modeShortName);
      }
    }

    nameParts.push(this.publishedServiceName.text);

    return nameParts.join(' ');
  }

  private isDemandMode(): boolean {
    const isBusDemandMode = this.mode.busSubmode === 'demandAndResponseBus' || this.mode.busSubmode === 'unknown';
    if (isBusDemandMode) {
      return true;
    }

    const isEV = this.mode.shortName?.text === 'EV';
    if (isEV) {
      return true;
    }

    return false;
  }
 
  public hasPrecisePolyline(): boolean {
    if (this.isDemandMode()) {
      return true;
    }

    const ignorePtModes: string[] = [
      'bus',
      'tram'
    ];
    if (ignorePtModes.indexOf(this.mode.ptMode) !== -1) {
      return false;
    }

    return true;
  }

  public computeLegColorType(): TripLegLineType {
    const isPostAuto = this.operatorRef === '801';
    if (isPostAuto) {
      return 'PostAuto';
    }

    const isRail = this.mode.ptMode === 'rail';
    if (isRail) {
      return 'LongDistanceRail';
    }

    if (this.isDemandMode()) {
      return 'OnDemand';
    }

    const isFunicular = (() => {
      // cog-wheel
      const isCC = this.mode.shortName?.text === 'CC';
      if (isCC) {
        return true;
      }

      // all aerialway, funiculars
      const isTelecabinMode = this.mode.ptMode === 'telecabin';
      if (isTelecabinMode) {
        return true;
      }

      return false;
    })();
    if (isFunicular) {
      return 'Funicular';
    }

    return 'Bus';
  }

  public computeFormationServiceURL(): string | null {
    const trainNumber = this.trainNumber ?? null;
    if (trainNumber === null) {
      return null;
    }

    let serviceOperator = this.operatorRef ?? null;
    if (serviceOperator === null) {
      return null;
    }
    serviceOperator = ('' + serviceOperator).replace('ojp:', '');

    const mapOperatorRefEVU: Record<string, string> = {
      'ch:1:sboid:100015': 'BLS',
      '33': 'BLS',
      
      'ch:1:sboid:100001': 'SBB',
      '11': 'SBB',
      
      'ch:1:sboid:100301': 'MBC',
      '344': 'MBC',
      'ch:1:sboid:100012': 'MBC',
      '29': 'MBC',
      'ch:1:sboid:1100071': 'MBC',
      '7256': 'MBC',
      'ch:1:sboid:100566': 'MBC',
      '764': 'MBC',

      'ch:1:sboid:100049': 'OeBB',
      '68': 'OeBB',

      'ch:1:sboid:100053': 'RhB',
      '72': 'RhB',
      'ch:1:sboid:1100063': 'RhB',
      '7250': 'RhB',

      'ch:1:sboid:100061': 'SOB',
      '82': 'SOB',
      'ch:1:sboid:100018': 'SOB',
      '36': 'SOB',
      'ch:1:sboid:1100023': 'SOB',
      '7232': 'SOB',

      'ch:1:sboid:100046': 'THURBO',
      '65': 'THURBO',

      'ch:1:sboid:100034': 'TPF',
      '53': 'TPF',
      'ch:1:sboid:100945': 'TPF',
      '3004': 'TPF',
      'ch:1:sboid:101810': 'TPF',
      '7223': 'TPF',

      'ch:1:sboid:101265': 'TRN',
      '15301': 'TRN',
      'ch:1:sboid:1100067': 'TRN',
      '7255': 'TRN',
      'ch:1:sboid:101264': 'TRN',
      '15300': 'TRN',

      'ch:1:sboid:101240': 'VDBB',
      '9014': 'VDBB',

      'ch:1:sboid:100064': 'ZB',
      '86': 'ZB',
      'ch:1:sboid:1100025': 'ZB',
      '7234': 'ZB',
    };
    
    const operatorEVU = mapOperatorRefEVU[serviceOperator] ?? null;
    if (operatorEVU === null) {
      return null;
    }

    const url = 'https://opentdatach.github.io/train-formation-view/?number=' + trainNumber + '&operator=' + operatorEVU;

    return url;
  }
}
