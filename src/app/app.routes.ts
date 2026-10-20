import { Routes } from '@angular/router';
import { CameraPage } from './pages/camera/camera-page';
import { ShowPage } from './pages/show/show-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'show' },
  { path: 'show', component: ShowPage },
  { path: 'camera', component: CameraPage },
  { path: '**', redirectTo: 'show' },
];
