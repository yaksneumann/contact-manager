import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Contact, ContactFormData } from '../models/contact.model';
import { SyncService } from './sync.service';
import { ToastService } from '../../shared/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private http = inject(HttpClient);
  private syncService = inject(SyncService);
  private toastService = inject(ToastService);
  
  private readonly API_BASE_URL = 'http://localhost:3000/api';
  
  private contactsSignal = signal<Contact[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);
  
  readonly contacts = this.contactsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  
  readonly isOnline = computed(() => this.syncService.isOnline());
  
  constructor() {
    this.loadContactsFromStorage();
    this.syncService.setContactRefreshCallback(async () => {
      await this.loadContacts();
    });
  }
  
  async loadContacts(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);
    try {
      if (this.syncService.isOnline()) {
        const timestamp = Date.now();
        const response = await firstValueFrom(this.http.get<{contacts: Contact[]}>(`${this.API_BASE_URL}/contacts?_t=${timestamp}`));
        if (response?.contacts) {
          this.contactsSignal.set(response.contacts);
          this.syncService.saveContactsToStorage(response.contacts);
        }
      } else {
        this.loadContactsFromStorage();
        if (this.contactsSignal().length === 0) {
          this.toastService.info('No contacts found offline. Connect to internet to load contacts.');
        }
      }
    } catch (error) {
      this.errorSignal.set('Failed to load contacts from server');
      this.loadContactsFromStorage();
      
      if (this.contactsSignal().length > 0) {
        this.toastService.warning('Using offline contacts - server connection failed');
        this.errorSignal.set(null);
      } else {
        this.toastService.error('Failed to load contacts');
      }
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async createContact(contactData: ContactFormData): Promise<Contact | null> {
    const newContact: Contact = this.transformFormDataToContact(contactData);
    
    try {
      if (this.syncService.isOnline()) {
        const response = await firstValueFrom(this.http.post<{contact: Contact}>(`${this.API_BASE_URL}/contacts`, newContact));
        if (response?.contact) {
          const updatedContacts = [...this.contactsSignal(), response.contact];
          this.contactsSignal.set(updatedContacts);
          this.syncService.saveContactsToStorage(updatedContacts);
          return response.contact;
        }
      } else {
        newContact.id = this.generateId();
        newContact.pendingSync = true;
        
        const updatedContacts = [...this.contactsSignal(), newContact];
        this.contactsSignal.set(updatedContacts);
        this.syncService.saveContactsToStorage(updatedContacts);
        this.syncService.addPendingOperation('CREATE', newContact);
        
        return newContact;
      }
    } catch (error: any) {
      if (error.status === 409) {
        this.errorSignal.set(error.error?.error || 'Email already exists. Please use a different email address.');
      } else {
        this.errorSignal.set('Failed to create contact');
      }
    }
    return null;
  }
  
  async updateContact(id: string, contactData: ContactFormData): Promise<Contact | null> {
    const updatedContact: Contact = this.transformFormDataToContact(contactData, id);

    try {
      return await this.performContactUpdate(id, updatedContact, 'Failed to update contact');
    } catch (error: any) {
      if (error.status === 409) {
        this.errorSignal.set(error.error?.error || 'Email already exists. Please use a different email address.');
      } else {
        this.errorSignal.set('Failed to update contact');
      }
      return null;
    }
  }
  
  async deleteContact(id: string): Promise<boolean> {
    try {
      if (this.syncService.isOnline()) {
        await firstValueFrom(this.http.delete(`${this.API_BASE_URL}/contacts/${id}`));
      } else {
        const contact = this.contactsSignal().find(c => c.id === id);
        if (contact) {
          this.syncService.addPendingOperation('DELETE', contact);
        }
      }
      
      const updatedContacts = this.contactsSignal().filter(c => c.id !== id);
      this.contactsSignal.set(updatedContacts);
      this.syncService.saveContactsToStorage(updatedContacts);
      
      return true;
    } catch (error) {
      this.errorSignal.set('Failed to delete contact');
      return false;
    }
  }
  
  async addRandomContacts(count: number = 10): Promise<Contact[]> {
    this.loadingSignal.set(true);
    
    try {
      if (this.syncService.isOnline()) {
        const response = await firstValueFrom(this.http.post<{contacts: Contact[]}>(`${this.API_BASE_URL}/contacts/random`, { count }));
        if (response?.contacts) {
          await this.loadContacts();
          return response.contacts;
        }
      } else {
        this.errorSignal.set('Cannot add random contacts while offline');
      }
    } catch (error) {
      this.errorSignal.set('Failed to add random contacts');
    } finally {
      this.loadingSignal.set(false);
    }
    return [];
  }
  
  async toggleFavorite(id: string): Promise<Contact | null> {
    const contact = this.contactsSignal().find(c => c.id === id);
    
    if (!contact) {
      this.errorSignal.set('Contact not found');
      return null;
    }

    const updatedContact = {
      ...contact,
      isFavorite: !contact.isFavorite,
    };

    return this.performContactUpdate(id, updatedContact, 'Failed to update favorite status');
  }

  private async performContactUpdate(id: string, updatedContact: Contact, errorMessage: string): Promise<Contact | null> {
    try {
      if (this.syncService.isOnline()) {
        const response = await firstValueFrom(this.http.put<{contact: Contact}>(`${this.API_BASE_URL}/contacts/${id}`, updatedContact));
        if (response?.contact) {
          const contacts = this.contactsSignal();
          const index = contacts.findIndex(c => c.id === id);
          if (index !== -1) {
            const updatedContacts = [...contacts];
            updatedContacts[index] = response.contact;
            this.contactsSignal.set(updatedContacts);
            this.syncService.saveContactsToStorage(updatedContacts);
          }
          return response.contact;
        }
      } else {
        updatedContact.pendingSync = true;
        
        const contacts = this.contactsSignal();
        const index = contacts.findIndex(c => c.id === id);
        if (index !== -1) {
          const updatedContacts = [...contacts];
          updatedContacts[index] = updatedContact;
          this.contactsSignal.set(updatedContacts);
          this.syncService.saveContactsToStorage(updatedContacts);
          this.syncService.addPendingOperation('UPDATE', updatedContact);
          
          return updatedContact;
        }
      }
    } catch (error) {
      this.errorSignal.set(errorMessage);
    }
    
    return null;
  }
  
  private loadContactsFromStorage(): void {
    const contacts = this.syncService.loadContactsFromStorage();
    this.contactsSignal.set(contacts);
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
    };
  }
  
  private generateId(): string {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
  }
  
  clearError(): void {
    this.errorSignal.set(null);
  }
}
