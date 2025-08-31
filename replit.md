# Overview

This is a full-stack web application for processing and converting liquor inventory data from fixed-width text files to Excel format. The application parses structured text files containing liquor records with specific field positions, extracts the data, and provides a user-friendly interface for viewing statistics and downloading the processed data as Excel files.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite for development tooling
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation schemas

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **File Processing**: Multer for file uploads with memory storage, XLSX library for Excel generation
- **Development**: Vite middleware integration for hot module replacement in development
- **Error Handling**: Centralized error middleware with structured error responses

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL connector
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Development Storage**: In-memory storage implementation for development/testing
- **Session Management**: PostgreSQL-backed session store using connect-pg-simple

## Authentication and Authorization
- **Session-based**: Express session middleware with PostgreSQL session storage
- **User Management**: Basic user creation and lookup functionality
- **Security**: Built-in session security with HTTP-only cookies

## External Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **File Processing**: Fixed-width text file parsing with specific field specifications
- **UI Components**: Radix UI ecosystem for accessible components
- **Development Tools**: Replit integration for development environment
- **Build Tools**: Vite for frontend bundling, esbuild for backend compilation