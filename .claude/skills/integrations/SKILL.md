---
name: integrations
description: >
  External integrations, WhatsApp Business API, SMS 46elks, Fortnox accounting,
  BankID signing, Resend email, Skatteverket ROT/RUT, object storage,
  digital twins, webhook handling, adapter pattern, twin server.
---

# Integrations Skill

## 7 Integrations Summary

### 1. WhatsApp Business Cloud API
```
POST /v21.0/{phone_number_id}/messages  — Send message
  Request: { messaging_product: "whatsapp", to: "+46...", type: "text"|"template"|"image", text: { body: "..." } }
  Response: { messages: [{ id: "wamid...." }] }
Webhook: POST /webhook/whatsapp — Incoming messages
Media: POST /v21.0/{id}/media (upload), GET /v21.0/{media_id} (URL)
```

### 2. SMS (46elks)
```
POST /a1/sms — Send SMS (form-encoded: from, to, message)
  Response: { id: "s123...", status: "created" }
Webhook: POST /webhook/sms — Incoming SMS
```

### 3. Fortnox Accounting
```
POST /3/invoices        — Create invoice
GET  /3/invoices/{id}   — Fetch invoice status
GET  /3/customers       — List customers
POST /3/customers       — Create customer
Auth: Access-Token header
```

### 4. BankID (Swedish Digital Signing)
```
POST /rp/v6.0/auth     — Initiate signing
  Request: { endUserIp, personalNumber, userVisibleData (base64) }
  Response: { orderRef, autoStartToken }
POST /rp/v6.0/collect   — Poll status
  Response: { status: "pending"|"complete"|"failed", completionData? }
```

### 5. Email (Resend)
```
POST /emails — Send email
  Request: { from, to: [...], subject, html, attachments?: [...] }
  Response: { id: "uuid" }
Webhook: POST /webhook/email — Incoming email
```

### 6. Skatteverket ROT/RUT
```
POST /rot-rut/ansokan — Submit claim
  Request: { utforare_orgnr, mottagare_personnr, fakturanummer, belopp_arbete, avdrag_typ, avdrag_belopp, ar }
  Response: { status: "mottagen", diarienummer, kvarvarande_utrymme }
```

### 7. Object Storage (Supabase Storage)
```
POST /storage/v1/object/{bucket}/{path}       — Upload file
POST /storage/v1/object/sign/{bucket}/{path}  — Get signed URL
  Response: { signedURL: "..." }
```

## Twin Architecture

Single Express.js server on port 9999:

```
/whatsapp/*     → WhatsApp twin
/sms/*          → SMS twin
/fortnox/*      → Fortnox twin
/bankid/*       → BankID twin
/email/*        → Email twin
/skatteverket/* → Skatteverket twin
/storage/*      → Storage twin
/twin/*         → Control endpoints
```

## Control Endpoints

```
POST   /twin/reset              — Clear all in-memory state
GET    /twin/inspect/:service   — Return stored data for a service
POST   /twin/simulate-incoming  — Trigger inbound webhook
POST   /twin/fail-next/:service — Next call returns error
```

All state is in-memory. No external dependencies beyond express and uuid.

## Environment Config Pattern

```env
# Dev (twins):
WHATSAPP_API_URL=http://localhost:9999/whatsapp
# Prod (real):
WHATSAPP_API_URL=https://graph.facebook.com
```

## Adapter Interface Pattern

```typescript
// types.ts
interface MessagingAdapter {
  sendMessage(to: string, text: string): Promise<{ id: string }>;
  sendTemplate(to: string, template: string, params: Record<string, string>): Promise<{ id: string }>;
}

interface AccountingAdapter {
  createInvoice(invoice: InvoiceData): Promise<{ id: string; number: number }>;
  getInvoice(id: string): Promise<InvoiceStatus>;
}
// ... etc for all 7
```

Application code imports the **interface**. Concrete adapter injected via config. Swapping provider requires zero business logic changes.

## Anti-Patterns

- **NEVER hardcode API URLs** — always read from environment variables
- **NEVER call real APIs in tests** — use twin server
- **ALL integrations behind an interface** — adapter pattern, no direct HTTP calls from business logic
- **NEVER import specific adapter directly** — import interface, inject concrete

See `docs/integration-twins.md` for full HTTP contracts.
