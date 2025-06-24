# CHANGELOG 

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

----

24.June 2025
- Improves service display - [PR #249](https://github.com/openTdataCH/ojp-demo-app-src/pull/249)
  - adds better check for formatting service line name, catch cases when shortName doesnt need to be concatenated (i.e. 'IC IC1') - [EV is strangly named #178](https://github.com/openTdataCH/ojp-demo-app-src/issues/178)
  - unify formatting of the service name / color, use `JourneyService` model
  - unify `Funicular` / `Aerial` colors - [Harmonize map line / leg colors #248](https://github.com/openTdataCH/ojp-demo-app-src/issues/248)
  - fix TR url `trip_datetime` param propagation

6.June 2025
- Unify OJP versions - [PR #245](https://github.com/openTdataCH/ojp-demo-app-src/pull/245)
  - adds logic to compute `OJP_VERSION`: `1.0` or `2.0`, based on user params, path and host. Default is `2.0`
  - use [ojp-sdk-legacy](https://www.npmjs.com/package/ojp-sdk-legacy) for OJP SDK and propagate the `OJP_VERSION`, `REQUESTOR_REF` when using it

4.June 2025
- TripInfoRequest - use new SDK - [PR #243](https://github.com/openTdataCH/ojp-demo-app-src/pull/243)
  - use `ojp-sdk-next` for TripInfoRequest
  - extracts `JourneyService`, `TripInfoResult`, `StopPointCall` logic from SDK
  - adds detailed route for TripInfoRequest map polyline
  - use `src/app/config/app-config.local.ts` for local developlment

15.May 2025
- TRR XML debug popover - [PR #233](https://github.com/openTdataCH/ojp-demo-app-src/pull/233)

14.May 2025
- Updates OJP-Fare - [PR #229](https://github.com/openTdataCH/ojp-demo-app-src/pull/229)
  - migrate to use OJP Fare APIs from [ojp-sdk-next](https://www.npmjs.com/package/ojp-sdk-next) package
- Patch TimeLeg Service attribute `BA` icon - [PR #230](https://github.com/openTdataCH/ojp-demo-app-src/pull/229)
  - the `A__BA` attribute is not in the [SBB Angular](https://angular-v14.app.sbb.ch/angular/icon-overview) lib
- Fix beta URLs - [PR #231](https://github.com/openTdataCH/ojp-demo-app-src/pull/231)
- Fix Occupancy (OJP 2.0) - [PR #232](https://github.com/openTdataCH/ojp-demo-app-src/pull/232)
  - catch cases when we have only 2nd class occupancy data

09.May 2025
- Display Occupancy Level - [Occupancy in OJP 2.0 #223](https://github.com/openTdataCH/ojp-demo-app-src/issues/223), [PR #253](https://github.com/openTdataCH/ojp-demo-app-src/pull/225)
- Display Situation InfoLink - [TR / Siri Situations - Display labels / hyperlinks #224](https://github.com/openTdataCH/ojp-demo-app-src/issues/224), [https://github.com/openTdataCH/ojp-demo-app-src/pull/226](https://github.com/openTdataCH/ojp-demo-app-src/pull/226)
- Fix SER Request in OJP v1 (SDK) - [Fix SER Request OJPv1 #162](https://github.com/openTdataCH/ojp-js/issues/162)
- Fix stage URLs - [PR #228](https://github.com/openTdataCH/ojp-demo-app-src/pull/228)

02.May 2025
- Catch `changeWithinVehicle` for Flügelzüge - [PR #222](https://github.com/openTdataCH/ojp-demo-app-src/pull/222)
  - catch TransferLeg `changeWithinVehicle` flag for OJP 2.0
  - refactor trip info to show information when the legs were merged

30.April 2025
- [Unify OJP 1.0 and 2.0 SDK / Update design / TRR Feature #220](https://github.com/openTdataCH/ojp-demo-app-src/pull/220)
  - unify OJP 1.0 and 2.0 SDK features - [Unify OJP 1.0 and 2.0 SDK code #155](https://github.com/openTdataCH/ojp-js/pull/155)
    - deprecates current version of `ojp-js` and use it under `OJP_Legacy` namespace
    - adds conditional code to distinguish features between OJP 1.0 and OJP 2.0
  - TRR for indvidual trips - [TRR PoC #207](https://github.com/openTdataCH/ojp-demo-app-src/issues/207)
    - use [ojp-sdk-next](https://www.npmjs.com/package/ojp-sdk-next) package for TRR API call
    - 1st version, full-replace of the trip with the new one
  - redesign webapp - [Redesign OJP DemoApp TR view #168](https://github.com/openTdataCH/ojp-demo-app-src/issues/168)
    - full-width, tablet-like design
    - map takes full height
    - scrollable content for trip leg results
    - responsive footer / header heights for small devices
  - toggle display of link projection for each leg - [TR GUI: display LinkProjection button toggle #214](https://github.com/openTdataCH/ojp-demo-app-src/issues/214)
    - allow zoom to leg / endpoints and intermediary stops - [OJP DemoApp: Harmonize trip leg click handlers #219](https://github.com/openTdataCH/ojp-demo-app-src/issues/219)
  - [remove EFA-11 #216](https://github.com/openTdataCH/ojp-demo-app-src/issues/216)

2.April 2025
- set OJP `UseRealtimeDataEnumeration` in GUI - [PR #213](https://github.com/openTdataCH/ojp-demo-app-src/pull/213)
  - only in OJP v2.0
  - [Selection for UseRealtimeData in OJP 2.0 #209](https://github.com/openTdataCH/ojp-demo-app-src/issues/209)
- updates service attributes - [PR #212](https://github.com/openTdataCH/ojp-demo-app-src/pull/212)
  - [TR: catch attributes that are not standard #210](https://github.com/openTdataCH/ojp-demo-app-src/issues/210)
- updates OJP requests - [PR #211](https://github.com/openTdataCH/ojp-demo-app-src/pull/211)
  - disable OJP request flags for OJP v1.0 calls
- use latest OJP SDK package - `ojp-sdk-v1`, version `0.17.3`

14.March 2025
- adds fixes for OJP-SI - [PR #205](https://github.com/openTdataCH/ojp-demo-app-src/pull/205)
- avoid double `--` for delays - [PR #206](https://github.com/openTdataCH/ojp-demo-app-src/pull/206)
- use latest OJP SDK

3.March 2025
- updates Fares API - [PR #199](https://github.com/openTdataCH/ojp-demo-app-src/pull/199)
- adds OJP-SI support - [PR #202](https://github.com/openTdataCH/ojp-demo-app-src/pull/202)
- adds EFA11 DEV stage - [PR #203](https://github.com/openTdataCH/ojp-demo-app-src/pull/203)
- use latest OJP SDK

15.December 2024
- Updates NOVA fares - [PR #194](https://github.com/openTdataCH/ojp-demo-app-src/pull/194)
- use latest OJP SDK

10.December 2024
- Refactor geo bindings - [PR #191](https://github.com/openTdataCH/ojp-demo-app-src/pull/191)
  - use latest version of OJP SDK
  - extract mapbox-gl types form SDK into the GUI
  - extract GeoJSON creation and map related config from SDK
- Improve TripRequest params - [PR #192](https://github.com/openTdataCH/ojp-demo-app-src/pull/192)
  - updates example [URLs](https://github.com/openTdataCH/ojp-demo-app-src/blob/main/docs/URLs.md)
  - show multi-modal dropdown / params only to OJP v2
  - reset the `NumberOfResults` params when switching to/from `car` transport mode  

27.November 2024
- Improve TripRequest + TripInfoRequest - [PR #186](https://github.com/openTdataCH/ojp-demo-app-src/pull/186)
  - show platform assistance in the TripInfoRequest page
  - handle `A__GF` attribute - [Show "Grossraumprofil" #180](https://github.com/openTdataCH/ojp-demo-app-src/issues/180)
  - handle `ATZ` train icons
  - adapt logic for showing additional restrictions, always display it for non-`monomodal` modes
- adds DEV features - [PR #188](https://github.com/openTdataCH/ojp-demo-app-src/pull/188)
- use latest OJP SDK

22.November 2024
- SER/TIR: Updates StationBoard / TripInfo - [PR #182](https://github.com/openTdataCH/ojp-demo-app-src/pull/184)
  - SER: display service info and links to TIR popover - [Link from SER page to TIR page #171](https://github.com/openTdataCH/ojp-demo-app-src/issues/171)
  - SER: adds test URLs in station board (dev)
  - SER: display station header text
  - TIR: allow to choose TR endpoints for testing journeys
  - TR: display trip header text
  - TR: propagate service day ref - [Use the selected date when calling popovers for TIR in JourneysTab #176](https://github.com/openTdataCH/ojp-demo-app-src/issues/176)
  - fixes dev.simo.si URL (dev)
- TR: adds GUI filter for public transport modes - [PR #182](https://github.com/openTdataCH/ojp-demo-app-src/pull/182)
  - [Adds mean of transport (bus, boat, etc.) option in the TR #170](https://github.com/openTdataCH/ojp-demo-app-src/issues/170)
- TR:update GUI for NumberOfResults - [PR #183](https://github.com/openTdataCH/ojp-demo-app-src/pull/183)

29.October 2024
- updates platform assistance [PR #172](https://github.com/openTdataCH/ojp-demo-app-src/pull/172)
  - [New BehiG Info Icon #169](https://github.com/openTdataCH/ojp-demo-app-src/issues/169)
- display `TopographicPlace` as map layer [PR #173](https://github.com/openTdataCH/ojp-demo-app-src/pull/173)
  - [New Element "Topographic place" in "Toggle Map Layers" list #92](https://github.com/openTdataCH/ojp-demo-app-src/issues/92)
- adds new DEV server [PR #174](https://github.com/openTdataCH/ojp-demo-app-src/pull/174)
  - [New Instance for Beta #165](https://github.com/openTdataCH/ojp-demo-app-src/issues/165)
- adds `Cancelled`, `Deviation` and `Unplanned` flags in Station Board [PR #175](https://github.com/openTdataCH/ojp-demo-app-src/pull/175)
  - [mark cancelled journey in the station board #94](https://github.com/openTdataCH/ojp-demo-app-src/issues/94)
- use latest OJP SDK

07.October 2024
- Improve Trips [PR #166](https://github.com/openTdataCH/ojp-demo-app-src/pull/166)
  - allow additional trip restrictions to be turned on/off individually - [Changing the Monomodal Walk #114](https://github.com/openTdataCH/ojp-demo-app-src/issues/114)
  - updates `DebugXML` popover 
    - allow copy to clipboard - [copy to clipboard for request and response #123](https://github.com/openTdataCH/ojp-demo-app-src/issues/123)
    - strip `LinkProjection` in XML response 
    - harmonize across Journey Search / Station Board /  Trip Info pages
  - adds via dwell time - [Implement Via DwellTime #164](https://github.com/openTdataCH/ojp-demo-app-src/issues/164)
  - discard NOVA products that are not 1st or 2nd class - see [ojp-nova#49](https://github.com/openTdataCH/ojp-nova/issues/49#issuecomment-2393912586)
  - bug fixes
    - fix pagination number of results param
    - fix showing trips with situations missing `Description`
  - use latest OJP SDK

17.September 2024
- Improve Trips [PR #161](https://github.com/openTdataCH/ojp-demo-app-src/pull/161)
  - use OJP `Via` for journeys - [Implement VIA in OJP (GUI and SDK) #151](https://github.com/openTdataCH/ojp-demo-app-src/issues/151)
  - display TimedLeg with status cancelled / deviation / unplanned and `notServiced` stops
  - use `NumberOfResults` only for public transport requests
  - display station board situations for `Service`
  - add reset datetime control
  - use latest OJP SDK

28.August 2024
- Display OJP fares [PR #158](https://github.com/openTdataCH/ojp-demo-app-src/pull/158)
  - display fares using `OJP.NovaFareParser`
- Localization support [PR #157](https://github.com/openTdataCH/ojp-demo-app-src/pull/157)
  - use `0.11.1` version of [ojp-js](https://github.com/openTdataCH/ojp-js) SDK
  - adds support for language in which the OJP API will return the results, default is the browser locale otherwise can be set via the `lang` query param - see [Application URLs](https://github.com/openTdataCH/ojp-demo-app-src/blob/main/docs/URLs.md)

27.August 2024
- Updates situations/traffic/real-time info [PR #155](https://github.com/openTdataCH/ojp-demo-app-src/pull/155)
  - use `0.10.1` version of [ojp-js](https://github.com/openTdataCH/ojp-js) SDK
  - allow to display SIRI-SX situations with multiple descriptions
  - adds support for trips with `Cancelled`, `Infeasable` Trip status
  - adds support for `NotServicedStopa property for TimedLeg stops
  - move the logic for `StationBoardModel` from the SDK into the GUI

26.August 2024
- display service trip info in a popover / standalone tab - [PR #154](https://github.com/openTdataCH/ojp-demo-app-src/pull/154)
- paginate results, display prev / next connections - [PR #153](https://github.com/openTdataCH/ojp-demo-app-src/pull/153) 
- display heading text - [Display Service DestinationText #146](https://github.com/openTdataCH/ojp-demo-app-src/issues/146), [PR #153](https://github.com/openTdataCH/ojp-demo-app-src/pull/153) 
- use `0.9.36` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK

02.July 2024
- use `0.9.35` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK
- allow trip legs to be merged in case of `remainInVehicle` leg type - [remainInVehicle as symbol #125](https://github.com/openTdataCH/ojp-demo-app-src/issues/125)
- improve trips rendering - [PR #144](https://github.com/openTdataCH/ojp-demo-app-src/pull/144)
- fix shared mobility POI layers - [PR #142](https://github.com/openTdataCH/ojp-demo-app-src/pull/142)
- adds car-ferry support - [PR #143](https://github.com/openTdataCH/ojp-demo-app-src/pull/143)

03.June 2024
- restore `self-drive-car` for monomodal own car searches - [Fix TR params #141](https://github.com/openTdataCH/ojp-demo-app-src/pull/141)

17.May 2024
- use `0.9.33` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK
- adapt the LIR requests for the new API - [Fix restriction types #136](https://github.com/openTdataCH/ojp-demo-app-src/pull/136)
- adds support for car shuttle train (Autoverladezug) - [Feature: Car shuttle train #137](https://github.com/openTdataCH/ojp-demo-app-src/pull/137)
- adds support for loading TR Response XML from external gists - [Load TripRequest XML from a Github gist #138](https://github.com/openTdataCH/ojp-demo-app-src/pull/138)
- fix StationBoard StopEvent XML mocks - [Fix StopEvent XML mocks #139](https://github.com/openTdataCH/ojp-demo-app-src/pull/139)

24.March 2024
- use `0.9.32` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK
- display `JourneyService` attributes - [Fix POI shared mobility #135](https://github.com/openTdataCH/ojp-demo-app-src/pull/135)

10.March 2024
- use `0.9.31` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK
- fix for shared mobility informtaion for POIs - [Fix POI shared mobility #133](https://github.com/openTdataCH/ojp-demo-app-src/pull/133)

02.March 2024
- use `0.9.29` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK
- adds support for `dep`/`arr` boarding type for journey searches - [PR #132](https://github.com/openTdataCH/ojp-demo-app-src/pull/132)

16.February 2024
- use `0.9.25` version of [OJP JS](https://github.com/openTdataCH/ojp-js) SDK
- use new SDK constructs for request / response - [PR #129](https://github.com/openTdataCH/ojp-demo-app-src/pull/129)
- display platform assistance - [PR #130](https://github.com/openTdataCH/ojp-demo-app-src/pull/130)

15.January 2024
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) SDK version
- use SDK SAX parser - [PR #127](https://github.com/openTdataCH/ojp-demo-app-src/pull/127)

09.January 2024
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) SDK version
- display also trips without `ojp:Trip/ojp:Distance`, compute it from individual legs via `TrackSection` - [PR #126](https://github.com/openTdataCH/ojp-demo-app-src/pull/126)

12.November 2023
- add `NumberOfResults`support `LA Beta` stage - [NumberOfResultsAfter not valid without NumberOfResultsBefore #108](https://github.com/openTdataCH/ojp-demo-app-src/issues/108#issuecomment-1737492842), [PR #119](https://github.com/openTdataCH/ojp-demo-app-src/pull/119)

28.October 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- fix handling of coordinates in permalinks - [PR #118](https://github.com/openTdataCH/ojp-demo-app-src/pull/118)

15.October 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- add [SIRI-SX](https://opentransportdata.swiss/en/siri-sx/) messages in station board - [displaying situations on the station board #7](https://github.com/openTdataCH/ojp-demo-app/issues/7), [PR #117](https://github.com/openTdataCH/ojp-demo-app-src/pull/117)

08.October 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- implement embed popovers for [#45 - Embed OJP Demo in other websites](https://github.com/openTdataCH/ojp-demo-app-src/issues/45), [PR #115](https://github.com/openTdataCH/ojp-demo-app-src/pull/115)
- display more POI layers [adapt POI categories #5](https://github.com/openTdataCH/ojp-demo-app/issues/5), [PR #116](https://github.com/openTdataCH/ojp-demo-app-src/pull/116)

10.September 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- add [SIRI-SX](https://opentransportdata.swiss/en/siri-sx/) messages support - [displaying events and incidents #3](https://github.com/openTdataCH/ojp-demo-app/issues/3), [PR #113](https://github.com/openTdataCH/ojp-demo-app-src/pull/113)

04.September 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- adds limousine mode support - [PR #112](https://github.com/openTdataCH/ojp-demo-app-src/pull/112), [OJP demo app extension #87](https://github.com/openTdataCH/ojp-demo-app-src/issues/87)
- removes `own car` when using `Mode at Start` - [Mode not correct in request #109](https://github.com/openTdataCH/ojp-demo-app-src/issues/109)

20.August 2023
- update OJP API stages / keys - see [#107 - Change OJP URLs and add new Tyk-Keys](https://github.com/openTdataCH/ojp-demo-app-src/issues/107)

02.July 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
  - `NumberOfResultsAfter` is now default in the OJP.TripRequest calls
  - use `PrivateModeFilter` for the OJP APIs calls - see [#2 - Routing with station board for car transport service](https://github.com/openTdataCH/ojp-demo-app/issues/2)
- allow Station Board to debug `OJP.StopEventRequest` request + response API calls - see [#2 - Routing with station board for car transport service](https://github.com/openTdataCH/ojp-demo-app/issues/2)
- adds `embed/search` and `embed/board` paths for [#45 - Embed OJP Demo in other websites](https://github.com/openTdataCH/ojp-demo-app-src/issues/45)
- display correct real-time information - see [#93 - Change display time in case of delay](https://github.com/openTdataCH/ojp-demo-app-src/issues/93) + display adjusted platform, if changed
- optimize app build size (remove mocks from the deploy bundle)

23.May 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
  - `ojp:DepArrTime` param is back

21.May 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- adjust display times - [#93 Change display time in case of delay](https://github.com/openTdataCH/ojp-demo-app-src/issues/93)
- display `Nextbike` shared mobility POIs
- bring back removed travel modes - [#99 Missing e-Scooter Mode](https://github.com/openTdataCH/ojp-demo-app-src/issues/99)
- enable taxi travel mode - [#87 OJP demo app extension](https://github.com/openTdataCH/ojp-demo-app-src/issues/87)

07.April 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- cleanup external libs inclusion

19.March 2023
- use latest [OJP JS](https://github.com/openTdataCH/ojp-js) version
- improve mono-/multi- modal trip request parameters - [PR #95](https://github.com/openTdataCH/ojp-demo-app-src/pull/95), [NumberOfResult should not be 0 #81](https://github.com/openTdataCH/ojp-demo-app-src/issues/81)
- improve map layers - [PR #96](https://github.com/openTdataCH/ojp-demo-app-src/pull/96), [Number of Bikes at Bikestations #88](https://github.com/openTdataCH/ojp-demo-app-src/issues/88)
  - add customized popups for shared mobility POI layers
  - show number of shared mobility vehicles in the popup / map
- group the autocomplete `Location` results by: stops, POIs, TopographicPlaces, Addresses - [PR #97](https://github.com/openTdataCH/ojp-demo-app-src/pull/97), [Distinguish POI and StopPoint #74](https://github.com/openTdataCH/ojp-demo-app-src/issues/74)
- filter autocomplete to show only stops in StationBoard tab - [PR #98](https://github.com/openTdataCH/ojp-demo-app-src/pull/98)

19.February 2023
- display relevant info for charging stations - [PR #89](https://github.com/openTdataCH/ojp-demo-app-src/pull/89), [Showing multiple Charging Points of One Charging Station #68](https://github.com/openTdataCH/ojp-demo-app-src/issues/68)
- display taxi and booking arrangements - [PR #90](https://github.com/openTdataCH/ojp-demo-app-src/pull/90), [OJP demo app extension #87](https://github.com/openTdataCH/ojp-demo-app-src/issues/87)
- extends the SDK for more OnDemand bus modes - [OJP SDK - PR #10](https://github.com/openTdataCH/ojp-js/pull/10)

22.January 2023
- adds fix for LA Beta stage to handle StopPlaceRefs from query string
- adds support for TopographicPlace in OJP.Location - see OJP SDK [#7](https://github.com/openTdataCH/ojp-js/pull/7)
- uses latest version of OJP SDK - see OJP SDK [CHANGELOG](https://github.com/openTdataCH/ojp-js/blob/main/CHANGELOG.md)

14.January 2023
- fix to use the stage from query string - [#PR 84](https://github.com/openTdataCH/ojp-demo-app-src/pull/84)

18.December 2022
- Use new API stage - [#PR 78](https://github.com/openTdataCH/ojp-demo-app-src/pull/78), [Demo-App add INT as system to select #72](https://github.com/openTdataCH/ojp-demo-app-src/issues/72)
- Adds debug XML for station board - [#PR 79](https://github.com/openTdataCH/ojp-demo-app-src/pull/79), [Stationboard could use some extensions #67](https://github.com/openTdataCH/ojp-demo-app-src/issues/67)
- Adds switch for search endpoints - [#PR 80](https://github.com/openTdataCH/ojp-demo-app-src/pull/79), [Switch Origin<>Destination #48](https://github.com/openTdataCH/ojp-demo-app-src/issues/48)

27.November 2022
- Use OJP SDK - [#PR 75](https://github.com/openTdataCH/ojp-demo-app-src/pull/75), [Create OJP SDK package #46](https://github.com/openTdataCH/ojp-demo-app-src/issues/46)
- Harmonize Mobility Text - [#PR 76](https://github.com/openTdataCH/ojp-demo-app-src/pull/76), [Wrong text for mobility description #71](https://github.com/openTdataCH/ojp-demo-app-src/issues/71)

13.November 2022
- Fix monomodal cycle/walk requests - [#PR 73](https://github.com/openTdataCH/ojp-demo-app-src/pull/73), [Correct Request for cycling path #64](https://github.com/openTdataCH/ojp-demo-app-src/issues/64)

06.November 2022
- Quick fixes - [#PR 69](https://github.com/openTdataCH/ojp-demo-app-src/pull/69)
    - align date/time controls in journey search tab
    - fix errors shown in the case of amenity POIs which dont have subCategory
- Station Board Controls - [#PR 70](https://github.com/openTdataCH/ojp-demo-app-src/pull/70)
    - OJP SDK StopEvent - adds helpers for delay info, add support for datetime (see below)
    - adds control for custom station board date / time - [#65 Date and Time picker for "Station Board"](https://github.com/openTdataCH/ojp-demo-app-src/issues/65)
    - adds control for arrivals / departures - [#66 New radio button for departures/arrivals switch at StationBoard](https://github.com/openTdataCH/ojp-demo-app-src/issues/66)

09.October 2022
- Updated Docs - see [#PR 63](https://github.com/openTdataCH/ojp-demo-app-src/pull/63)

02.October 2022
- Map POIs feature - see [#57](https://github.com/openTdataCH/ojp-demo-app-src/issues/57), [#PR 61](https://github.com/openTdataCH/ojp-demo-app-src/pull/61)
    - moved the map layers legend on top-right of the map
    - adds custom POI icons based on category/subcategory
    - enable multiple POI categories via `LocationInformationRequest` requests
- Improve `OJP:TripRequest` requests for monomodal journeys - [#PR 62](https://github.com/openTdataCH/ojp-demo-app-src/pull/62)
    - Use `<ojp:NumberOfResults>0</ojp:NumberOfResults>` when monomodal and custom modes are enabled

18.September 2022
- Station Board Tab - see [#49](https://github.com/openTdataCH/ojp-demo-app-src/issues/49), [#PR 60](https://github.com/openTdataCH/ojp-demo-app-src/pull/60)
    - adds new component `StationBoardComponent`, mounted as separate `SbbTab` on route `/board`
    - the user can enter a station for lookup 
    - or supply a StopRef as `stop_id` GET parameter i.e. `/board?stop_id=8503000`
    - or pick a station from the map

03.September 2022
- Fixes for TEST LA stage - see [#PR 59](https://github.com/openTdataCH/ojp-demo-app-src/pull/59)
    - limit TripRequest number of results to 1
    - reload endpoints stop IDs when changing the app stage

27.August 2022
- Adds full support for mono- / multi- modal journeys - see [#51](https://github.com/openTdataCH/ojp-demo-app-src/issues/51), [#PR 58](https://github.com/openTdataCH/ojp-demo-app-src/pull/58)

19.August 2022
- Angular v14 update + [SBB Angular v14](https://angular.app.sbb.ch/) update

20.July 2022
- OJP SDK
    - adds fallback for constructing a `StopPlace` also from a `StopPoint` node
    - adds support for origin / destination of the `JourneyService`
    - adds actual platform (when available) to `StopPoint`
- refactor map app layers definition, add 'Charging Stations' and Shared (Cars, Bycicles and Scooters) layers: [#51](https://github.com/openTdataCH/ojp-demo-app-src/issues/51), [#52](https://github.com/openTdataCH/ojp-demo-app-src/issues/52), [#53](https://github.com/openTdataCH/ojp-demo-app-src/issues/53).

26.June 2022
- Add support for additional public transport pictograms - see [#47 Add all PtMode of Transport (except air)](https://github.com/openTdataCH/ojp-demo-app-src/issues/47).
- OJP SDK: add `StopEvent` and `StopEventRequest` to build `OJPStopEventRequest` requests - see [#49 - SDK to include StopEventRequest](https://github.com/openTdataCH/ojp-demo-app-src/issues/49)

05.May 2022
- Fix for the initial stops lookup, for `PlaceRef` stop_ids (an empty) `LocationName` is required
- TEST LA stop labels are trimmed if stopRef is too long (check in Innsbruck area)

13.Mar 2022
- Added support to automatic perform the search via `do_search` query param
- Split the results / map for `-md` and smaller screens

27.Feb 2022
- Updates documentation - [./docs](https://github.com/openTdataCH/ojp-demo-app-src/tree/main/docs)
- Updates OJP API key
- Fix the bug which prevented the via point to be added after selecting on the map

31.Jan 2022
- Updates TEST, TEST LA servers with CORS support
- Remove TEST LA hacks - use stop IDs from LocationInformationRequest lookup for TripRequest queries

25.Jan 2022
- Updates TEST server

30.Aug 2021
- Adds planned platform in the SDK, display it in timed legs, when available. See [#15 - Enrich Leg Component](https://github.com/openTdataCH/ojp-demo-app-src/issues/15)

29.Aug 2021
- Display estimated times, including delays, when available. See [#15 - Enrich Leg Component](https://github.com/openTdataCH/ojp-demo-app-src/issues/15)

27.Aug 2021
- Format legs. See [#15 - Enrich Leg Component](https://github.com/openTdataCH/ojp-demo-app-src/issues/15)
- Make endpoints clickable and center the location on map

24.Aug 2021
- Use a proxy server for TEST-LA requests. See [#8 - Add new stage: TEST LA](https://github.com/openTdataCH/ojp-demo-app-src/issues/8)
- If TEST-LA use PROD type-ahead station lookups otherwise the iinternational stops (i.e. Feldkirch) don't work as expected.
- Prevent cases when multimodal journeys fail to show because there are no trips to match the monomodal section. 

13.Aug 2021
- Add support for TEST-LA stopRef IDs `OJP:STOP:SBB:8503000|Zurich HB@MRCV:950692:5995977`. See [#8 - Add new stage: TEST LA](https://github.com/openTdataCH/ojp-demo-app-src/issues/8)

06.Aug 2021
- Fix showing 'non-stop' for 'direct' trips. See [#19 - Fix non-stop in trips information - 0 changes](https://github.com/openTdataCH/ojp-demo-app-src/issues/19)
- Fix 3rd party components vulnerabilitie issue. See [#18 - Fix Github vulnerabilities report](https://github.com/openTdataCH/ojp-demo-app-src/issues/18)
- Add links to Github, opentransportdata.swiss. See [#20 - Add links in header](https://github.com/openTdataCH/ojp-demo-app-src/issues/20)

04.Aug 2021
- Display an error message when theer are TripRequest server/XML errors. See [#16 - Handle server issues](https://github.com/openTdataCH/ojp-demo-app-src/issues/16)
- Handle 0-results. See [#17 - Handle 0-results](https://github.com/openTdataCH/ojp-demo-app-src/issues/17)

30.Jul 2021
- Adds TEST LA(Linking Alps) stage. See [#8 - Add new stage: TEST LA](https://github.com/openTdataCH/ojp-demo-app-src/issues/8)
- Updates LocationInformationRequest with required parameters. See [#13 - LocationName is required in TripRequest](https://github.com/openTdataCH/ojp-demo-app-src/issues/13) + [#9 POI no longer visible](https://github.com/openTdataCH/ojp-demo-app-src/issues/9)

29.Jul 2021
- Updates TripRequest required parameters in SDK. See [#13 - LocationName is required in TripRequest](https://github.com/openTdataCH/ojp-demo-app-src/issues/13)
- Add support to user to enter custom TripRequest XML. See [#10 - Label different](https://github.com/openTdataCH/ojp-demo-app-src/issues/10).

27.Jul 2021
- Change custom XML wording. See [#10 - Label different](https://github.com/openTdataCH/ojp-demo-app-src/issues/10).

26.Jul 2021
- fix bug that markers weren't updated for custom TripRequest response XML. See [#7 - Being able to add a request in a window (copy/paste) and visualise the results like the rest](https://github.com/openTdataCH/ojp-demo-app-src/issues/7).

25.Jul 2021
- allow user to debug TripRequest response XML. See [#7 - Being able to add a request in a window (copy/paste) and visualise the results like the rest](https://github.com/openTdataCH/ojp-demo-app-src/issues/7). Sample response: [Meilen-Gurten](https://gist.github.com/vasile/b01deecdf8573cc7bbc8eca0bab37873).

21.Jul 2021
- display turn-by-turn transfer descriptions, when available. See [#5 - Turn Description for legs](https://github.com/openTdataCH/ojp-demo-app-src/issues/5). 

19.Jul 2021
- display additional information for trip header. The timed/transfer legs have also duration information. See [#4 - More information in the trip header](https://github.com/openTdataCH/ojp-demo-app-src/issues/4). 
- OJP SDK: unify legDuration for all TripLeg (not only Continous)

15.Jul 2021
- display request/response XML for map layers (LocationInformationRequest) and for each indvidual journey section. See [#3 - Copying Requests](https://github.com/openTdataCH/ojp-demo-app-src/issues/3) and [#2 POI for P&R and Donkey Rep obtained by Location Information Request](https://github.com/openTdataCH/ojp-demo-app-src/issues/2)

14.Jul 2021
- allow to change MOT also for no-via journeys - see [#1 - Transportmode Setting also, when there are no vias](https://github.com/openTdataCH/ojp-demo-app-src/issues/1)

07.Jul 2021
- user can center/zoom on VIA input elements
- remove guidance polylines
- use P+Rail and BicycleRental POI layers from OJP LocationInformationRequest

06.Jul 2021
- use LegTrack (detailed paths) also for OnDemandMode services
- display monomodal trips for walking, shared mobility (cycle) and self-drive car. See [URLs](./docs/URLs.md)
- when from/to are given the map will fit the bounds that includes the journey points (via included)
- fix Firefox issue, the application didn't work due to a XSLTProcessor issue - isolated and addressed the issue

05.Jul 2021
- allow the user to change from/to/via/MOT types/stage/date via query parameters
- permanent URLs for easy copy/paste of the journeys
- added [URLs](./docs/URLs.md) for URL query parameters documentation
- refactor the trip service params storage

30.Jun 2021
- patch leg locations with LegTrack end coordinates (when available)

29.Jun 2021
- via endpoints are draggable
- use LegTrack (detailed routes) only for Rail timed legs. Otherwise default to beeline (with intermediary points)

28.Jun 2021
- adds via markers (right click for coords or from stops/P+Rail/DonkeyRep popups)
- add support for multi-modal journeys - i.e. self-driving + OV
- disabled XML debug (will be re-introduced after journey/trip response refactor)

24.Jun 2021
- add P+Rail POI layer from https://www.sbb.ch/en/station-services/at-the-station/parking-station/park-and-rail.html
- add DonkeyRepublic POI layer from https://sharedmobility.ch/gbfs.json
- better handling of the click feature and prevent showing multiple popups

23.Jun 2021
- add support for OnDemand timed legs
- format leg leading texts (types, service numbers)
- GUI: separate search/results components
- add debug XML info dialogs and search duration result
- (dev) add mocks support (to check ondemand calls when test is down)

21.Jun 2021
- refactor map trip renderer, use config for colors, types
- new style for leg endpoints, detailed tracks and walking legs
- show TimedLeg intermediary points (stops)

18.Jun 2021
- add visual indicator for search

17.Jun 2021
- draw trip legs (beelines, endpoints and legTrack where available)
- changed the trip/legs result, add support to center the map for each leg
- draw also timedlegs when available

15.Jun 2021
- fix isse that different dates than now() were discareded

14.Jun 2021
- adds 'address' and 'poi' map app layers to display the LIR Location data
- adds a layers map legend control where we can control the layers visibility

13.Jun 2021
- quick map markers design
- user can right-click and use coords for from/to
- show public transport stops (above zoom level 13)
- snap to stops when dragging markers
- use stops for from/to when clicking

11.Jun 2021
- updates map controls (zoom, scale, debug coordinates)
- allow zoom/center the map on from/to input fields
- use stages config for API requests 
- adds GUI to change the stage (in search form for now)

10.Jun 2021
- introduce UserTripJourney to share the from/to locations between map and search components
- prefill the search with default locations
- markers are draggable - moving them enables latlng input support

09.Jun 2021
- adds OJP TripRequest, Trip and journey classes
- hooks OJP TripRequest API to the search form
- adds markers for the from/to Location
- renders basic results via SBB's SbbAccordionModule

03.Jun 2021
- adds search form with autocomplete for `from`, `to` form fields + date/time pickers
- hooks OJP LocationInformation request queries to the autocomplete fields
- adds dummy map, no connection with the search form

28.May 2021
- bootstrap Angular and [@sbb-esta/angular-business](https://angular.app.sbb.ch/business/introduction/getting-started) components
- basic layout and setup GH Pages deployment at https://github.com/openTdataCH/ojp-demo-app-src
