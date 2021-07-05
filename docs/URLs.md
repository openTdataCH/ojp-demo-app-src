# CHANGELOG 

OJP-Demo URL: https://opentdatach.github.io/ojp-demo-app/

---- 

## Query Parameters

| Param  | Example (decoded) | Description |
|--|--|--|
|from| `8503000` for Zürich HB or `47.378173,8.540264` for same location as coordinates.|[DiDok](https://opentransportdata.swiss/de/dataset/didok) id or [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates |
|to|see `from`| |
|via| `47.044250,8.308174;47.163056,8.687139` | List of [Latitude,Longitude](https://developers.google.com/maps/documentation/javascript/reference/coordinates) coordinates separated by semi-colon `;`. |
|mot_types | `default;walk` | List of MOT types: `default`, `walk`, `self-drive-car` separated by semi-colon `;`. Number of MOT types is equal with number of via parameters + 1 . If missing it will use `default`, meaning that no `ItModesToCover` filter will be used for the [OJPTripRequest](https://opentransportdata.swiss/de/cookbook/ojptriprequest/) calls |
|trip_datetime| Trip datetime in `yyyy-MM-dd HH:mm` format | `2021-08-01 10:00` |
|stage| `prod` or `test` | To specify the OJP API backend |

## Examples

No parameters 

- [Bern to Zürich](https://opentdatach.github.io/ojp-demo-app/) - the app will prefill the from/to with Bern/Zürich endpoints and use the current date / time + PROD stage. No `ItModesToCover` will be used 
- [Bern to Rütli for Aug.1 with stop in Luzern](https://opentdatach.github.io/ojp-demo-app/?from=46.941621%2C7.462849&to=8508471&via=47.050180%2C8.310180&mot_types=default%3Bdefault&trip_datetime=2021-08-01+10%3A00&stage=prod) - the app will prefill the from/to and via points and set the datetime to Aug.1

TODO: add more examples

