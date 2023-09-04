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

See also
- [App Components](./app_components.md)

----

CHANGELOG
- Nov 2022 - extracted OJP SDK notes
- Oct 2022 - updated with StopEvent
- Feb 2022 - created this document