import { Component, Input } from '@angular/core';

import { SituationContent } from '../models/situation';

@Component({
  selector: 'pt-situations',
  templateUrl: './pt-situations.component.html',
  styleUrls: ['./pt-situations.component.scss'],
})
export class PtSituationsComponent {
  @Input() situations: SituationContent[] = [];
  @Input() trigger: 'click' | 'hover' = 'click';
}
