# OJP Demo Config Settings

## Application (JavaScript) Settings

`angular.json`

- main Angular build settings
- created with `ng new`
- following settings were customized 
    - `architect.build.styles` - CSS styles used by the application
    - `architect.deploy` - the repo settings where the app can be deployed via [Github Pages](https://pages.github.com/)

`package.json`

- the dependencies used to build and run the application

`tsconfig.json`

- TypeScript related settings

## OJP SDK Settings

`config.ts`

- path: [./src/app/shared/ojp-sdk/config/config.ts](./../src/app/shared/ojp-sdk/config/config.ts)
- customize backend stages for the OJP APIs
- customize endpoints, authorization keys used

## OJP Demo App Settings

`map-colors.ts`

- path: [./src/app/shared/ojp-sdk/config/map-colors.ts](./../src/app/shared/ojp-sdk/config/map-colors.ts)
- customize the colors used for rendering the result leg colors and map polyline colors

`./src/app/map/app-layers/**/*.ts`

- customize Mapbox layer definitions in `./**/map-layers-def/*.json` files
- customize application map layers in subclasses of `LocationMapAppLayer`

Example for [AddressAppLayer](./../src/app/map/app-layers/address/address-app-layer.ts)

```
export class AddressAppLayer extends LocationMapAppLayer implements MapAppLayer {
  public static layerKey = 'address'
  public static geoRestrictionType: OJP.GeoRestrictionType = 'address'
  public static minZoomLevel = 17.0
  public static sourceId = 'ojp-address'
```

- the `OJP.GeoRestrictionType` with value `address` is used to filter the LocationInformationRequest results
- the map layer is available from zoom level 17.0 and above

----

CHANGELOG
- Feb 2022 - created this document