# OJP Demo App

This is the source-code repository used for developing and deploying [OJP Demo](https://opentdatach.github.io/ojp-demo-app/) web-application.

![OJP_Demo](./docs/img/OJP_Demo.jpg)

## Quick Resources

- https://opentdatach.github.io/ojp-demo-app/ - production URL
- [docs](./docs/README.md) - documentation main page
- [CHANGELOG](./CHANGELOG.md) - deployment changes

## Current Development Status

Javascript SDK branches

| OJP | Branch | NPM | Demo App | Description |
|-|-|-|-|-|
| v1.0 | [ojp-js#ojp-v1](https://github.com/openTdataCH/ojp-js/tree/feature/ojp-v1) | [ojp-sdk-v1](https://www.npmjs.com/package/ojp-sdk-v1) | <ul><li>[PROD](https://opentdatach.github.io/ojp-demo-app/search)</li><li>[BETA v1](https://tools.odpch.ch/beta-ojp-demo/search)</ul> | original SDK, receives bug fixes or critical features needed for OJP 1.0  |
| v2.0 | [ojp-js#ojp-v2](https://github.com/openTdataCH/ojp-js/tree/feature/ojp-v2) | Github branch | [BETA v2](https://tools.odpch.ch/ojp-demo-v2/search) | original SDK, receives all features until `ojp-sdk-next` branch is merged to main |
| v2.0 | [ojp-js#ojp-sdk-next](https://github.com/openTdataCH/ojp-js/tree/feature/ojp-sdk-next) | [ojp-sdk-next](https://www.npmjs.com/package/ojp-sdk-next) - temporarely, long-term will be published under `ojp-sdk` | under development | new SDK code with models derived from XSD schema, this will be the main development reference for OJP JS SDK |

Code / Demo App Implementation

| Code Place | LIR | SER | TR | TIR | FR | TRR | Comments |
| - | - | - | - | - | - | - | - |
| ojp-js (legacy SDK) | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | - | - | TRR is only available for OJP v2.0 |
| ojp-sdk-next (new SDK) | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |  |
| DemoApp Beta | `legacy` | `legacy` | `legacy` | `ojp-sdk-next` | `ojp-sdk-next` | `ojp-sdk-next` | `legacy` is the old SDK (OJP v1 and v2, see above) |

- LIR - LocationInformationRequest
- SER - StopEventRequest
- TR - TripRequest
- TIR - TripInfoRequest
- FR - FareRequest
- TRR - TripRefineRequest

## Install & Development server

Requirements:
- [Node.js](https://nodejs.org/en/), [npm](https://www.npmjs.com/)
- [Angular](https://angular.io/guide/setup-local#install-the-angular-cli), version 14.x was used to generate this project via `ng new` CLI command.

Installation steps:
- clone this repo
- install dependencies via npm
```
npm install
```
- serve development server via `ng serve` cli
```
ng serve
```
- navigate to [http://localhost:4200](http://localhost:4200/) in the browser

## Deploy to production

[Github Pages](https://pages.github.com/) is used to publish and host the OJP Demo app.

- run `ng deploy` to deploy the app. 
- the CLI will bundle the app files and assets in production mode and upload them to `gh-pages` branch of https://github.com/openTdataCH/ojp-demo-app 
- read/write access is needed to push to repo
- if you need to deploy to another repo, change `..architect.deploy` config in [./angular.json](./angular.json#L133-L140) for a different repo.
```
  "deploy": {
    "builder": "angular-cli-ghpages:deploy",
    "options": {
      "repo": "git@github.com:openTdataCH/ojp-demo-app.git",
      "baseHref": "https://openTdataCH.github.io/ojp-demo-app/",
      "name": "OJP Demo App"
    }
  }
```

## License

The project is released under a [MIT license](./LICENSE.txt).

Copyright (c) 2021 - 2025 Open Data Platform Mobility Switzerland - [opentransportdata.swiss](https://opentransportdata.swiss/en/).