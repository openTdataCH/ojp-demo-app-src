import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'input-xml-popover',
  templateUrl: './input-xml-popover.component.html',
})
export class InputXmlPopoverComponent {
  public inputXmlS: string

  @Output() tripResponseXmlSaved = new EventEmitter<string>()

  constructor() {
    this.inputXmlS = 'Paste the OJP Trip Response XML here...'
  }

  public saveXML() {
    this.tripResponseXmlSaved.emit(this.inputXmlS)
  }
}
