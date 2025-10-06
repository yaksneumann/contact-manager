import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Contact } from '../models/contact.model';
import { ToastService } from '../../shared/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  private readonly STORAGE_KEY = 'contacts_offline';
  private readonly PENDING_OPERATIONS_KEY = 'pending_operations';
  
  private isOnlineSignal = signal<boolean>(navigator.onLine);
  readonly isOnline = this.isOnlineSignal.asReadonly();
  
  private onContactsNeedRefresh?: () => Promise<void>;
  
  constructor() {
    this.initializeOnlineStatus();
  }
  
  setContactRefreshCallback(callback: () => Promise<void>): void {
    this.onContactsNeedRefresh = callback;
  }
  
  private initializeOnlineStatus(): void {
    this.isOnlineSignal.set(navigator.onLine);
    
    window.addEventListener('online', () => {
      this.isOnlineSignal.set(true);
      this.toastService.showOnline();
      setTimeout(() => {
        this.syncPendingOperations();
      }, 100);
    });
    
    window.addEventListener('offline', () => {
      this.isOnlineSignal.set(false);
      this.toastService.showOffline();
    });
  }
  
  loadContactsFromStorage(): Contact[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading contacts from storage:', error);
      return [];
    }
  }
  
  saveContactsToStorage(contacts: Contact[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error('Error saving contacts to storage:', error);
    }
  }
  
  addPendingOperation(operation: 'CREATE' | 'UPDATE' | 'DELETE', contact: Contact): void {
    try {
      const operations = JSON.parse(localStorage.getItem(this.PENDING_OPERATIONS_KEY) || '[]');
      
      operations.push({
        id: Date.now().toString(),
        operation,
        data: contact,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
      
      localStorage.setItem(this.PENDING_OPERATIONS_KEY, JSON.stringify(operations));
    } catch (error) {
      console.error('Error saving pending operation:', error);
    }
  }
  
  async syncPendingOperations(): Promise<boolean> {
    try {
      const operations = JSON.parse(localStorage.getItem(this.PENDING_OPERATIONS_KEY) || '[]');
      
      if (operations.length > 0) {
        const successfulOperations: string[] = [];
        
        for (const op of operations) {
          try {
            switch (op.operation) {
              case 'CREATE':
                await firstValueFrom(this.http.post(`${this.API_BASE_URL}/contacts`, op.data));
                break;
              case 'UPDATE':
                await firstValueFrom(this.http.put(`${this.API_BASE_URL}/contacts/${op.data.id}`, op.data));
                break;
              case 'DELETE':
                await firstValueFrom(this.http.delete(`${this.API_BASE_URL}/contacts/${op.data.id}`));
                break;
            }
            successfulOperations.push(op.id);
          } catch (error) {
            console.error(`Failed to sync operation ${op.id}:`, error);
          }
        }
        
        const remainingOperations = operations.filter((op: any) => !successfulOperations.includes(op.id));
        localStorage.setItem(this.PENDING_OPERATIONS_KEY, JSON.stringify(remainingOperations));
        
        if (successfulOperations.length > 0) {
          this.toastService.success(`Synced ${successfulOperations.length} pending change${successfulOperations.length > 1 ? 's' : ''}`);
          if (this.onContactsNeedRefresh) {
            await this.onContactsNeedRefresh();
          }
          return true;
        }
      } else {
        if (this.onContactsNeedRefresh) {
          await this.onContactsNeedRefresh();
        }
      }
      return false;
    } catch (error) {
      console.error('Error syncing pending operations:', error);
      return false;
    }
  }
  
  async softRefreshContacts(): Promise<Contact[] | null> {
    try {
      const currentContacts = this.loadContactsFromStorage();
      const localImageMap = new Map<string, any>();
      
      currentContacts.forEach(contact => {
        if (contact.id && contact.picture) {
          localImageMap.set(contact.id, contact.picture);
        }
      });
      
      const response = await firstValueFrom(
        this.http.get<{contacts: Contact[]}>(`${this.API_BASE_URL}/contacts?_t=${Date.now()}`)
      );
      if (response?.contacts) {
        const mergedContacts = response.contacts.map(serverContact => {
          const localPicture = localImageMap.get(serverContact.id || '');
          if (localPicture) {
            return {
              ...serverContact,
              picture: localPicture
            };
          }
          return serverContact;
        });
        this.saveContactsToStorage(mergedContacts);
        return mergedContacts;
      }
    } catch (error) {
      console.error('Soft refresh failed:', error);
    }
    return null;
  }
}
