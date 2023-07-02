import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { JourneySearchComponent } from './journey/journey-search/journey-search.component';
import { StationBoardComponent } from './station-board/station-board.component';
import { EmbedSearchComponent } from './embed/embed-search.component';
import { EmbedStationBoardComponent } from './embed/embed-station-board.component';

const routes: Routes = [
  { path: 'embed/search', component: EmbedSearchComponent },
  { path: 'embed/board', component: EmbedStationBoardComponent },
  { path: 'search', component: JourneySearchComponent },
  { path: 'board', component: StationBoardComponent },
  { path: '', redirectTo: '/search', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
