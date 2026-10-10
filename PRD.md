# ResourceFlow – Product Requirements Document (PRD)

## Product Overview

**ResourceFlow** is a SaaS platform designed to help organizations manage shared resources such as meeting rooms, equipment, studios, and operational assets through a centralized booking system.

The platform prevents scheduling conflicts, supports approval workflows, and provides visibility into resource utilization.

This project also demonstrates how modern SaaS products can be validated using automated QA workflows powered by TestSprite MCP.

---

## Problem Statement

Organizations frequently face issues such as:

• Double booking of resources
• No centralized booking system
• Manual scheduling via spreadsheets
• Lack of approval workflows
• Poor resource visibility

These inefficiencies reduce productivity and create operational friction.

---

## Product Goals

Primary Goals:

• Centralized booking platform
• Prevent booking conflicts
• Enable approval workflows
• Provide booking visibility
• Provide clean SaaS experience

Hackathon Goals:

• Demonstrate TestSprite MCP testing on real workflows
• Provide multiple realistic user flows
• Show QA validation of SaaS behavior

---

## Target Users

Primary Users:

• Startups
• Small teams
• Educational institutions
• Agencies
• Studios

User Roles:

### Admin

Can:

• Create resources
• Manage users
• View all bookings
• Configure rules
• Approve bookings

### Manager

Can:

• Approve resource bookings
• View assigned resources
• Manage booking requests

### User

Can:

• Create bookings
• View own bookings
• Cancel bookings
• Check availability

---

## Core Features

### 1 Authentication System (Firebase Auth)

Users must be able to:

• Register account
• Login
• Logout
• Reset password

Validation:

• Email uniqueness
• Password rules
• Required fields

Authentication handled using Firebase Authentication.

---

### 2 Role Based Access Control

Roles stored in Firestore:

Admin
Manager
User

Permissions enforced through:

Firestore rules
Frontend checks

---

### 3 Dashboard

Dashboard displays:

• Upcoming bookings
• Booking statistics
• Resource usage
• Quick actions

Purpose:

Provide operational visibility.

---

### 4 Resource Management

Admin must be able to:

• Create resource
• Edit resource
• Delete resource
• Define availability
• Define rules

Resource fields:

Name
Description
Location
Capacity
Availability hours
Booking rules

---

### 5 Booking Creation

Users must be able to:

• Select resource
• Select date/time
• Add purpose
• Add attendees

Validation:

• No conflict
• Valid times
• Within rules

Booking states:

Pending
Approved
Rejected
Cancelled
Completed

---

### 6 Conflict Detection

System must prevent:

• Overlapping bookings
• Invalid time ranges
• Out-of-hours booking

Edge cases:

Same start time
Boundary overlap
Simultaneous booking

Logic implemented in frontend validation and Firestore checks.

---

### 7 Approval Workflow

Flow:

User submits booking
→ Pending
→ Manager/Admin approves
→ Approved

Alternative:

Rejected

State tracking stored in Firestore.

---

### 8 Booking Management

Users:

View bookings
Cancel booking
Reschedule booking

Admins:

View all bookings
Filter bookings
Modify bookings

---

### 9 Notifications

In-app notifications:

Booking created
Booking approved
Booking rejected
Booking cancelled

Stored as activity logs.

Optional:

Firebase Cloud Messaging (future).

---

### 10 Search & Filtering

Filters:

Date
Resource
Status
User

Provides booking discovery.

---

## Non Functional Requirements

Performance:

Fast Firestore queries

Security:

Firebase Auth security
Firestore rules enforcement

Reliability:

Accurate conflict detection

Usability:

Simple booking flow

---

## Data Model (Firestore)

Collections:

users
resources
bookings
notifications

---

## Success Metrics

• Booking creation success
• Conflict prevention
• Approval completion
• Generated TestSprite tests
• QA workflow demonstration

---

## MVP Scope

Must build:

Auth
Dashboard
Resource management
Booking system
Conflict detection
Approval workflow
Booking management

Avoid:

Payments
Integrations
Complex analytics

---

## Conclusion

ResourceFlow is a realistic SaaS MVP demonstrating:

• Real business workflows
• Firebase based architecture
• Booking logic
• Automated testing validation

The focus is demonstrating how QA tools like TestSprite can validate real SaaS behavior.
