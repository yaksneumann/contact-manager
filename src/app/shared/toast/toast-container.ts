import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div 
          class="toast toast-{{toast.type}}"
          [attr.data-toast-id]="toast.id"
        >
          <div class="toast-content">
            @if (toast.icon) {
              <span class="toast-icon">{{ toast.icon }}</span>
            }
            <span class="toast-message">{{ toast.message }}</span>
          </div>
          <button 
            class="toast-close" 
            (click)="toastService.dismiss(toast.id)"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-container.css'
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
