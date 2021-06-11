import { Injectable } from '@angular/core'
import * as OJP from '../ojp-sdk/index'

@Injectable( {providedIn: 'root'} )
export class UserSettingsService {
  public appStage: OJP.APP_Stage = 'PROD'

  public getStageConfig(): OJP.StageConfig {
    if (!(this.appStage in OJP.APP_Stages)) {
      console.error('ERROR - cant find stage' + this.appStage + ' using PROD');
      return OJP.APP_Stages['PROD']
    }

    const stageConfig = OJP.APP_Stages[this.appStage]
    return stageConfig
  }
}
