# Email Functionality for Assignments

This document outlines the email notification system for assignments in the Verse Learning platform.

## Overview

The email functionality allows teachers to notify students when assignments are created, and sends reminder emails when deadlines are approaching. This is implemented using Firebase Cloud Functions.

## Features

1. **Assignment Notification Emails**
   - Automatically triggered when a new assignment is created
   - Contains details about the game, deadline, and completion requirements
   - Includes a direct link to play the assigned game

2. **Deadline Reminder Emails**
   - Sent daily for assignments due within the next 24 hours
   - Reminds students of pending assignments and their progress
   - Helps improve completion rates

## Implementation Details

### Frontend Components

- **AssignGameForm**: Updated to inform teachers that students will receive email notifications
- **assignmentService.ts**: Modified to add email-related flags to new assignments

### Backend (Firebase Cloud Functions)

- **sendAssignmentEmail**: Triggered by Firestore document creation
- **sendReminderEmails**: Scheduled to run daily
- Both functions use Nodemailer to send formatted HTML emails

## Email Templates

The emails are formatted as HTML and include:
- Assignment details (game name, type, deadline)
- Teacher information
- A clickable button to access the assignment
- Fallback text link for email clients that don't support buttons

## Deployment

The Firebase Functions for email functionality are deployed separately from the frontend. See the `/functions/DEPLOYMENT.md` file for detailed deployment instructions.

## Configuration

The following environment variables need to be set in Firebase:
- `EMAIL_USER`: The email address to send from
- `EMAIL_PASSWORD`: The password or app password for the email account
- `app.url`: The base URL of the application (for generating assignment links)

## Future Improvements

Potential enhancements to the email system:
- Customizable email templates for teachers
- Rich text formatting options
- Email open/click tracking
- Adjustable reminder schedules
- More sophisticated email queue management for high volume 