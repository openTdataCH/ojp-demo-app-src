# Project Structure

## Application Folder Structure

```
├── app

│   ├── config
│   │   └── app-config.ts ·····························| App config (stages, map app layers)

│   ├── journey ·······································| 
│   │   ├── [+] journey-result-row ····················| <journey-result-row> UI component
│   │   │   └── [+] result-trip-leg ···················|    <result-trip-leg> UI component
│   │   ├── [+] journey-results ·······················| <journey-results> UI component
        └── [+] journey-search ························| Journeys `SbbTab` UI component

│   ├── map
│   │   ├── app-map-layer  ····························| 
│   │   │   ├──map-layers-def/*/*.json·················| Mapbox Map Layer definitions
│   │   │   ├── app-map-layer.ts·······················| `AppMapLayer` - POI layer base class
│   │   │   └── map-layers-def.ts······················| Application map layers definitions
│   │   ├── controllers ·······························| 
│   │   │   ├── [+] map-layers-def ····················| Mapbox layer definitions for `TripRenderController`
│   │   │   └── trip-render-controller.ts ·············| Controller responsible for trips rendering
│   │   ├── controls
│   │   │   ├── map-debug-control.ts ··················| Map UI control with coordinates, zoom level
│   │   │   └── map-layers-legend-control.ts ··········| Map UI control with map layers visibility
│   │   ├── helpers
│   │   │   └── map.helpers.ts ························| Map static helpers (coords, bounds, etc)
│   │   ├── map.component.html ························| <app-map> UI component
│   │   ├── map.component.scss ························| "         "
│   │   └── map.component.ts ··························| "         "

│   ├── search-form
│   │   ├── [+] debug-xml-popover ·····················| <debug-xml-popover> UI component (modal)
│   │   ├── [+] input-xml-popover ·····················| <input-xml-popover> UI component (modal)
│   │   ├── [+] journey-point-input ···················| <journey-point-input> UI component (autocomplete)
│   │   ├── [+] trip-mode-type ························| <trip-mode-type> UI component

│   │   ├── search-form.component.html ················| <app-search-form> UI component
│   │   ├── search-form.component.scss ················| <app-search-form> UI component
│   │   └── search-form.component.ts ··················| <app-search-form> UI component

│   ├── shared
│   │   ├── [+] ojp-sdk ·······························| OJP TypeScript SDK (see below)
│   │   └── services
│   │       ├── map.service.ts ························| Angular service for map actions between UI components
│   │       └── user-trip.service.ts ··················| Angular service for journey state between UI components

│   ├── station-board
│   │   ├── input
│   │   │   └── [+] station-board-input ···············| <station-board-input> UI component
│   │   ├── map
│   │   │   ├── [+] station-board-map.* ···············| <station-board-map> UI component
│   │   │   └── [+] stop-event-service-renderer ·······| Map class for rendering the selected service polyline
│   │   ├── result
│   │   │   └── [+] station-board-result ··············| <station-board-result> UI component
│   │   ├── search
│   │   │   └── [+] station-board-search ··············| <station-board-search> UI component
│   │   └── [+] station-board ·························| Station Board `SbbTab` UI component

│   ├── app.component.html ····························| <app-root> App main UI component
│   ├── app.component.scss ····························| "          "
│   ├── app.component.spec.ts ·························| "          "
│   ├── app.component.ts ······························| "          "
│   ├── app.module.ts ·································| App NgModule entrypoint

├── assets
│   ├── [+] map-icons ·································| Map marker pin icons (A, B, Via)
│   ├── [+] map-style-icons····························| Map custom POIs icons
│   ├── [+] pictograms ································| Trip leg pictograms (rail, bus, walk, sharing)
│   └── opentransportdata.swiss.header-icons.svg ······| Header brand icon

├── environments
│   ├── environment.prod.ts ···························| Angular defaults, one stage (PROD)
│   └── environment.ts ································| "
├── favicon.ico ·······································| App icon
├── index.html ········································| App HTML page
├── main.ts ···········································| Angular app entrypoint
├── polyfills.ts ······································| Angular defaults
├── styles.scss ·······································| App main CSS, map marker styles
└── test.ts ···········································| Angular defaults
```

## OJP SDK Folder structure

