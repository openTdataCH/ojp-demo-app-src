import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { JourneySearchComponent } from './journey/journey-search/journey-search.component';
import { StationBoardComponent } from './station-board/station-board.component';
import { EmbedSearchComponent } from './embed/embed-search.component';
import { EmbedStationBoardComponent } from './embed/embed-station-board.component';
import { TripInfoComponent } from './trip-info/trip-info.component';

const routes: Routes = [
  { path: 'embed/search', component: EmbedSearchComponent },
  { path: 'embed/board', component: EmbedStationBoardComponent },
  { path: 'search', component: JourneySearchComponent },
  { path: 'board', component: StationBoardComponent },
  { path: 'trip', component: TripInfoComponent },
  // newsletter quick fix
  { path: 'searchOJP-Demo', redirectTo: '/search', pathMatch: 'full' },
  { path: '', redirectTo: '/search', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
