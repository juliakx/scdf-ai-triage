# Triage Assistant
A prototype **Agentic AI triage assistant** that helps users determine the most appropriate care pathway based on their symptoms. The system analyses symptom descriptions, retrieves relevant medical triage rules, and recommends actions such as self-care, visiting a GP or polyclinic, or emergency services.

## Features
- Conversational symptom triage interface
- Multilingual support (English, Chinese, Malay, Tamil)
- Integration with simulated patient records
- Retrieval of triage rules based on SCDF guidance
- Care pathway recommendations:
  - Self-care
  - GP / Polyclinic
  - Non-emergency ambulance (118)
  - Emergency recommendation with **Call 995** option
- Nearby clinic lookup based on patient location

## Prerequisites
Make sure the following are installed before moving on to setup:

- **Node.js (v18 or newer)**  
  https://nodejs.org

- **npm** (comes with Node.js)

- **Cloudflare account**  
  https://dash.cloudflare.com

## Setup Instructions

### 1. Clone the repository and install dependencies

```bash
npm install
```

### 2. Install Wrangler
```bash
npm install -g wrangler
```

### 3. Login to Cloudflare
Log in using your own Cloudflare account.
```bash
npx wrangler login
```

### 4. Create a Local D1 Database
```bash
npx wrangler d1 create triage-db
```

After creating the database, Wrangler will return a database ID.
Update wrangler.jsonc with your generated ID.
```json
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "triage-backend",
  "main": "src/index.ts",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "ai": {
    "binding": "AI"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "triage-db",
      "database_id": "REPLACE_WITH_YOUR_OWN_DATABASE_ID"
    }
  ]
}
```
Replace "REPLACE_WITH_YOUR_OWN_DATABASE_ID" with the ID returned when creating the database.

### 5. Initialise the Database
Run the following commands to create tables and seed the database.
```bash
npx wrangler d1 execute triage-db --local --file=./schema.sql
npx wrangler d1 execute triage-db --local --file=./import_rules.sql
npx wrangler d1 execute triage-db --local --file=./import_data.sql
npx wrangler d1 execute triage-db --local --file=./import_pac.sql
npx wrangler d1 execute triage-db --local --file=./import_clinics.sql
```

### 6. Run the Application
```bash
npx wrangler dev
```
The application will be available locally through the URL shown in the terminal.
