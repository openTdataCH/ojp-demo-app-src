import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { JourneySearchComponent } from './journey/journey-search/journey-search.component';
import { StationBoardComponent } from './station-board/station-board.component';

const routes: Routes = [
  { path: 'search', component: JourneySearchComponent },
  { path: 'board', component: StationBoardComponent },
  { path: '', redirectTo: '/search', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
