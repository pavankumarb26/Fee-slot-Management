# College Fee Counter Appointment Booking System - Specification

## 1. Project Overview

**Project Name:** College Fee Counter Appointment Booking System
**Project Type:** Full-stack Real-time Web Application
**Core Functionality:** A web-based appointment slot booking system that eliminates queues at college fee counters by allowing students to reserve 5-minute appointment slots.
**Target Users:** College students and office staff

---

## 2. Technical Stack

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** Socket.IO
- **Architecture:** MVC Pattern

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router v6
- **State Management:** Context API + useReducer
- **HTTP Client:** Axios
- **Real-time:** Socket.IO Client
- **Notifications:** React Hot Toast

---

## 3. Database Schema

### Students Collection
```json
{
  "_id": "ObjectId",
  "registrationNumber": "String (unique, indexed)",
  "password": "String (hashed)",
  "name": "String",
  "email": "String",
  "phone": "String",
  "bookingAttempts": { "type": "Number", "default": 2 },
  "hasCancelledToday": { "type": "Boolean", "default": false },
  "lastCancelledAt": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Staff Collection
```json
{
  "_id": "ObjectId",
  "username": "String (unique)",
  "password": "String (hashed)",
  "name": "String",
  "role": { "type": "String", "enum": ["staff", "admin"], "default": "staff" },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### TimeSlots Collection
```json
{
  "_id": "ObjectId",
  "date": { "type": "Date", "index": true },
  "startTime": "String (HH:mm)",
  "endTime": "String (HH:mm)",
  "status": { "type": "String", "enum": ["available", "booked", "expired", "hidden"], "default": "available", "index": true },
  "bookedBy": { "type": "ObjectId", "ref": "Student", "nullable": true },
  "bookedAt": "Date (nullable)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Bookings Collection
```json
{
  "_id": "ObjectId",
  "student": { "type": "ObjectId", "ref": "Student", "index": true },
  "slot": { "type": "ObjectId", "ref": "TimeSlot" },
  "date": { "type": "Date", "index": true },
  "status": { "type": "String", "enum": ["active", "cancelled", "expired", "completed"], "index": true },
  "bookedAt": "Date",
  "cancelledAt": "Date (nullable)",
  "reminderSent": { "type": "Boolean", "default": false },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Availability Collection
```json
{
  "_id": "ObjectId",
  "date": { "type": "Date", "unique": true, "index": true },
  "timeRanges": [{
    "startTime": "String (HH:mm)",
    "endTime": "String (HH:mm)"
  }],
  "isActive": { "type": "Boolean", "default": true },
  "createdBy": { "type": "ObjectId", "ref": "Staff" },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Notifications Collection
```json
{
  "_id": "ObjectId",
  "student": { "type": "ObjectId", "ref": "Student", "index": true },
  "type": { "type": "String", "enum": ["reminder", "booking", "cancellation", "closed"] },
  "title": "String",
  "message": "String",
  "isRead": { "type": "Boolean", "default": false },
  "createdAt": "Date"
}
```

---

## 4. Authentication Flow

### Student Login
1. Student enters Registration Number and Password
2. Backend validates against college authentication endpoint
3. On success, create JWT token and store student in database if new
4. Return JWT token and student data

### Staff Login
1. Staff enters username and password
2. Password compared with hashed value in database
3. Return JWT token and staff data

### Token Structure
```json
{
  "userId": "ObjectId",
  "role": "student | staff",
  "exp": "timestamp"
}
```

---

## 5. Core Features

### 5.1 Slot Generation Rules
- Staff provides time ranges (e.g., "10:00 AM - 12:00 PM")
- System generates 5-minute slots automatically
- Example: 10:00, 10:05, 10:10, ... 11:55
- Unlimited time ranges supported per day

### 5.2 Booking Rules
- Students can only book TODAY's slots
- Maximum 2 booking ATTEMPTS per day (booking or cancellation each consume 1 attempt)
- Only 1 ACTIVE booking at a time
- Atomic booking with optimistic locking to prevent double booking

### 5.3 Cancellation Rules
- Student can cancel their booking anytime
- Cancellation consumes 1 booking attempt
- After cancellation, if student books again, they are automatically assigned the LAST available slot
- If no slots available, show "No slots available today"

### 5.4 Expiry Rules
- Slots automatically expire when current time passes end time
- Expired slots are hidden from student view
- Cron job runs every minute to expire slots

### 5.5 Booking Closure
- Staff can instantly close today's booking
- All remaining slots become hidden
- Socket.IO notifies all connected students

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/student/login | Student login | Public |
| POST | /api/auth/staff/login | Staff login | Public |
| POST | /api/auth/logout | Logout | Required |
| GET | /api/auth/me | Get current user | Required |

### Staff Routes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/staff/availability | Create today's availability | Staff |
| GET | /api/staff/availability/:date | Get availability for date | Staff |
| POST | /api/staff/close-booking | Close today's booking | Staff |
| GET | /api/staff/stats | Get today's statistics | Staff |

### Student Routes
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | /api/slots/today | Get today's available slots | Student |
| POST | /api/slots/book/:slotId | Book a slot | Student |
| POST | /api/slots/cancel/:bookingId | Cancel booking | Student |
| GET | /api/bookings/my-active | Get my active booking | Student |
| GET | /api/bookings/history | Get booking history | Student |
| GET | /api/notifications | Get my notifications | Student |
| PUT | /api/notifications/:id/read | Mark as read | Student |

---

## 7. Socket.IO Events

### Client to Server
| Event | Payload | Description |
|-------|---------|-------------|
| join | { studentId } | Student joins their room |
| leave | { studentId } | Student leaves room |

### Server to Client
| Event | Payload | Description |
|-------|---------|-------------|
| slot:booked | { slot } | A slot was booked |
| slot:cancelled | { slot } | A slot was cancelled |
| slot:expired | { slotId } | A slot expired |
| booking:closed | { message } | All bookings closed |
| availability:updated | { slots } | New slots available |

---

## 8. UI/UX Specification

### 8.1 Color Palette
```
Primary:      #3B82F6 (Blue 500)
Primary Dark: #1D4ED8 (Blue 700)
Secondary:    #10B981 (Emerald 500)
Accent:       #F59E0B (Amber 500)
Success:      #22C55E (Green 500)
Error:        #EF4444 (Red 500)
Warning:      #F59E0B (Amber 500)
Background:   #F8FAFC (Slate 50)
Surface:      #FFFFFF (White)
Text Primary: #0F172A (Slate 900)
Text Secondary: #64748B (Slate 500)
Border:       #E2E8F0 (Slate 200)
Dark Mode:
  Background: #0F172A (Slate 900)
  Surface:   #1E293B (Slate 800)
  Text:      #F1F5F9 (Slate 100)
```

### 8.2 Typography
```
Font Family: Inter (Google Fonts)
Fallback: system-ui, -apple-system, sans-serif
Heading 1: 2.5rem (40px), font-weight: 700
Heading 2: 2rem (32px), font-weight: 600
Heading 3: 1.5rem (24px), font-weight: 600
Body: 1rem (16px), font-weight: 400
Small: 0.875rem (14px), font-weight: 400
```

### 8.3 Spacing System
```
Base unit: 4px
Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64, 96
Card padding: 24px
Section gap: 32px
```

### 8.4 Border Radius
```
Small: 8px
Medium: 12px
Large: 16px
Full: 9999px (pills)
```

### 8.5 Shadows
```
sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)
xl: 0 20px 25px -5px rgb(0 0 0 / 0.1)
```

### 8.6 Animations
```
Duration: 150ms (fast), 300ms (normal), 500ms (slow)
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Slot card hover: scale(1.02), 150ms
Countdown pulse: scale animation on urgent
Toast: slide in from top, fade out
```

### 8.7 Responsive Breakpoints
```
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
Mobile-first approach
```

---

## 9. Page Structure

### 9.1 Student Pages

#### Login Page (`/login`)
- Registration number input
- Password input with show/hide toggle
- Login button
- College logo/branding
- Loading state on button

#### Dashboard (`/dashboard`)
- Header with logo, student name, logout
- Booking attempts remaining badge
- Active booking card (if any)
  - Slot time display
  - Countdown timer (updates every second)
  - Cancel button
- Today's slots grid
  - Slot cards with time, status
  - Book button for available slots
  - Visual distinction for booked/expired
- No slots message if unavailable

#### Booking History (`/history`)
- Tab navigation: All, Active, Cancelled, Expired
- Booking cards with details
- Empty state for each tab

### 9.2 Staff Pages

#### Staff Login (`/staff/login`)
- Username input
- Password input
- Login button

#### Staff Dashboard (`/staff/dashboard`)
- Header with logo, staff name, logout
- Today's status card
- Time range inputs (add multiple)
- Save availability button
- Today's slots overview
- Close booking button (danger style)
- Statistics card

---

## 10. Component Library

### Shared Components
```
Button (variants: primary, secondary, danger, ghost)
Input (with label, error state, icon support)
Card (with header, body, footer sections)
Badge (status indicators)
Modal (confirmation dialogs)
Toast (notifications)
Skeleton (loading states)
Countdown (timer component)
SlotCard (time display, status, actions)
Avatar (user initials)
Header (logo, nav, user menu)
```

---

## 11. Project Structure

```
/root
├── client/                 # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Context providers
│   │   ├── hooks/         # Custom hooks
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── utils/         # Utility functions
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── server/                 # Node.js Backend
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── controllers/  # Route handlers
│   │   ├── jobs/          # Cron jobs
│   │   ├── middleware/   # Express middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── services/     # Business logic
│   │   ├── socket/        # Socket.IO handlers
│   │   └── utils/         # Utility functions
│   └── server.js
├── SPEC.md
└── README.md
```

---

## 12. Security Requirements

- JWT tokens with 24h expiry
- Password hashing with bcrypt (12 rounds)
- Rate limiting: 100 requests per 15 minutes
- Input validation using express-validator
- MongoDB injection prevention
- CORS configuration
- Helmet.js security headers
- Environment variables for secrets

---

## 13. Acceptance Criteria

1. **Authentication**
   - [x] Students can login with registration number and password
   - [x] Staff can login with username and password
   - [x] Protected routes redirect to login
   - [x] JWT tokens stored securely

2. **Slot Management**
   - [x] Staff can create availability with multiple time ranges
   - [x] Slots generated automatically at 5-minute intervals
   - [x] Staff can close all bookings instantly

3. **Booking**
   - [x] Students can view today's available slots
   - [x] Students can book available slots
   - [x] Atomic booking prevents double bookings
   - [x] Maximum 2 booking attempts enforced
   - [x] Only 1 active booking allowed

4. **Cancellation**
   - [x] Students can cancel bookings
   - [x] Cancellation consumes attempt and marks hasCancelledToday
   - [x] Re-booking after cancel auto-assigns last slot

5. **Real-time Updates**
   - [x] Slot bookings update all connected clients
   - [x] Cancellations propagate in real-time
   - [x] Booking closure notifies all students

6. **Expiry**
   - [x] Past slots automatically expire
   - [x] Expired slots hidden from view

7. **UI/UX**
   - [x] Mobile-first responsive design
   - [x] Dark mode support
   - [x] Loading skeletons
   - [x] Toast notifications
   - [x] Countdown timer with live updates
   - [x] Smooth animations

---

## 14. Environment Variables

### Server (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fee-booking
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
CLIENT_URL=http://localhost:5173
COLLEGE_AUTH_URL=https://college-website.edu/api/auth
```

### Client (.env)
```
VITE_API_URL=https://fee-slot-management.onrender.com/api
VITE_SOCKET_URL=https://fee-slot-management.onrender.com
```