# OJP Demo Config Settings

## Application (JavaScript) Settings

`angular.json`

- path: [./angular.json](./../angular.json)
- main Angular build settings
- created with `ng new`
- following settings were customized 
    - `architect.build.styles` - CSS styles used by the application
    - `architect.deploy` - the repo settings where the app can be deployed via [Github Pages](https://pages.github.com/)

`package.json`

- path: [./package.json](./../package.json)
- the dependencies used to build and run the application

`tsconfig.json`

- path: [./tsconfig.json](./../tsconfig.json)
- TypeScript related settings

## OJP Demo App Settings

`config.ts`

- path: [./src/app/config/app-config.ts](./../src/app/config/app-config.ts)
- customize backend stages for the OJP APIs
- customize endpoints, authorization keys used
- config of the map layers

`map-colors.ts`

- path: [./src/app/shared/ojp-sdk/config/map-colors.ts](./../src/app/shared/ojp-sdk/config/map-colors.ts)
- customize the colors used for rendering the result leg colors and map polyline colors

Example for map layers config

```
'stops': {
  LIR_Restriction_Type: 'stop',
  minZoom: 13,
  layer_ids: [
    'stops-circle',
    'stops-label',
  ],
  click_layer_ids: 'SAME_AS_LAYER_IDS',
},
```

- this layer used to show public transport stops
- `LIR_Restriction_Type`: what value to be used for `ojp:Restrictions/ojp:Type` inside `LocationInformationRequest` requests
- `minZoom`: above which map zoom level this map layer is displayed
- `layer_ids`: which map layer ids will be used for this app layer, in this case there are 2 layers, one for the map points (circles) and one of the labels (text) of the stations
  - configuration of the layers is in [./src/app/map/app-map-layer/](../src/app/map/app-map-layer)
  - the Mapbox layer definitions are in [./map-layers-def/**/*.json](../src/app/map/app-map-layer/map-layers-def/**/*.json) files
- `click_layer_ids`: which layers have click handlers showing a popup

----

CHANGELOG
- Oct 2022 - updated config
- Feb 2022 - created this document