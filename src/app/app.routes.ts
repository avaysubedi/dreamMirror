import { Routes } from '@angular/router';
import { CameraPage } from './pages/camera/camera-page';
import { ShowPage } from './pages/show/show-page';
import { SetupPage } from './pages/setup/setup-page';
import { ConnectPage } from './pages/connect/connect-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'connect' },
  { path: 'connect', component: ConnectPage },
  { path: 'setup', component: SetupPage },
  { path: 'display', component: ShowPage },
  { path: 'tv', component: ShowPage },
  { path: 'show', redirectTo: 'display', pathMatch: 'full' },
  { path: 'camera', component: CameraPage },
  { path: '**', redirectTo: 'show' },
];