```
ojp-sdk ···············································| ./src/app/shared/ojp-sdk
    ├── config
    │   └── map-colors.ts ·····························| Config for polyline and label trip colors

    ├── helpers
    │   ├── date-helpers.ts ···························| Date formatting static helpers
    │   ├── mapbox-layer-helpers.ts ···················| Mapbox layer expression builders
    │   ├── xml-helpers.ts ····························| XML/XSLT processor helpers
    │   └── xpath-ojp.ts ······························| XPATH query helpers

    ├── journey
    │   ├── journey-response.ts ·······················| JourneyResponse meta journey class
    │   ├── journey-section.ts ························|    └── JourneySection class - has array of TripsResponse
    │   ├── journey-service.ts ························| OJP `Service` XML node model
    │   └── public-transport-mode.ts ··················| OJP `PtMode` XML node model

    ├── location
    │   ├── address.ts ································| OJP `Address` XML node model
    │   ├── geoposition-bbox.ts ·······················| BoundingBox geo feature class
    │   ├── geoposition.ts ····························| OJP `GeoPosition` XML node model
    │   ├── location.ts ·······························| Location with aggregated info class
    │   ├── poi.ts ····································| OJP `PointOfInterest` XML node model
    │   └── stopplace.ts ······························| OJP `StopPlace` XML node model

    ├── request
    │   ├── journey-request
    │   │   ├── journey-request-params.ts ·············| Journey params(locations, mots, departure date) class
    │   │   └── journey-request.ts ····················| Journey request class - composed of multiple OJPTripRequest calls
    │   ├── location-information
    │   │   ├── location-information-request-params . ·| OJP `LocationInformationRequest` params builder
    │   │   └── location-information-request.ts ·······| OJP `LocationInformationRequest` class based on `OJPBaseRequest`
    │   ├── stop-event-request
    │   │   ├── stop-event-request-params.ts ··········| OJP `StopEvent` params builder
    │   │   └── stop-event-request.ts ·················| OJP `StopEvent` class based on `OJPBaseRequest`
    │   ├── trips-request
    │   │   ├── trips-request-params.ts ···············| OJP `TripRequest` params builder
    │   │   └── trips-request.ts ······················| OJP `TripRequest` class based on `OJPBaseRequest`
    │   ├── base-request.ts ···························| OJP API base request class
    │   ├── index.ts ··································| OJP API requests TypeScript exports
    │   └── request-error.ts ··························| OJP API request error types definitions

    ├── shared
    │   └── duration.ts ·······························| OJP `Duration` XML node model

    │   ├── stop-event 
    │   │   └── stop-event.ts ·························| OJP `StopEvent` XML node model

    ├── trip
    │   ├── leg
    │   │   ├── timed-leg
    │   │   │   ├── stop-point-time.ts ················| OJP `TimetabledTime`, `EstimatedTime` XML node models
    │   │   │   └── stop-point.ts ·····················| OJP `StopPointRef` XML node model
    │   │   ├── leg-track.ts ··························| OJP `LegTrack`, `TrackSection`
    │   │   ├── trip-continous-leg.ts ·················| OJP `ContinuousLeg`, `TransferLeg` XML node models
    │   │   ├── trip-leg-factory.ts ···················| Factory class for OJP `ContinuousLeg`, `TimedLeg`, `TransferLeg` nodes
    │   │   ├── trip-leg.ts ···························| Base class for `TripContinousLeg`, `TripTimedLeg` class
    │   │   └── trip-timed-leg.ts ·····················| OJP `TimedLeg` XML node model
    │   ├── index.ts ··································| Trip class TypeScript exports
    │   ├── link-projection.ts ························| OJP `LinkProjection` XML node model
    │   ├── path-guidance.ts ··························| OJP `PathGuidance` XML node model
    │   └── trip.ts ···································| OJP `Trip` XML node model

    ├── trips
    │   └── trips-response.ts ·························| TripRequest with array of OJP `Trip` models

    ├── types ·········································| TypeScript types
    │   ├── geo-restriction.type.ts ···················|    ├── LocationInformationRequest POI queries 
    │   ├── journey-points.ts ·························|    ├── Journey points (from, to, via)
    │   ├── map-geometry-types.ts ·····················|    ├── Map GeoJSON polylines and trip
    │   ├── stop-point-type.ts ························|    ├── Map GeoJSON polyline points type (from, to, intermediate)
    │   ├── trip-mot-type.ts ··························|    ├── Trip MOT 
    │   └── trip-stats.ts ·····························|    └── OJP `TripRequest` stats

    ├── index.ts ······································| OJP SDK TypeScript exports
```

See also
- [App Components](./app_components.md)

----

CHANGELOG
- Oct 2022 - updated with StopEvent
- Feb 2022 - created this document