# VE-Plan Backend

A comprehensive virtual event planning platform backend built with Node.js, Express, TypeScript, and MongoDB. VE-Plan enables users to organize and attend virtual events with real-time features, email notifications, and extensive user management.

## Features

### Authentication & User Management
- **Multi-role System**: Support for organizers and attendees
- **JWT Authentication**: Secure token-based authentication
- **Social Authentication**: Google OAuth2 and Facebook OAuth integration
- **Email Verification**: Secure email verification system
- **Password Management**: Forgot password and reset functionality
- **Email Notifications**: Automated email system for email verification and forgot password

### Event Management
- **Event CRUD Operations**: Create, view, update, and delete events
- **Session Management**: Multiple sessions per event with detailed scheduling
- **Calendar Integration**: Event scheduling with start/end times, category, and type

### Registration & Invitation System
- **Event Registration**: Attendees can register and unregister for events
- **Registration Approval**: Organizers can approve registrations
- **Event Invitations**: Send invitations to specific attendees
- **Invitation Management**: Attendees can receive and accept invitations
- **Email Notifications**: Automated email system for registration approval and invitations

### Meeting & Participation
- **Meeting Creation**: Organizers can create meetings for events
- **Participant Management**: Track meeting participants
- **Meeting Statistics**: Dashboard for meeting analytics
- **Real-time Attendance**: Live participant tracking
- **Email Notifications**: Automated email system for meeting notifications

### Real-time Features
- **Instant Notifications**: Socket.IO integration for real-time notifications
- **Live Meeting Support**: Real-time meeting functionality
- **Participant Tracking**: Live participant management

### Email System
- **Template-based Emails**: HTML email templates for all notifications
- **SMTP Integration**: Professional email delivery
- **OAuth2 Email**: Secure email authentication

## Technology Stack

- Node.js (v22.x)
- Express.js
- TypeScript
- Mongoose
- Passport.js
- JWT
- OAuth2
- Socket.IO
- Nodemailer
- Multer
