import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { Contact, ContactFormData } from '../../core/models/contact.model';
import { HeaderComponent } from '../../shared/components/header/header.component';

@Component({
  selector: 'app-contact-detail',
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.css'
})
export class ContactDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contactService = inject(ContactService);
  private fb = inject(FormBuilder);
  
  // Signals
  readonly contact = signal<Contact | null>(null);
  readonly isLoading = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly contactId = signal<string | null>(null);
  readonly formValid = signal(false);
  readonly formDirty = signal(false);
  
  // Form
  contactForm!: FormGroup;
  
  // Computed values
  readonly isNewContact = computed(() => this.contactId() === 'new');
  readonly canEdit = computed(() => !this.isNewContact() && !this.isEditing());
  readonly canSave = computed(() => 
    this.isEditing() && 
    this.formValid() && 
    (this.isNewContact() || this.formDirty())
  );
  readonly canDelete = computed(() => !this.isNewContact() && !this.isEditing());
  
  readonly pageTitle = computed(() => 
    this.isNewContact() ? 'New Contact' : 
    this.isEditing() ? 'Edit Contact' : 
    'Contact Details'
  );
  
  ngOnInit(): void {
    this.initializeForm();
    this.loadContact();
  }
  
  private initializeForm(): void {
    this.contactForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      cell: ['', [Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      street: [''],
      city: [''],
      state: [''],
      country: [''],
      postcode: [''],
      age: [null, [Validators.min(1), Validators.max(120)]],
      picture: ['']
    });
    
    // Subscribe to form status changes to update signal reactively
    this.contactForm.statusChanges.subscribe(() => {
      this.formValid.set(this.contactForm.valid);
      this.formDirty.set(this.contactForm.dirty);
    });
    
    // Set initial form validity and dirty state
    this.formValid.set(this.contactForm.valid);
    this.formDirty.set(this.contactForm.dirty);
  }
  
  private async loadContact(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    
    try {
      const id = this.route.snapshot.paramMap.get('id');
      this.contactId.set(id);
      
      if (id && id !== 'new') {
        const contact = await this.contactService.getContact(id);
        if (contact) {
          this.contact.set(contact);
          this.populateForm(contact);
        } else {
          this.error.set('Contact not found');
        }
      } else if (id === 'new') {
        this.isEditing.set(true);
        // Set default values for new contact
        this.contactForm.patchValue({
          country: 'United States'
        });
      }
    } catch (error) {
      this.error.set('Failed to load contact');
      console.error('Load contact error:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  private populateForm(contact: Contact): void {
    this.contactForm.patchValue({
      firstName: contact.name.first || '',
      lastName: contact.name.last || '',
      email: contact.email || '',
      phone: contact.phone || '',
      cell: contact.cell || '',
      street: contact.location.street.name || '',
      city: contact.location.city || '',
      state: contact.location.state || '',
      country: contact.location.country || '',
      postcode: contact.location.postcode || '',
      age: contact.dob.age || null,
      picture: contact.picture.large || ''
    });
  }
  
  onEdit(): void {
    this.isEditing.set(true);
  }
  
  onCancel(): void {
    if (this.isNewContact()) {
      this.router.navigate(['/']);
    } else {
      this.isEditing.set(false);
      const contact = this.contact();
      if (contact) {
        this.populateForm(contact);
      }
    }
  }
  
  async onSave(): Promise<void> {
    if (!this.contactForm.valid) {
      this.markFormGroupTouched();
      return;
    }
    
    this.isSaving.set(true);
    this.error.set(null);
    
    try {
      const formData: ContactFormData = this.contactForm.value;
      
      const savedContact = this.isNewContact()
        ? await this.contactService.createContact(formData)
        : await this.contactService.updateContact(this.contactId()!, formData);
      
      if (savedContact) {
        this.contact.set(savedContact);
        this.isEditing.set(false);
        
        if (this.isNewContact()) {
          this.router.navigate(['/contact', savedContact.id]);
        }
      } else {
        this.error.set('Failed to save contact');
      }
    } catch (error) {
      this.error.set('Failed to save contact');
      console.error('Save contact error:', error);
    } finally {
      this.isSaving.set(false);
    }
  }
  
  async onDelete(): Promise<void> {
    if (this.isNewContact()) {
      return;
    }
    
    const contact = this.contact();
    const contactName = contact ? this.getContactFullName(contact) : 'this contact';
    
    if (!confirm(`Are you sure you want to delete ${contactName}?`)) {
      return;
    }
    
    this.isSaving.set(true);
    this.error.set(null);
    
    try {
      const success = await this.contactService.deleteContact(this.contactId()!);
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.error.set('Failed to delete contact');
      }
    } catch (error) {
      this.error.set('Failed to delete contact');
      console.error('Delete contact error:', error);
    } finally {
      this.isSaving.set(false);
    }
  }
  
  onBack(): void {
    this.router.navigate(['/']);
  }
  
  getContactFullName(contact: Contact): string {
    return `${contact.name.first} ${contact.name.last}`.trim();
  }
  
  getFieldError(fieldName: string): string | null {
    const field = this.contactForm.get(fieldName);
    
    if (!field || !field.invalid || (!field.dirty && !field.touched)) {
      return null;
    }
    
    const errors = field.errors!;
    
    if (errors['required']) return 'This field is required';
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) {
      return `Must be at least ${errors['minlength'].requiredLength} characters`;
    }
    if (errors['pattern'] && (fieldName === 'phone' || fieldName === 'cell')) {
      return 'Please enter a valid phone number';
    }
    if (errors['min']) return `Must be at least ${errors['min'].min}`;
    if (errors['max']) return `Must be no more than ${errors['max'].max}`;
    
    return null;
  }
  
  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }
  
  private markFormGroupTouched(): void {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
  
  clearError(): void {
    this.error.set(null);
  }
}
