export interface Contact {
  id?: string;
  name: {
    first: string;
    last: string;
  };
  email: string;
  phone: string;
  cell: string;
  location: {
    street: {
      number: number;
      name: string;
    };
    city: string;
    state: string;
    country: string;
    postcode: string;
  };
  picture: {
    large: string;
    medium: string;
    thumbnail: string;
  };
  dob: {
    date: string;
    age: number;
  };
  registered: {
    date: string;
    age: number;
  };
  // Additional fields for local management
  isOnline?: boolean;
  lastModified?: string;
  pendingSync?: boolean;
}

export interface ContactFormData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cell: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
  age: number;
  picture?: string;
}

export interface RandomUserResponse {
  results: Contact[];
  info: {
    seed: string;
    results: number;
    page: number;
    version: string;
  };
}

export interface SyncOperation {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Contact;
  timestamp: string;
  retryCount: number;
}
