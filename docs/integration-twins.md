# Resonansia — Integration Twins v1.0

> HTTP/JSON contracts for Digital Twins (behavioral clones of external services).
> Used for automated testing without hitting production APIs.
> This file is fed to the integration agent alongside resonansia-spec.md.

**Last updated:** 2026-02-28

---

## Purpose

Per the StrongDM Software Factory methodology, testing against real third-party
APIs is unreliable and slow. Instead, we build Digital Twins — behavioral clones
that implement the same HTTP contract but run locally.

Each twin:
- Implements the exact endpoints the system calls
- Returns realistic responses
- Simulates error conditions (rate limits, timeouts, invalid data)
- Stores state in memory (no persistence needed)

---

## Twin 1: WhatsApp Business Cloud API

### Endpoints Used

```
POST /v21.0/{phone_number_id}/messages
  Send a text message, template message, or media message.

  Request:
  {
    "messaging_product": "whatsapp",
    "to": "+46701234567",                    // E.164 format
    "type": "text" | "template" | "image",
    "text": {
      "body": "✓ 8h registrerat på Eriksson. Dag 3 av 5."
    }
  }

  Response (200):
  {
    "messaging_product": "whatsapp",
    "contacts": [{ "input": "+46701234567", "wa_id": "46701234567" }],
    "messages": [{ "id": "wamid.HBgNNDY3MDEyMzQ1NjcVAgA..." }]
  }

  Error (429 — rate limit):
  {
    "error": {
      "message": "Rate limit hit",
      "type": "OAuthException",
      "code": 80007
    }
  }
```

```
Webhook: POST /webhook/whatsapp
  Incoming message notification.

  Payload:
  {
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "46701234567",
            "timestamp": "1711900800",
            "type": "text",
            "text": { "body": "8" }
          }]
        }
      }]
    }]
  }
```

```
Media upload/download:
  POST /v21.0/{phone_number_id}/media      — upload
  GET  /v21.0/{media_id}                    — get media URL
  GET  {media_url}                          — download media
```

### Twin Behavior

- Store sent messages in memory array
- Return incrementing `wamid.` IDs
- Simulate incoming webhooks via a test endpoint: `POST /twin/simulate-incoming`
- Rate limit simulation: return 429 after 80 messages/second
- Media: accept uploads, store in memory, return downloadable URL

---

## Twin 2: SMS Gateway (46elks)

### Endpoints Used

```
POST /a1/sms
  Send SMS.

  Request (form-encoded):
    from=Resonansia
    to=+46701234567
    message=✓ 8h registrerat på Eriksson.

  Response (200):
  {
    "id": "s1234567890abcdef",
    "from": "Resonansia",
    "to": "+46701234567",
    "message": "...",
    "status": "created",
    "created": "2026-03-28T14:32:00Z"
  }
```

```
Webhook: POST /webhook/sms
  Incoming SMS.

  Payload (form-encoded):
    id=s1234567890abcdef
    from=+46701234567
    to=+46101234567
    message=8
    created=2026-03-28T14:35:00Z
```

### Twin Behavior

- Store sent SMS in memory
- Return incrementing IDs
- Simulate incoming via: `POST /twin/simulate-sms`
- Character limit: 160 per segment (simulate multi-part for longer messages)
- Delivery callback simulation after 1-3 seconds

---

## Twin 3: Fortnox Accounting API

### Endpoints Used

```
POST /3/invoices
  Create invoice.

  Request:
  {
    "Invoice": {
      "CustomerNumber": "10042",
      "InvoiceDate": "2026-03-28",
      "DueDate": "2026-04-27",
      "InvoiceRows": [
        {
          "ArticleNumber": "LABOR-1",
          "Description": "Målningsarbete — vardagsrum",
          "DeliveredQuantity": 24,
          "Price": 650,
          "VAT": 25
        }
      ],
      "YourReference": "Erik Eriksson",
      "OurReference": "Kimmo Virtanen",
      "Currency": "SEK"
    }
  }

  Response (201):
  {
    "Invoice": {
      "DocumentNumber": 10042,
      "InvoiceNumber": 10042,
      "Total": 56250,
      "TotalVAT": 11250,
      "Balance": 56250,
      "@url": "https://api.fortnox.se/3/invoices/10042"
    }
  }
```

