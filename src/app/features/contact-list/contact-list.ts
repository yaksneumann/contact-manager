import { Component, inject, OnInit, signal, effect, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { Contact } from '../../core/models/contact.model';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-contact-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.css'
})
export class ContactListComponent implements OnInit {
  private contactService = inject(ContactService);
  private router = inject(Router);
  private toastService = inject(ToastService);
  private wasOffline = false;
  
  // Signals from service
  readonly contacts = this.contactService.contacts;
  readonly loading = this.contactService.loading;
  readonly error = this.contactService.error;
  readonly isOnline = this.contactService.isOnline;
  readonly contactCount = this.contactService.contactCount;
  readonly hasContacts = this.contactService.hasContacts;
  
  // Component-specific signals
  readonly isAddingRandom = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  
  // Computed filtered contacts
  readonly filteredContacts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allContacts = this.contacts();
    
    if (!query) {
      return allContacts;
    }
    
    const filtered = allContacts.filter(contact => {
      const fullName = `${contact.name.first} ${contact.name.last}`.toLowerCase();
      const email = contact.email?.toLowerCase() || '';
      const phone = contact.phone?.toLowerCase() || '';
      
      return fullName.includes(query) || 
             email.includes(query) || 
             phone.includes(query);
    });
    
    return filtered;
  });
  
  // Computed filtered contact count
  readonly filteredContactCount = computed(() => this.filteredContacts().length);
  readonly hasFilteredContacts = computed(() => this.filteredContacts().length > 0);
  
  constructor() {
    // Effect to handle error display
    effect(() => {
      const error = this.error();
    });
    
    // Effect to track online/offline status
    effect(() => {
      const isOnline = this.isOnline();
      
      if (!isOnline) {
        this.wasOffline = true;
      } else if (this.wasOffline && isOnline) {
        this.wasOffline = false;
      }
    });
  }
  
  ngOnInit(): void {
    // Only load contacts if we don't have any yet
    // This prevents unnecessary reloading when navigating back from detail page
    if (this.contacts().length === 0) {
      this.loadContacts();
    }
  }
  
  async loadContacts(): Promise<void> {
    await this.contactService.loadContacts();
  }
  
  onContactClick(contact: Contact): void {
    if (contact.id) {
      this.router.navigate(['/contact', contact.id]);
    }
  }
  
  onNewContact(): void {
    this.router.navigate(['/contact', 'new']);
  }
  
  async onAddRandomContacts(): Promise<void> {
    if (!this.isOnline()) {
      alert('Cannot add random contacts while offline. Please connect to the internet.');
      return;
    }
    
    this.isAddingRandom.set(true);
    
    try {
      const addedContacts = await this.contactService.addRandomContacts(10);
      if (addedContacts.length > 0) {
        console.log(`Added ${addedContacts.length} random contacts`);
      }
    } catch (error) {
      console.error('Failed to add random contacts:', error);
    } finally {
      this.isAddingRandom.set(false);
    }
  }
  
  clearError(): void {
    this.contactService.clearError();
  }
  
  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }
  
  clearSearch(): void {
    this.searchQuery.set('');
  }
  
  getContactFullName(contact: Contact): string {
    return `${contact.name.first} ${contact.name.last}`.trim();
  }
  
  getContactAddress(contact: Contact): string {
    const location = contact.location;
    return `${location.city}, ${location.state}`.trim().replace(/,$/, '');
  }
  
  getContactImageSrc(contact: Contact): string | null {
    if (!contact.id) return null;
    
    // Try thumbnail first, then medium, then large as fallback
    return contact.picture?.thumbnail || 
           contact.picture?.medium || 
           contact.picture?.large || 
           null;
  }
  
  trackByContactId(index: number, contact: Contact): string | number {
    return contact.id || index;
  }
}
