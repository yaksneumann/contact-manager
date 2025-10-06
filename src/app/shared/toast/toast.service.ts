import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 1;

  show(message: string, type: ToastMessage['type'] = 'info', duration = 3000, icon?: string): void {
    const toast: ToastMessage = {
      id: `toast-${this.nextId++}`,
      message,
      type,
      duration,
      icon
    };

    this.toasts.update(toasts => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast.id);
      }, duration);
    }
  }

  dismiss(id: string): void {
    this.toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  dismissAll(): void {
    this.toasts.set([]);
  }

  success(message: string, duration = 2000): void {
    this.show(message, 'success', duration, '✅');
  }

  error(message: string, duration = 3500): void {
    this.show(message, 'error', duration, '❌');
  }

  warning(message: string, duration = 3000): void {
    this.show(message, 'warning', duration, '⚠️');
  }

  info(message: string, duration = 2500): void {
    this.show(message, 'info', duration, 'ℹ️');
  }

  showOffline(): void {
    this.warning('You are now offline. Some features may not be available.', 3000);
  }

  showOnline(): void {
    this.success('You are back online!', 3000);
  }
}
