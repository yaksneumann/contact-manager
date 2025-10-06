import { Routes } from '@angular/router';
import { ContactListComponent } from './features/contact-list/contact-list';
import { ContactDetailComponent } from './features/contact-detail/contact-detail';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/contacts',
    pathMatch: 'full'
  },
  {
    path: 'contacts',
    component: ContactListComponent
  },
  {
    path: 'contact/:id',
    component: ContactDetailComponent
  },
  {
    path: '**',
    redirectTo: '/contacts'
  }
];
