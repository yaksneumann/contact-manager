import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Contact, ContactFormData, RandomUserResponse } from '../models/contact.model';
import { ToastService } from '../../shared/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);
  private toastService = inject(ToastService);
  
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  private readonly STORAGE_KEY = 'contacts_offline';
  private readonly PENDING_OPERATIONS_KEY = 'pending_operations';
  
  // Signals for reactive state management
  private contactsSignal = signal<Contact[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  private isOnlineSignal = signal<boolean>(navigator.onLine);
  
  // Public readonly signals
  readonly contacts = this.contactsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly isOnline = this.isOnlineSignal.asReadonly();
  
  // Computed signals
  readonly contactCount = computed(() => this.contactsSignal().length);
  readonly hasContacts = computed(() => this.contactsSignal().length > 0);
  
  constructor() {
    this.initializeOnlineStatus();
    this.loadContactsFromStorage();
  }
  
  private initializeOnlineStatus(): void {
    window.addEventListener('online', () => {
      this.isOnlineSignal.set(true);
      this.toastService.showOnline();
      this.syncPendingOperations();
    });
    
    window.addEventListener('offline', () => {
      this.isOnlineSignal.set(false);
      this.toastService.showOffline();
    });
  }
  
  // Load all contacts
  async loadContacts(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    
    try {
      if (this.isOnlineSignal()) {
        // Online: fetch from API with cache busting
        const timestamp = Date.now();
        const response = await this.http.get<{contacts: Contact[]}>(`${this.API_BASE_URL}/contacts?_t=${timestamp}`).toPromise();
        if (response?.contacts) {
          this.contactsSignal.set(response.contacts);
          this.saveContactsToStorage(response.contacts);
        }
      } else {
        // Offline: load from storage
        this.loadContactsFromStorage();
      }
    } catch (error) {
      const errorMessage = 'Failed to load contacts';
      this.errorSignal.set(errorMessage);
      console.error('Load contacts error:', error);
      
      // Fallback to offline storage
      this.loadContactsFromStorage();
    } finally {
      this.loadingSignal.set(false);
    }
  }
  
  // Force refresh contacts with delay - useful after sync operations
  async refreshContactsAfterDelay(delayMs: number = 3000): Promise<void> {
    console.log(`Scheduling contacts refresh in ${delayMs}ms...`);
    setTimeout(async () => {
      console.log('Executing delayed contacts refresh...');
      await this.loadContacts();
    }, delayMs);
  }
  
  // Get contact by ID
  async getContact(id: string): Promise<Contact | null> {
    const contacts = this.contactsSignal();
    const contact = contacts.find(c => c.id === id);
    
    if (contact) {
      return contact;
    }
    
    if (this.isOnlineSignal()) {
      try {
        const response = await this.http.get<{contact: Contact}>(`${this.API_BASE_URL}/contacts/${id}`).toPromise();
        return response?.contact || null;
      } catch (error) {
        console.error('Get contact error:', error);
        return null;
      }
    }
    
    return null;
  }
  
  // Create new contact
  async createContact(contactData: ContactFormData): Promise<Contact | null> {
    const newContact: Contact = this.transformFormDataToContact(contactData);
    
    try {
      if (this.isOnlineSignal()) {
        // Online: save to API
        const response = await this.http.post<{contact: Contact}>(`${this.API_BASE_URL}/contacts`, newContact).toPromise();
        if (response?.contact) {
          const updatedContacts = [...this.contactsSignal(), response.contact];
          this.contactsSignal.set(updatedContacts);
          this.saveContactsToStorage(updatedContacts);
          return response.contact;
        }
      } else {
        // Offline: save locally and queue for sync
        newContact.id = this.generateId();
        newContact.pendingSync = true;
        
        const updatedContacts = [...this.contactsSignal(), newContact];
        this.contactsSignal.set(updatedContacts);
        this.saveContactsToStorage(updatedContacts);
        this.addPendingOperation('CREATE', newContact);
        
        return newContact;
      }
    } catch (error) {
      this.errorSignal.set('Failed to create contact');
      console.error('Create contact error:', error);
    }
    
    return null;
  }
  
  // Update existing contact
  async updateContact(id: string, contactData: ContactFormData): Promise<Contact | null> {
    // Get existing contact to preserve picture URLs
    const existingContact = this.contactsSignal().find(c => c.id === id);
    const updatedContact: Contact = this.transformFormDataToContact(contactData, id);
    
    // Always preserve original picture URLs if they exist, unless a new picture URL is provided
    // that's different from any of the existing ones
    if (existingContact && existingContact.picture) {
      const isNewPictureProvided = contactData.picture && 
        contactData.picture !== existingContact.picture.large &&
        contactData.picture !== existingContact.picture.medium &&
        contactData.picture !== existingContact.picture.thumbnail;
        
      if (!isNewPictureProvided) {
        updatedContact.picture = {
          large: existingContact.picture.large || '',
          medium: existingContact.picture.medium || '',
          thumbnail: existingContact.picture.thumbnail || ''
        };
      }
    }
    
    try {
      if (this.isOnlineSignal()) {
        // Online: update via API
        const response = await this.http.put<{contact: Contact}>(`${this.API_BASE_URL}/contacts/${id}`, updatedContact).toPromise();
        if (response?.contact) {
          const contacts = this.contactsSignal();
          const index = contacts.findIndex(c => c.id === id);
          if (index !== -1) {
            const updatedContacts = [...contacts];
            updatedContacts[index] = response.contact;
            this.contactsSignal.set(updatedContacts);
            this.saveContactsToStorage(updatedContacts);
          }
          return response.contact;
        }
      } else {
        // Offline: update locally and queue for sync
        updatedContact.pendingSync = true;
        
        const contacts = this.contactsSignal();
        const index = contacts.findIndex(c => c.id === id);
        if (index !== -1) {
          const updatedContacts = [...contacts];
          updatedContacts[index] = updatedContact;
          this.contactsSignal.set(updatedContacts);
          this.saveContactsToStorage(updatedContacts);
          this.addPendingOperation('UPDATE', updatedContact);
          
          return updatedContact;
        }
      }
    } catch (error) {
      this.errorSignal.set('Failed to update contact');
      console.error('Update contact error:', error);
    }
    
    return null;
  }
  
  // Delete contact
  async deleteContact(id: string): Promise<boolean> {
    try {
      if (this.isOnlineSignal()) {
        // Online: delete via API
        await this.http.delete(`${this.API_BASE_URL}/contacts/${id}`).toPromise();
      } else {
        // Offline: queue for sync
        const contact = this.contactsSignal().find(c => c.id === id);
        if (contact) {
          this.addPendingOperation('DELETE', contact);
        }
      }
      
      // Update local state
      const updatedContacts = this.contactsSignal().filter(c => c.id !== id);
      this.contactsSignal.set(updatedContacts);
      this.saveContactsToStorage(updatedContacts);
      
      return true;
    } catch (error) {
      this.errorSignal.set('Failed to delete contact');
      console.error('Delete contact error:', error);
      return false;
    }
  }
  
  // Add random contacts
  async addRandomContacts(count: number = 10): Promise<Contact[]> {
    this.loadingSignal.set(true);
    
    try {
      if (this.isOnlineSignal()) {
        const response = await this.http.post<{contacts: Contact[]}>(`${this.API_BASE_URL}/contacts/random`, { count }).toPromise();
        if (response?.contacts) {
          const updatedContacts = [...this.contactsSignal(), ...response.contacts];
          this.contactsSignal.set(updatedContacts);
          this.saveContactsToStorage(updatedContacts);
          return response.contacts;
        }
      } else {
        this.errorSignal.set('Cannot add random contacts while offline');
      }
    } catch (error) {
      this.errorSignal.set('Failed to add random contacts');
      console.error('Add random contacts error:', error);
    } finally {
      this.loadingSignal.set(false);
    }
    
    return [];
  }
  
  // Private helper methods
  private loadContactsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const contacts: Contact[] = JSON.parse(stored);
        this.contactsSignal.set(contacts);
      }
    } catch (error) {
      console.error('Error loading contacts from storage:', error);
    }
  }
  
  private saveContactsToStorage(contacts: Contact[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error('Error saving contacts to storage:', error);
    }
  }
  
  private addPendingOperation(operation: 'CREATE' | 'UPDATE' | 'DELETE', contact: Contact): void {
    try {
      const stored = localStorage.getItem(this.PENDING_OPERATIONS_KEY);
      const operations = stored ? JSON.parse(stored) : [];
      
      operations.push({
        id: this.generateId(),
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
  
  private async syncPendingOperations(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.PENDING_OPERATIONS_KEY);
      const operations = stored ? JSON.parse(stored) : [];
      const hasPendingOperations = operations.length > 0;
      
      if (hasPendingOperations) {
        const successfulOperations: string[] = [];
        
        for (const op of operations) {
          try {
            switch (op.operation) {
              case 'CREATE':
                await this.http.post(`${this.API_BASE_URL}/contacts`, op.data).toPromise();
                break;
              case 'UPDATE':
                await this.http.put(`${this.API_BASE_URL}/contacts/${op.data.id}`, op.data).toPromise();
                break;
              case 'DELETE':
                await this.http.delete(`${this.API_BASE_URL}/contacts/${op.data.id}`).toPromise();
                break;
            }
            successfulOperations.push(op.id);
          } catch (error) {
            console.error(`Failed to sync operation ${op.id}:`, error);
          }
        }
        
        // Remove successful operations
        const remainingOperations = operations.filter((op: any) => !successfulOperations.includes(op.id));
        localStorage.setItem(this.PENDING_OPERATIONS_KEY, JSON.stringify(remainingOperations));
        
        if (successfulOperations.length > 0) {
          this.toastService.success(`Synced ${successfulOperations.length} pending change${successfulOperations.length > 1 ? 's' : ''}`);
          
          // After syncing operations, refresh to get the latest server state
          setTimeout(async () => {
            await this.loadContacts();
          }, 500);
        }
      } else {
        // Even without pending operations, do a soft refresh to check for server updates
        await this.softRefreshContacts();
      }
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  }
  
  // Soft refresh: get latest server data but preserve local image URLs
  private async softRefreshContacts(): Promise<void> {
    try {
      // Get current local contacts with their image data
      const currentContacts = this.contactsSignal();
      const localImageMap = new Map<string, any>();
      
      currentContacts.forEach(contact => {
        if (contact.id && contact.picture) {
          localImageMap.set(contact.id, contact.picture);
        }
      });
      
      // Fetch latest data from server
      const timestamp = Date.now();
      const response = await this.http.get<{contacts: Contact[]}>(`${this.API_BASE_URL}/contacts?_t=${timestamp}`).toPromise();
      
      if (response?.contacts) {
        // Merge server data with local images
        const mergedContacts = response.contacts.map(serverContact => {
          const localPicture = localImageMap.get(serverContact.id || '');
          
          if (localPicture) {
            return {
              ...serverContact,
              picture: localPicture // Use local image data
            };
          }
          
          return serverContact; // Use server data as-is
        });
        
        this.contactsSignal.set(mergedContacts);
        this.saveContactsToStorage(mergedContacts);
      }
    } catch (error) {
      console.error('Soft refresh failed:', error);
      // Don't show error to user, just keep existing contacts
    }
  }
  
  private transformFormDataToContact(formData: ContactFormData, id?: string): Contact {
    return {
      id: id || this.generateId(),
      name: {
        first: formData.firstName,
        last: formData.lastName
      },
      email: formData.email,
      phone: formData.phone,
      cell: formData.cell,
      location: {
        street: {
          number: 0,
          name: formData.street
        },
        city: formData.city,
        state: formData.state,
        country: formData.country,
        postcode: formData.postcode
      },
      picture: {
        large: formData.picture || '',
        medium: formData.picture || '',
        thumbnail: formData.picture || ''
      },
      dob: {
        date: new Date().toISOString(),
        age: formData.age
      },
      registered: {
        date: new Date().toISOString(),
        age: 0
      },
      lastModified: new Date().toISOString()
    };
  }
  
  private generateId(): string {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Clear error
  clearError(): void {
    this.errorSignal.set(null);
  }
}
