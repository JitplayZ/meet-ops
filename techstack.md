# ResourceFlow – Technical Stack

## Architecture Overview

ResourceFlow uses a modern frontend-heavy SaaS architecture:

Frontend (React)
→ Firebase Backend
→ Firestore Database

Testing:

TestSprite MCP

---

## Frontend Stack

Framework:

React (Vite)

Why:

Fast development

Component structure

Good ecosystem

---

## UI Framework

Tailwind CSS

Benefits:

Fast styling

Responsive utilities

Clean design

---

## Frontend Libraries

React Router → navigation

Firebase SDK → backend integration

React Hook Form → forms

Zod → validation

Date-fns → date handling

Optional:

Shadcn UI

Headless UI

---

## Backend Platform

Firebase

Services used:

Firebase Authentication

Firestore Database

Firebase Security Rules

(Optional)

Cloud Functions

---

## Authentication

Firebase Auth:

Email/password authentication

Password reset

Session management

Token handling handled by Firebase.

---

## Database

Firestore NoSQL database.

Collections:

users

resources

bookings

notifications

Example structure:

users:

uid

name

email

role

resources:

name

location

capacity

rules

bookings:

resourceId

userId

startTime

endTime

status

---

## Booking Engine

Core logic:

Conflict detection

Booking validation

Approval workflow

Permission checks

Handled through:

Firestore queries

Frontend validation

Optional Cloud Functions.

---

## Security

Firebase Security Rules enforce:

User permissions

Admin access

Booking ownership

Example:

Users can only edit own bookings.

Admins can manage resources.

---

## Testing Stack

Primary:

TestSprite MCP

Purpose:

Generate tests

Validate workflows

Find bugs

Must include:

testsprite_tests folder

Generated artifacts:

Test plans

Test cases

Execution reports

Optional:

Playwright

Jest

---

## Development Tools

VS Code

Git

GitHub

Firebase Console

Postman

Chrome DevTools

---

## Deployment

Frontend:

Vercel

Backend:

Firebase Hosting

Database:

Firestore

Auth:

Firebase Auth

---

## Project Structure

project/

frontend/

firebase/

testsprite_tests/

README.md

mcp.json

---

## Recommended Structure

frontend:

pages

components

layouts

hooks

services

firebase:

config

auth

firestore

rules

---

## Logging

Basic logs:

Booking created

Booking approved

Resource updated

User login

Stored in Firestore.

---

## Hackathon Technical Goals

Demonstrate:

Firebase SaaS architecture

Real workflows

TestSprite testing

QA validation

Not required:

Microservices

Complex CI/CD

Payments

---

## Conclusion

The chosen stack enables rapid SaaS development while maintaining realistic architecture and enabling meaningful TestSprite testing workflows.
