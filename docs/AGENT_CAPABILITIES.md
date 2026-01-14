# Agent Capabilities Guide

## Overview

The Citizens Advice Agent helps UK residents with everyday issues including benefits, housing, employment rights, consumer rights, and debt management.

## 🎯 Supervisor Agent

### Role
The Supervisor Agent orchestrates conversations and delegates to specialized tools via the AgentCore Gateway.

### Core Capabilities

#### 1. Conversation Orchestration
- Routes user requests to appropriate tools
- Maintains conversation context across sessions
- Provides location-aware guidance based on user's postcode/region

#### 2. Notes Management
The supervisor manages user notes via MCP tools:

**`save_note(user_id, title, content, category)`**
- Saves notes for users to track their cases
- Categories: benefits, housing, employment, consumer, debt, immigration, other

**`get_notes(user_id)`**
- Retrieves all notes for a user

**`delete_note(user_id, note_id)`**
- Removes a specific note

---

## 📋 Citizens Advice Assistant

### Role
Provides guidance on common issues affecting UK residents.

### Topic Areas

#### 1. Benefits
- Universal Credit applications and issues
- PIP (Personal Independence Payment)
- Housing Benefit
- Council Tax Support
- Pension Credit

#### 2. Housing
- Tenancy rights and responsibilities
- Eviction procedures and protection
- Repairs and maintenance issues
- Deposit disputes
- Homelessness support

#### 3. Employment Rights
- Unfair dismissal
- Redundancy rights
- Workplace discrimination
- Holiday and sick pay
- Zero-hours contracts

#### 4. Consumer Rights
- Faulty goods returns
- Service complaints
- Contract disputes
- Refund rights
- Online shopping issues

#### 5. Debt Management
- Priority vs non-priority debts
- Debt solutions (DRO, IVA, bankruptcy)
- Dealing with bailiffs
- Budgeting support
- Breathing space scheme

#### 6. Immigration
- Visa applications
- Right to work
- EU Settlement Scheme
- Family reunification

---

## 🔄 How It Works

### Example Flow

**User:** "I'm having trouble with my landlord not fixing the heating"

1. **Supervisor** receives request
2. Routes to **Citizens Advice Assistant**
3. Assistant provides:
   - Tenant rights under Housing Act
   - Steps to report to landlord in writing
   - Council environmental health options
   - Local Citizens Advice bureau contact
4. **Supervisor** can save key points as notes

---

## 🔑 Key Features

### Location-Based Routing
- User's postcode/region stored in profile
- Guidance tailored to local services
- Links to nearest Citizens Advice bureau

### Notes System
- Track case progress
- Save important information
- Categorize by topic area

### Conversation Memory
- Context preserved across sessions
- Follow-up questions understood
- Case history maintained

---

## 📊 Tool Summary

| Component | Tools | Primary Functions |
|-----------|-------|-------------------|
| **Supervisor** | 3 | Notes management, orchestration |
| **Citizens Advice Assistant** | 6 topic areas | Guidance on everyday issues |

---

## 🚀 Architecture

### Microservices Design
- Supervisor agent handles orchestration
- MCP servers provide specialized tools
- Gateway manages secure communication

### Data Storage
- **Notes**: DynamoDB via MCP server
- **User Profile**: Amplify DynamoDB (postcode, region)
- **Conversation**: AgentCore Memory service
