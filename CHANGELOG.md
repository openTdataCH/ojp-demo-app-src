# CHANGELOG 

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

----

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
