# 📱 Contact Management App

A modern, offline-first contact management application built with Angular 20 that provides seamless functionality both online and offline for mobile and desktop devices.

## 🌟 Overview

This Progressive Web Application (PWA) was developed for a contact management system that works reliably in areas with unstable or no network connectivity. The app features a mobile-optimized UI with full CRUD operations that sync automatically when connectivity is restored.

## ✨ Key Features

### 📋 Contact List
- **Contact Grid Display**: Clean, responsive grid showing contact cards with essential information
- **Contact Information**: Name, email, phone, location, age, and profile pictures
- **Search Functionality**: Real-time search across names, emails, and phone numbers
- **Quick Actions**: 
  - ➕ Create new contact
  - 🎲 Add 10 random contacts (using [RandomUser.me](https://randomuser.me/) API)
- **Favorite System**: Star/unstar contacts with visual indicators
- **Offline Indicators**: Visual cues showing sync status and offline state

### 📝 Contact Detail Page
- **Dual Mode Interface**: 
  - **View Mode**: Clean presentation of contact information
  - **Edit Mode**: Comprehensive form for contact modification
- **Complete Contact Fields**:
  - Personal: First name, last name, age
  - Contact: Email, phone, cell phone
  - Address: Street, city, state, country, postal code
  - Media: Profile picture support
  - Metadata: Registration date (auto-generated)

### 🔄 Offline Architecture
- **Local Storage**: All data persists locally using browser localStorage
- **Pending Operations Queue**: Changes made offline are queued for synchronization
- **Automatic Sync**: When connectivity returns, all pending changes sync automatically
- **Conflict Resolution**: Smart handling of data conflicts during sync
- **Toast Notifications**: User-friendly feedback for online/offline state changes

## 🛠️ Technical Stack

### Frontend
- **Framework**: Angular 20+ with standalone components
- **State Management**: Angular Signals for reactive state
- **HTTP Client**: RxJS with async/await pattern
- **Styling**: Pure CSS with mobile-first responsive design
- **PWA**: Service Worker integration for offline functionality

### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite for lightweight, file-based storage
- **API**: RESTful endpoints for CRUD operations
- **External API**: RandomUser.me integration for sample data

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yaksneumann/contact-manager.git
   cd contact-manager
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```
   Backend will run on `http://localhost:3000`

2. **Start the frontend development server**
   ```bash
   ng serve -o
   ```
   Frontend will run on `http://localhost:4200`

3. **Access the application**
   Open your browser and navigate to `http://localhost:4200`

## 📱 Mobile & Offline Testing

### Testing Offline Functionality
1. Open the app in your browser
2. Open DevTools → Network tab
3. Set throttling to "Offline"
4. Try creating, editing, or deleting contacts
5. Set back to "Online" to see automatic synchronization

### Mobile Testing
- Use browser DevTools device emulation
- Test on actual mobile devices
- Responsive design works on all screen sizes

## 🏗️ Project Structure

```
contact-management/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/          # Contact interfaces
│   │   │   └── services/        # Contact & sync services
│   │   ├── features/
│   │   │   ├── contact-list/    # List component
│   │   │   └── contact-detail/  # Detail component
│   │   └── shared/
│   │       ├── components/      # Header component
│   │       └── toast/          # Notification system
│   └── styles.css              # Global styles
├── backend/
│   ├── server.js               # Express server
│   ├── contacts.db            # SQLite database
│   └── package.json           # Backend dependencies
└── public/
    ├── manifest.webmanifest   # PWA manifest
    └── icons/                 # App icons
```

## 🎯 Features Demonstration

### Contact Management
- ✅ Create new contacts with comprehensive form validation
- ✅ Edit existing contacts with pre-populated data
- ✅ Delete contacts with confirmation dialog
- ✅ Toggle favorite status with instant visual feedback

### Data Persistence
- ✅ Automatic local storage of all contact data
- ✅ Seamless offline operation with pending sync queue
- ✅ Smart conflict resolution when coming back online

### User Experience
- ✅ Toast notifications for all user actions
- ✅ Loading states and error handling
- ✅ Responsive design for mobile and desktop
- ✅ Progressive Web App capabilities

## 🔧 Build & Deployment

### Production Build
```bash
npm run build
```

### Testing
```bash
npm test
```
