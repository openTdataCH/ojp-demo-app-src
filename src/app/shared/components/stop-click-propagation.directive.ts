import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[stopClickPropagation]'
})
export class StopClickPropagationDirective {
  @HostListener('click', ['$event'])
  onClick(event: Event) {
    event.stopPropagation();
  }
}
