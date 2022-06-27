import { XPathOJP } from '../helpers/xpath-ojp'
import { StopPoint } from '../trip/leg/timed-leg/stop-point'
import { JourneyService } from '../journey/journey-service'
import { Location } from '../location/location';

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
}
