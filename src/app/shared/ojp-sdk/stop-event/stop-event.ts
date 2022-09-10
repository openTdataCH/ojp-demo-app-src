import { XPathOJP } from '../helpers/xpath-ojp'
import { StopPoint } from '../trip/leg/timed-leg/stop-point'
import { JourneyService } from '../journey/journey-service'
import { Location } from '../location/location';
import { StopPointTime } from '../trip';
import { DateHelpers } from '../helpers/date-helpers';

interface StationBoardTime {
    stopTime: string
    stopTimeActual: string | null
    stopDelayText: string | null
}

export interface StationBoardModel {
    stopEvent: StopEvent

    serviceLineNumber: string
    servicePtMode: string
    tripNumber: string | null
    tripHeading: string
    tripOperator: string
    
    arrivalTime: StationBoardTime | null
    departureTime: StationBoardTime | null
    
    stopPlatform: string | null
    stopPlatformActual: string | null
}

export class StopEvent {
    public journeyService: JourneyService;
    public stopPoint: StopPoint;
    public prevStopPoints: StopPoint[];
    public nextStopPoints: StopPoint[];

    constructor(stopPoint: StopPoint, journeyService: JourneyService) {
        this.stopPoint = stopPoint;
        this.journeyService = journeyService;
        this.prevStopPoints = [];
        this.nextStopPoints = [];
    }

    public static initFromContextNode(contextNode: Node): StopEvent | null {
        const currentStopNode = XPathOJP.queryNode('ojp:ThisCall/ojp:CallAtStop', contextNode);
        if (currentStopNode === null) {
            return null;
        }
        const stopPoint = StopPoint.initWithContextNode('Intermediate', currentStopNode);
        if (stopPoint === null) {
            return null;
        }

        const journeyService = JourneyService.initFromContextNode(contextNode);
        if (journeyService === null) {
            return null;
        }

        const stopEvent = new StopEvent(stopPoint, journeyService);

        const tripNodeTypes = ['PreviousCall', 'OnwardCall'];
        tripNodeTypes.forEach(tripNodeType => {
            const tripNodeXPATH = 'ojp:' + tripNodeType + '/ojp:CallAtStop';
            const tripStopPointNodes =  XPathOJP.queryNodes(tripNodeXPATH, contextNode);
            if (tripStopPointNodes.length === 0) {
                return;
            }

            const is_previous = tripNodeType === 'PreviousCall';
            
            let stopPointsRef = is_previous ? stopEvent.prevStopPoints : stopEvent.nextStopPoints;
            tripStopPointNodes.forEach(tripStopPointNode => {
                const tripStopPoint = StopPoint.initWithContextNode('Intermediate', tripStopPointNode);
                if (tripStopPoint) {
                    stopPointsRef.push(tripStopPoint);
                }
            });
        });

        return stopEvent;
    }

    public patchStopEventLocations(mapContextLocations: Record<string, Location>) {
        let stopPointsToPatch = [this.stopPoint];

        const stopPointEventTypes = ['prev', 'next'];
        stopPointEventTypes.forEach(stopPointEventType => {
            const is_previous = stopPointEventType === 'prev';
            let stopPointsRef = is_previous ? this.prevStopPoints : this.nextStopPoints;
            stopPointsToPatch = stopPointsToPatch.concat(stopPointsRef);
        });

        stopPointsToPatch.forEach(stopPoint => {
            const stopPointRef = stopPoint.location.stopPointRef;
            if (stopPointRef && (stopPointRef in mapContextLocations)) {
                stopPoint.location = mapContextLocations[stopPointRef];
            }
        });
    }

    public asStationBoard(): StationBoardModel {
        const serviceLineNumber = this.computeServiceLineNumber()
        const servicePtMode = this.journeyService.ptMode.shortName ?? 'N/A'

        const tripNumber = this.journeyService.journeyNumber
        const tripHeading = this.journeyService.destinationStopPlace?.stopPlaceName ?? 'N/A'
        const tripOperator = this.journeyService.agencyID

        const arrivalTime = this.computeStopTimeData(this.stopPoint.arrivalData)
        const departureTime = this.computeStopTimeData(this.stopPoint.departureData)

        const stopPlatform = this.stopPoint.plannedPlatform
        const stopPlatformActual = this.stopPoint.actualPlatform

        const model = <StationBoardModel>{
            stopEvent: this,
            serviceLineNumber: serviceLineNumber,
            servicePtMode: servicePtMode,
            tripNumber, tripHeading, tripOperator,
            arrivalTime, departureTime,
            stopPlatform, stopPlatformActual,
        }

        return model;
    }

    private computeServiceLineNumber(): string {
        const serviceShortName = this.journeyService.ptMode.shortName ?? 'N/A';
        const serviceLineNumber = this.journeyService.serviceLineNumber;
        if (serviceLineNumber) {
            return serviceLineNumber
        } else {
            return serviceShortName;
        }
    }

    private computeStopTimeData(stopPointTime: StopPointTime | null): StationBoardTime | null {
        if (stopPointTime === null) {
            return null
        }
    
        const stopTimeData = <StationBoardTime>{
            stopTime: this.computeStopTime(stopPointTime.timetableTime ?? null),
            stopTimeActual: this.computeStopTime(stopPointTime.estimatedTime ?? null),
            stopDelayText: this.computeDelayTime(stopPointTime),
        }
    
        return stopTimeData;
    }

    private computeStopTime(stopTime: Date | null): string | null {
        if (stopTime === null) {
          return null
        }
    
        const stopTimeText = DateHelpers.formatTimeHHMM(stopTime);
        
        return stopTimeText;
    }

    private computeDelayTime(stopPointTime: StopPointTime): string | null {
        const delayMinutes = stopPointTime.delayMinutes ?? null;
        if (delayMinutes === null) {
            return null;
        }
    
        if (delayMinutes === 0) {
            return 'ON TIME';
        }
    
        const delayTextParts: string[] = []
        delayTextParts.push(' ')
        delayTextParts.push(delayMinutes > 0 ? '+' : '')
        delayTextParts.push('' + delayMinutes)
        delayTextParts.push("'");
    
        const delayText = delayTextParts.join('');
        return delayText;
    }
}
