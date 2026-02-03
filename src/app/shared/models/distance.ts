import * as OJP_Types from 'ojp-shared-types';
import * as OJP from 'ojp-sdk';

import { MapHelpers } from '../../map/helpers/map.helpers';

export type DistanceSource = '0.unknown'
  | '1a.trip.distance' | '1b.trip.legs-sum'
  | '2a.leg.length' | '2b.leg.track-section.length' | '2c.leg.link-projection.coords-sum';

export interface DistanceData {
  distanceM: number;
  source: DistanceSource;
}

export class DistanceHelpers {
  public static initWithLegSchema(legSchema: OJP_Types.LegSchema): DistanceData {
    const legDistance: DistanceData = {
      distanceM: 0,
      source: '0.unknown',
    };

    const trackSections: OJP_Types.TrackSectionSchema[] = [];
    const linkProjections: OJP_Types.LinkProjectionSchema[] = [];
    
    if (legSchema.timedLeg) {
      const timedLegSchema = legSchema.timedLeg as OJP_Types.TimedLegSchema;
      timedLegSchema.legTrack?.trackSection.forEach(trackSection => {
        trackSections.push(trackSection);

        if (trackSection.linkProjection) {
          linkProjections.push(trackSection.linkProjection);
        }
      });
    }

    if (legSchema.transferLeg) {
      const transferLegSchema = legSchema.transferLeg as OJP_Types.TransferLegSchema;

      transferLegSchema.pathGuidance?.pathGuidanceSection.forEach(pathGuidanceSection => {
        if (pathGuidanceSection.trackSection) {
          trackSections.push(pathGuidanceSection.trackSection);

          if (pathGuidanceSection.trackSection.linkProjection) {
            linkProjections.push(pathGuidanceSection.trackSection.linkProjection);
          }
        } 
      });
    }

    if (legSchema.continuousLeg) {
      const continuousLeg = legSchema.continuousLeg as OJP_Types.ContinuousLegSchema;
      
      const continuousLegLength = continuousLeg.length;
      if (continuousLegLength !== undefined) {
        legDistance.source = '2a.leg.length';
        legDistance.distanceM = continuousLegLength;
      }

      continuousLeg.legTrack?.trackSection.forEach(trackSection => {
        trackSections.push(trackSection);

        if (trackSection.linkProjection) {
          linkProjections.push(trackSection.linkProjection);
        }
      });

      if (trackSections.length === 0) {
        continuousLeg.pathGuidance?.pathGuidanceSection.forEach(pathGuidanceSection => {
          if (pathGuidanceSection.trackSection) {
            trackSections.push(pathGuidanceSection.trackSection);
          }
        });
      }
    }

    if ((legDistance.source === '0.unknown') && (trackSections.length > 0)) {
      trackSections.forEach(trackSection => {
        const trackSectionDistance = trackSection.length;
        if (trackSectionDistance !== undefined) {
          legDistance.distanceM = trackSectionDistance;
          legDistance.source = '2b.leg.track-section.length';
        }
      });
    }

    if ((legDistance.source === '0.unknown') && (linkProjections.length > 0)) {
      const geoPositions: OJP.GeoPosition[] = [];
      linkProjections.forEach(linkProjection => {
        linkProjection.position.forEach(position => {
          const geoPosition = new OJP.GeoPosition(position.longitude, position.latitude);
          geoPositions.push(geoPosition);
        });
      });

      if (geoPositions.length >= 2) {
        const linkProjectionDistance = MapHelpers.computeGeoPositionsDistance(geoPositions);
        if (linkProjectionDistance) {
          legDistance.source = '2c.leg.link-projection.coords-sum';
          legDistance.distanceM = linkProjectionDistance;
        }
      }
    }

    return legDistance;
  }

  public static sumDistances(dA: DistanceData, dB: DistanceData): DistanceData {
    const dC: DistanceData = {
      distanceM: dA.distanceM + dB.distanceM,
      source: dA.source,
    };

    return dC;
  }
}
