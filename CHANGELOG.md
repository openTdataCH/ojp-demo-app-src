# CHANGELOG 

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

----

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