```
GET /3/invoices/{DocumentNumber}
  Fetch invoice status.

  Response (200):
  {
    "Invoice": {
      "DocumentNumber": 10042,
      "Balance": 0,          // 0 = paid
      "Booked": true,
      "Cancelled": false,
      "FinalPayDate": "2026-04-15"
    }
  }
```

```
GET /3/customers
  List customers.

POST /3/customers
  Create customer.

  Request:
  {
    "Customer": {
      "Name": "Erik Eriksson",
      "Address1": "Storgatan 12",
      "ZipCode": "114 55",
      "City": "Stockholm",
      "Email": "erik@eriksson.se",
      "Phone1": "+46701234567",
      "OrganisationNumber": ""
    }
  }
```

### Twin Behavior

- In-memory customer and invoice store
- Auto-incrementing DocumentNumbers starting at 10001
- Simulate payment: `POST /twin/simulate-payment?invoice=10042`
- Validate: reject if missing required fields, return 400 with Fortnox-style error
- Auth: validate `Access-Token` header presence (any non-empty value accepted by twin)

---

## Twin 4: BankID (Swedish Digital Signing)

### Endpoints Used

```
POST /rp/v6.0/auth
  Initiate authentication/signing.

  Request:
  {
    "endUserIp": "192.168.1.1",
    "personalNumber": "199001011234",
    "userVisibleData": "U2lnbmVyYSBvZmZlcnQgUS0yMDI2LTA0Mg==",  // base64
    "userVisibleDataFormat": "simpleMarkdownV1"
  }

  Response (200):
  {
    "orderRef": "131daac9-16c6-4c9b-a61f-554e4d9b3122",
    "autoStartToken": "7c40b5bd-8abc-400e-a29b-..."
  }
```

```
POST /rp/v6.0/collect
  Poll for signing status.

  Request:
  { "orderRef": "131daac9-16c6-4c9b-a61f-554e4d9b3122" }

  Response — pending:
  { "orderRef": "...", "status": "pending", "hintCode": "outstandingTransaction" }

  Response — complete:
  {
    "orderRef": "...",
    "status": "complete",
    "completionData": {
      "user": {
        "personalNumber": "199001011234",
        "name": "Erik Eriksson",
        "givenName": "Erik",
        "surname": "Eriksson"
      },
      "signature": "base64...",
      "ocspResponse": "base64..."
    }
  }

  Response — failed:
  { "orderRef": "...", "status": "failed", "hintCode": "userCancel" }
```

### Twin Behavior

- Store active signing sessions in memory
- First collect call: return "pending"
- Second collect call (after 2+ seconds): return "complete"
- Simulate failure: `POST /twin/simulate-bankid-fail?orderRef=...`
- Validate personalNumber format (12 digits)
- Auto-complete after 5 seconds if not polled (cleanup)

---

## Twin 5: Email (Resend)

### Endpoints Used

```
POST /emails
  Send email.

  Request:
  {
    "from": "Resonansia <noreply@resonansia.se>",
    "to": ["erik@eriksson.se"],
    "subject": "Offert Q-2026-042 — Eriksson Interior Painting",
    "html": "<html>...</html>",
    "attachments": [
      {
        "filename": "offert-Q-2026-042.pdf",
        "content": "base64..."
      }
    ]
  }

  Response (200):
  {
    "id": "ae2014de-c168-4c61-8267-70d2662a1ce1"
  }
```

```
Webhook: POST /webhook/email
  Incoming email (for reply handling).

  Payload:
  {
    "from": "erik@eriksson.se",
    "to": "project-42@reply.resonansia.se",
    "subject": "Re: Status update",
    "text": "Great, thanks!",
    "html": "<html>Great, thanks!</html>"
  }
```

