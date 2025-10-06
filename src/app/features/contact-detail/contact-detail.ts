import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ContactService } from '../../core/services/contact.service';
import { Contact, ContactFormData } from '../../core/models/contact.model';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-contact-detail',
  imports: [CommonModule, ReactiveFormsModule, HeaderComponent],
  templateUrl: './contact-detail.html',
  styleUrl: './contact-detail.css',
})
export class ContactDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private contactService = inject(ContactService);
  private fb = inject(FormBuilder);
  private toastService = inject(ToastService);

  private readonly contactId = signal<string | null>(null);
  private formChanged = signal(0);
  private imageLoadFailed = signal(false);
  private imageSuccessfullyLoaded = signal(false);

  readonly contact = computed(() => {
    const contacts = this.contactService.contacts();
    const id = this.contactId();
    return id && id !== 'new' ? contacts.find(c => c.id === id) || null : null;
  });

  readonly isLoading = signal(false);
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);

  contactForm!: FormGroup;

  readonly isNewContact = computed(() => this.contactId() === 'new');
  readonly isViewMode = computed(
    () => !this.isNewContact() && !this.isEditing()
  );
  readonly canSave = computed(() => {
    this.formChanged();
    return this.isEditing() && (this.contactForm?.dirty ?? false);
  });

  readonly pageTitle = computed(() =>
    this.isNewContact()
      ? 'Create Contact'
      : this.isEditing()
      ? 'Edit Contact'
      : 'Contact Details'
  );

  readonly shouldShowImage = computed(() => {
    const currentContact = this.contact();
    if (!currentContact?.picture?.large) {
      return false;
    }

    if (this.imageLoadFailed()) {
      return false;
    }

    if (this.contactService.isOnline()) {
      return true;
    }
    return this.imageSuccessfullyLoaded();
  });

  onImageError(): void {
    this.imageLoadFailed.set(true);
    this.imageSuccessfullyLoaded.set(false);
  }

  onImageLoad(): void {
    this.imageSuccessfullyLoaded.set(true);
    this.imageLoadFailed.set(false);
  }

  ngOnInit(): void {
    this.initializeForm();
    this.loadContact();
  }

  private initializeForm(): void {
    this.contactForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)],
      ],
      cell: ['', [Validators.pattern(/^[\+]?[\d\s\-\(\)]+$/)]],
      street: [''],
      city: [''],
      state: [''],
      country: [''],
      postcode: [''],
      age: [null, [Validators.min(1), Validators.max(120)]],
      picture: [''],
    });

    this.contactForm.valueChanges.subscribe(() => {
      this.formChanged.update((v) => v + 1);
    });
  }

  private async loadContact(): Promise<void> {
    this.isLoading.set(true);
    try {
      const id = this.route.snapshot.paramMap.get('id');
      this.contactId.set(id);
      
      if (this.contactService.contacts().length === 0) {
        await this.contactService.loadContacts();
      }
      
      if (id && id !== 'new') {
        const contact = this.contact();
        if (contact) {
          this.populateForm(contact);
        } else {
          const isOnline = this.contactService.isOnline();
          const errorMessage = isOnline
            ? 'Contact not found'
            : 'Contact not available offline. Please connect to the internet to access this contact.';
          this.toastService.error(errorMessage);
          this.router.navigate(['/']);
        }
      } else if (id === 'new') {
        this.isEditing.set(true);
      }
    } catch (error) {
      const isOnline = this.contactService.isOnline();
      const errorMessage = isOnline
        ? 'Failed to load contact'
        : 'Unable to access contact while offline';
      this.toastService.error(errorMessage);
      this.router.navigate(['/']);
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
      picture: contact.picture.large || '',
    });
    this.contactForm.markAsPristine();
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
    try {
      const formData: ContactFormData = this.contactForm.value;
      const savedContact = this.isNewContact()
        ? await this.contactService.createContact(formData)
        : await this.contactService.updateContact(this.contactId()!, formData);

      if (savedContact) {
        this.isEditing.set(false);

        const contactName = this.isNewContact()
          ? this.getContactNameFromForm()
          : this.getContactFullName(savedContact);

        if (this.isNewContact()) {
          this.toastService.success(
            `Contact "${contactName}" created successfully!`
          );
          this.router.navigate(['/contacts']);
        } else {
          this.toastService.success(
            `Contact "${contactName}" updated successfully!`
          );
        }
      } else {
        const serviceError = this.contactService.error();
        this.toastService.error(serviceError || 'Failed to save contact');
      }
    } catch (error) {
      const serviceError = this.contactService.error();
      this.toastService.error(serviceError || 'Failed to save contact');
    } finally {
      this.isSaving.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (this.isNewContact()) {
      return;
    }
    const contact = this.contact();
    const contactName = contact
      ? this.getContactFullName(contact)
      : 'this contact';

    if (!confirm(`Are you sure you want to delete ${contactName}?`)) {
      return;
    }
    this.isSaving.set(true);
    try {
      const success = await this.contactService.deleteContact(this.contactId()!);
      if (success) {
        this.toastService.success(
          `Contact "${contactName}" deleted successfully!`
        );
        this.router.navigate(['/']);
      } else {
        this.toastService.error('Failed to delete contact');
      }
    } catch (error) {
      this.toastService.error('Failed to delete contact');
    } finally {
      this.isSaving.set(false);
    }
  }

  onBack(): void {
    this.router.navigate(['/']);
  }

  async onToggleFavorite(): Promise<void> {
    const contact = this.contact();
    if (!contact || this.isNewContact()) {
      return;
    }
    try {
      const updatedContact = await this.contactService.toggleFavorite(
        contact.id!
      );
      if (updatedContact) {
        const action = updatedContact.isFavorite ? 'added to' : 'removed from';
        const contactName = this.getContactFullName(updatedContact);
        this.toastService.success(`${contactName} ${action} favorites!`);
      }
    } catch (error) {
      this.toastService.error('Failed to update favorite status');
    }
  }

  getContactFullName(contact: Contact): string {
    return `${contact.name.first} ${contact.name.last}`.trim();
  }

  private getContactNameFromForm(): string {
    const firstName = this.contactForm.get('firstName')?.value || '';
    const lastName = this.contactForm.get('lastName')?.value || '';
    return `${firstName} ${lastName}`.trim();
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
      return 'Only digits, spaces, +, -, ( ) are allowed';
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
    Object.keys(this.contactForm.controls).forEach((key) => {
      const control = this.contactForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}
