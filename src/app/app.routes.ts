import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/contacts',
    pathMatch: 'full'
  },
  {
    path: 'contacts',
    loadComponent: () => 
      import('./features/contact-list/contact-list').then(c => c.ContactListComponent)
  },
  {
    path: 'contact/:id',
    loadComponent: () => 
      import('./features/contact-detail/contact-detail').then(c => c.ContactDetailComponent)
  },
  {
    path: '**',
    redirectTo: '/contacts'
  }
];
