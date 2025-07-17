# Application URLs

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

---- 

# 1. Journey Search

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
| lang | `de`, `en`, `fr` or `it` | Choose the ISO language in which the OJP repsonse will be deliverd, default is the browser locale. |
| from | `8503000` for Zürich HB or `47.378173,8.540264` for same location as coordinates.|[DiDok](https://opentransportdata.swiss/de/dataset/didok) id or [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates. |
| to | see `from` | |
| via | `47.044250,8.308174;47.163056,8.687139` | List of [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates separated by semi-colon `;`. |
| mode_types | `monomodal` | Mono-, multi- modal journey type switcher. List of mode types: `monomodal`, `mode_at_start`, `mode_at_end`, `mode_at_start_end`.  Multiple values (journeys with via points) are separated by semi-colon `;`. Number of the values is equal with number of via parameters + 1 |
| transport_modes | `public_transport` | The MOT used, list of possible values": `public_transport`, `walking` `cycle`, `car_self_driving`, `bicycle_rental`, `escooter_rental`, `car_sharing`. All values, except `public_transport` will set `ItModesToCover` filter in the [OJPTripRequest](https://opentransportdata.swiss/de/cookbook/ojptriprequest/) calls. Multiple values (joruneys with via points) are separated by semi-colon `;`. Number of the values is equal with number of via parameters + 1 |
| trip_datetime | `2025-08-01 10:00` | Trip datetime in `yyyy-MM-dd HH:mm` format. Other formats are working as well, i.e.  `2025-08-01`, `2025-09-17T11:15:00`, `29.Dec.2025 10:00` |
| stage | `prod` or `test` | Specify the OJP API backend, see [src/app/config/app-config.ts](https://github.com/openTdataCH/ojp-demo-app-src/blob/main/src/app/config/app-config.ts) for possible stages |
| do_search | `false` or `true` | If `true` the search will be performed after the endpoints information is init-ed. Default is `false` |
| advanced | `yes`, `no` | For `true`, `yes` values it will expand the advanced search settings panel |

## Examples

### Mono-modal

| Example | OJP 1 | OJP 2 | Comments |
|-|-|-|-|
| PublicTransport | [Bern - Zürich](https://tools.odpch.ch/beta-ojp-demo/search?from=8507000&to=8503000&do_search=yes) | [Bern - Zürich](https://tools.odpch.ch/ojp-demo-v2/search?from=8507000&to=8503000&do_search=yes) |  |
| PublicTransport, Via | [Bern - Luzern - Zürich](https://tools.odpch.ch/beta-ojp-demo/search?from=8507000&to=8503000&via=8505000&do_search=yes) | [Bern - Luzern - Zürich](https://tools.odpch.ch/ojp-demo-v2/search?from=8507000&to=8503000&via=8505000&do_search=yes) |  |
| PublicTransport, Boat | [Thun - Spiez](https://tools.odpch.ch/beta-ojp-demo/search?from=8507100&to=8507483&public_transport_modes=water) | [Thun - Spiez](https://tools.odpch.ch/ojp-demo-v2/search?from=8507100&to=8507483&public_transport_modes=water) |  |
| ATZ (car transport) | [Kandersteg - Goppenestein](https://tools.odpch.ch/beta-ojp-demo/search?from=8511171&to=8519655) | [Kandersteg - Goppenestein](https://tools.odpch.ch/ojp-demo-v2/search?from=8511171&to=8519655) |  |
| Coords - Coords | [Croy-Romainmôtier to Glis](https://tools.odpch.ch/beta-ojp-demo/search?from=46.673066,6.462309&to=46.311076,7.977560) | [Croy to Glis](https://tools.odpch.ch/ojp-demo-v2/search?from=46.695176,6.479795&to=46.311076,7.977560) |  |
| Own Car | [Bern - Zürich](https://tools.odpch.ch/beta-ojp-demo/search?from=8507000&to=8503000&transport_modes=self-drive-car) | [Spiez - Bern](https://tools.odpch.ch/ojp-demo-v2/search?from=8507483&to=8507000&transport_modes=car&do_search=yes) |  |
| Own Car + ATZ train | N / A | [Spiez - Brig](https://tools.odpch.ch/ojp-demo-v2/search?from=8507483&to=8501609&transport_modes=car&do_search=yes) |  |
| Own Car + Water Ferry | N / A | [Horgen - Meilen](https://tools.odpch.ch/ojp-demo-v2/search?from=8590653&to=8576083&transport_modes=car&do_search=yes) |  |


### Multi-modal

| Example | OJP 1 | OJP 2 | Comments |
|-|-|-|-|
| Own Bycicle + Public Transport | [Bern](https://tools.odpch.ch/beta-ojp-demo/search?from=46.952926,7.426087&to=8588998&mode_types=mode_at_start&transport_modes=cycle) | N / A |  |
| Shared Scooter + Public Transport | [Bern](https://tools.odpch.ch/beta-ojp-demo/search?from=46.952926,7.426087&to=8588998&mode_types=mode_at_start&transport_modes=escooter_rental) | N / A |  |


### Mock TEST URLs

How To

- get an OJP response API and save it to https://gist.github.com
- for example https://gist.github.com/vasile/86514397dae2038d7024f2228be476d7
- edit the file if needed
- copy the `gistId` => `86514397dae2038d7024f2228be476d7`
- load the XML content in OJP Demo App using `gist=gistId` parameter
- i.e. https://tools.odpch.ch/ojp-demo-v2/search?gist=86514397dae2038d7024f2228be476d7 for OJP 2.0 GUI

Examples

| URL | Notes |
|-----|-------|
| https://tools.odpch.ch/ojp-demo-v2/search?gist=86514397dae2038d7024f2228be476d7 | TR with `Infeasable`, `Unplanned` status |
| https://tools.odpch.ch/ojp-demo-v2/search?gist=2f9f3554a3f5b7c65ce76f04406319bb | TR with `Deviation` status |
| https://tools.odpch.ch/ojp-demo-v2/search?gist=1dff55df2c5b3167f59c093261ff4f54 | TR with `Cancelled` status |
| https://tools.odpch.ch/ojp-demo-v2/search?gist=29843eabbeaaa8e73163b0a22b511513 | TR with `Autoverladezug` |


# 2. Station Board

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
|type| `arr`, `dep` | Station board type, arrivals or departure, default value is `dep` (departures) |
|stop_id| `8503000` for Zürich HB | [DiDok](https://opentransportdata.swiss/de/dataset/didok) valid `StopRef` ids |
|day| `2022-12-01` for 1.Dec 2022 | Day used for the station board; if not given, the current day will be used |
|time| `14:20` | Time used for the station board; if not given, the current time will be used |


## Examples

- [Zürich HB](https://opentdatach.github.io/ojp-demo-app/board?stop_id=8503000) departures.
- [Bern Bahnhof](https://opentdatach.github.io/ojp-demo-app/board?type=arr&stop_id=8576646&time=15:00) arrivals for 15:00 in the current day.

----

CHANGELOG
- Aug 2024 - added `lang` param
- Oct 2022 - updated mono-, multi- modal journey examples
- Sep 2022 - adds Station Board
- Mar 2022 - adds `do_search` param
- Jul 2021 - created this document