### Twin Behavior

- Store sent emails in memory with full payload
- Simulate incoming via: `POST /twin/simulate-email`
- Simulate bounce: `POST /twin/simulate-bounce?id=...`
- Validate: reject if missing `from`, `to`, or `subject`

---

## Twin 6: Skatteverket ROT/RUT API

### Endpoints Used

```
POST /rot-rut/ansokan
  Submit ROT/RUT claim.

  Request:
  {
    "utforare_orgnr": "5561234567",
    "mottagare_personnr": "199001011234",
    "fakturanummer": "10042",
    "belopp_arbete": 33800,      // öre: 338 SEK × 100
    "avdrag_typ": "ROT",
    "avdrag_belopp": 10140,      // 30% of labor
    "ar": 2026
  }

  Response (200):
  {
    "status": "mottagen",
    "diarienummer": "SKV-2026-ROT-00042",
    "kvarvarande_utrymme": 39860   // remaining ROT space for this person this year
  }

  Response (400 — max exceeded):
  {
    "status": "avvisad",
    "felkod": "MAX_OVERSKRIDEN",
    "meddelande": "Personen har redan utnyttjat 50 000 kr i ROT-avdrag 2026."
  }
```

### Twin Behavior

- Track accumulated ROT/RUT per personnummer per year
- Enforce 50,000 SEK ROT max and 75,000 SEK combined max
- Return remaining space in response
- Simulate rejection when max exceeded

---

## Twin 7: Object Storage (Supabase Storage)

### Endpoints Used

```
POST /storage/v1/object/{bucket}/{path}
  Upload file.

  Headers:
    Authorization: Bearer {jwt}
    Content-Type: image/jpeg (or other)

  Body: raw binary

  Response (200):
  { "Key": "project-photos/2026-03-28/photo-001.jpg" }
```

```
POST /storage/v1/object/sign/{bucket}/{path}
  Generate signed URL.

  Request:
  { "expiresIn": 3600 }

  Response (200):
  { "signedURL": "https://storage.resonansia.se/...?token=..." }
```

### Twin Behavior

- Store files in memory (Buffer)
- Return signed URLs that resolve to the stored content
- Enforce max file size: 10 MB
- Clean up files older than 1 hour

---

## Twin Infrastructure

### Running Twins

All twins run as a single Express.js server on port 9999:

```
/whatsapp/*          → Twin 1
/sms/*               → Twin 2
/fortnox/*           → Twin 3
/bankid/*             → Twin 4
/email/*             → Twin 5
/skatteverket/*      → Twin 6
/storage/*           → Twin 7
/twin/*              → Control endpoints (simulate-incoming, reset, inspect)
```

### Control Endpoints (all twins)

```
POST   /twin/reset              — Clear all in-memory state
GET    /twin/inspect/{service}  — Return all stored messages/requests for a service
POST   /twin/simulate-incoming  — Trigger an inbound webhook
POST   /twin/fail-next/{service}— Make the next call to {service} return an error
```

### Environment Configuration

```env
# In test/development, point all integrations to twins:
WHATSAPP_API_URL=http://localhost:9999/whatsapp
SMS_API_URL=http://localhost:9999/sms
FORTNOX_API_URL=http://localhost:9999/fortnox
BANKID_API_URL=http://localhost:9999/bankid
EMAIL_API_URL=http://localhost:9999/email
SKATTEVERKET_API_URL=http://localhost:9999/skatteverket
STORAGE_API_URL=http://localhost:9999/storage

# In production, point to real services:
WHATSAPP_API_URL=https://graph.facebook.com
SMS_API_URL=https://api.46elks.com
FORTNOX_API_URL=https://api.fortnox.se
# ... etc
```

---

## What This File Does NOT Cover

- AI model mocking (use real AI in tests; mock only for unit tests of classification logic)
- Database mocking (use actual Supabase local instance)
- End-to-end browser testing (use Playwright, not covered here)
