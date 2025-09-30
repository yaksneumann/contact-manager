import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private router = inject(Router);
  
  title = input.required<string>();
  showContactsButton = input<boolean>(false);
  
  onContactsClick(): void {
    this.router.navigate(['/']);
  }
}
