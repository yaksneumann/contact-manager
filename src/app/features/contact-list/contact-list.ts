import { Component, inject, OnInit, signal, effect, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { Contact } from '../../core/models/contact.model';
import { ToastService } from '../../shared/toast/toast.service';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-contact-list',
  imports: [FormsModule, HeaderComponent],
  templateUrl: './contact-list.html',
  styleUrl: './contact-list.css'
})
export class ContactListComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  
  readonly loading = this.contactService.loading;
  readonly error = this.contactService.error;
  readonly isOnline = this.contactService.isOnline;
  readonly contacts = this.contactService.contacts;

  private displayedErrors = new Set<string>();
  private failedImages = new Set<string>();
  
  readonly isAddingRandomContacts = signal<boolean>(false);
  readonly searchInput = signal<string>('');

  readonly filteredContacts = computed(() => {
    const query = this.searchInput().toLowerCase().trim();
    const allContacts = this.contacts();
    if (!query) {
      return allContacts;
    }
    const filtered = allContacts.filter(contact => {
      const fullName = `${contact.name.first} ${contact.name.last}`.toLowerCase();
      const email = contact.email?.toLowerCase() || '';
      const phone = contact.phone?.toLowerCase() || '';

      return fullName.includes(query) || email.includes(query) || phone.includes(query);
    });
    return filtered;
  });

  constructor() {
    effect(() => {
      const error = this.error();
      if (error && !this.displayedErrors.has(error)) {
        this.displayedErrors.add(error);
        this.toastService.error(error, 3000);
        queueMicrotask(() => {
          this.contactService.clearError();
          this.displayedErrors.delete(error);
        });
      }
    });
  }
  
  ngOnInit(): void {
    this.contactService.clearError();
    this.contactService.loadContacts();
  }
  
  onContactClick(contact: Contact): void {
      this.router.navigate(['/contact', contact.id]);
  }

  onNewContact(): void {
    this.router.navigate(['/contact', 'new']);
  }

  async onAddRandomContacts(): Promise<void> {
    if (!this.isOnline()) {
      this.toastService.error('Cannot add random contacts while offline. Please connect to the internet.');
      return;
    }

    this.isAddingRandomContacts.set(true);
    try {
      const addedContacts = await this.contactService.addRandomContacts(10);
      if (addedContacts.length > 0) {
        this.toastService.success(`Successfully added ${addedContacts.length} random contacts!`);
      } else {
        this.toastService.warning('No random contacts were added. Please try again.');
      }
    } catch (error) {
      this.toastService.error('Failed to add random contacts. Please try again.');
    } finally {
      this.isAddingRandomContacts.set(false);
    }
  }

  async onToggleFavorite(contact: Contact, event: Event): Promise<void> {
    event.stopPropagation();
    if (!contact.id) {
      this.toastService.error('Cannot toggle favorite: Contact ID is missing');
      return;
    }
    try {
      const updatedContact = await this.contactService.toggleFavorite(contact.id);
      if (updatedContact) {
        const action = updatedContact.isFavorite ? 'added to' : 'removed from';
        this.toastService.success(`Contact ${action} favorites`);
      }
    } catch (error) {
      this.toastService.error('Failed to update favorite status');
    }
  }
  
  onSearchChange(query: string): void {
    this.searchInput.set(query);
  }
  
  clearSearch(): void {
    this.searchInput.set('');
  }
  
  getContactFullName(contact: Contact): string {
    return `${contact.name.first} ${contact.name.last}`.trim();
  }
  
  getContactImageSrc(contact: Contact): string | null {
    if (!contact.id) return null;
    
    if (this.failedImages.has(contact.id)) {
      return null;
    }
    return contact.picture?.thumbnail || contact.picture?.medium || contact.picture?.large || null;
  }
  
  onImageError(contact: Contact): void {
    if (contact.id) {
      this.failedImages.add(contact.id);
    }
  }
  
  trackByContactId(index: number, contact: Contact): string | number {
    return contact.id || index;
  }
}