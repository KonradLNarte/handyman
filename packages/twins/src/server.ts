import express, { type Express } from "express";
import { v4 as uuid } from "uuid";

const app: Express = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// ============================================================================
// IN-MEMORY STATE
// ============================================================================

interface TwinState {
  whatsapp: { messages: any[]; media: Map<string, Buffer> };
  sms: { messages: any[] };
  fortnox: { invoices: Map<number, any>; customers: Map<number, any>; nextDocNum: number; nextCustNum: number };
  bankid: { sessions: Map<string, { status: string; personalNumber: string; pollCount: number }> };
  email: { emails: any[] };
  skatteverket: { claims: any[]; accumulated: Map<string, { rot: number; rut: number }> };
  storage: { files: Map<string, { data: Buffer; metadata: any }> };
}

let state: TwinState = createFreshState();

function createFreshState(): TwinState {
  return {
    whatsapp: { messages: [], media: new Map() },
    sms: { messages: [] },
    fortnox: { invoices: new Map(), customers: new Map(), nextDocNum: 10001, nextCustNum: 10001 },
    bankid: { sessions: new Map() },
    email: { emails: [] },
    skatteverket: { claims: [], accumulated: new Map() },
    storage: { files: new Map() },
  };
}

// Fail-next tracking
const failNext: Map<string, boolean> = new Map();

function shouldFail(service: string): boolean {
  if (failNext.get(service)) {
    failNext.set(service, false);
    return true;
  }
  return false;
}

// ============================================================================
// CONTROL ENDPOINTS
// ============================================================================

app.post("/twin/reset", (_req, res) => {
  state = createFreshState();
  failNext.clear();
  res.json({ status: "reset" });
});

app.get("/twin/inspect/:service", (req, res) => {
  const service = req.params.service as keyof TwinState;
  if (!(service in state)) {
    res.status(404).json({ error: `Unknown service: ${service}` });
    return;
  }
  const svc = state[service];
  // Convert Maps to arrays/objects for JSON serialization
  const serializable: any = {};
  for (const [key, val] of Object.entries(svc)) {
    if (val instanceof Map) {
      serializable[key] = Object.fromEntries(val);
    } else {
      serializable[key] = val;
    }
  }
  res.json(serializable);
});

app.post("/twin/simulate-incoming", (req, res) => {
  // Generic: caller provides service and payload to simulate
  res.json({ status: "simulated", body: req.body });
});

app.post("/twin/fail-next/:service", (req, res) => {
  failNext.set(req.params.service, true);
  res.json({ status: "armed", service: req.params.service });
});

// ============================================================================
// TWIN 1: WhatsApp Business Cloud API
// ============================================================================

app.post("/whatsapp/v21.0/:phoneNumberId/messages", (req, res) => {
  if (shouldFail("whatsapp")) {
    res.status(429).json({ error: { message: "Rate limit hit", type: "OAuthException", code: 80007 } });
    return;
  }
  const msg = req.body;
  const messageId = `wamid.${uuid().replace(/-/g, "")}`;
  state.whatsapp.messages.push({ ...msg, id: messageId, timestamp: new Date().toISOString() });
  res.json({
    messaging_product: "whatsapp",
    contacts: [{ input: msg.to, wa_id: msg.to?.replace("+", "") }],
    messages: [{ id: messageId }],
  });
});

app.post("/whatsapp/v21.0/:phoneNumberId/media", (req, res) => {
  const mediaId = uuid();
  state.whatsapp.media.set(mediaId, Buffer.isBuffer(req.body) ? req.body : Buffer.from("fake-media"));
  res.json({ id: mediaId });
});

app.get("/whatsapp/v21.0/:mediaId", (req, res) => {
  const mediaId = req.params.mediaId;
  if (state.whatsapp.media.has(mediaId)) {
    res.json({ url: `http://localhost:9999/whatsapp/media/${mediaId}`, mime_type: "image/jpeg" });
  } else {
    res.status(404).json({ error: "Media not found" });
  }
});

app.get("/whatsapp/media/:mediaId", (req, res) => {
  const data = state.whatsapp.media.get(req.params.mediaId);
  if (data) {
    res.set("Content-Type", "image/jpeg").send(data);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// ============================================================================
// TWIN 2: SMS (46elks)
// ============================================================================

app.post("/sms/a1/sms", (req, res) => {
  if (shouldFail("sms")) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }
  const smsId = `s${uuid().replace(/-/g, "").slice(0, 16)}`;
  const smsRecord = {
    id: smsId,
    from: req.body.from || "Resonansia",
    to: req.body.to,
    message: req.body.message,
    status: "created",
    created: new Date().toISOString(),
  };
  state.sms.messages.push(smsRecord);
  res.json(smsRecord);
});

// ============================================================================
// TWIN 3: Fortnox Accounting
// ============================================================================

app.post("/fortnox/3/invoices", (req, res) => {
  if (shouldFail("fortnox")) {
    res.status(500).json({ ErrorInformation: { message: "Internal error", code: 1000 } });
    return;
  }
  const authToken = req.headers["access-token"];
  if (!authToken) {
    res.status(401).json({ ErrorInformation: { message: "Unauthorized", code: 2000 } });
    return;
  }
  const invoice = req.body?.Invoice;
  if (!invoice) {
    res.status(400).json({ ErrorInformation: { message: "Missing Invoice body", code: 2001 } });
    return;
  }
  const docNum = state.fortnox.nextDocNum++;
  const rows = invoice.InvoiceRows || [];
  const total = rows.reduce((sum: number, r: any) => sum + (r.DeliveredQuantity || 0) * (r.Price || 0), 0);
  const vatAmount = rows.reduce((sum: number, r: any) => {
    const rowTotal = (r.DeliveredQuantity || 0) * (r.Price || 0);
    return sum + rowTotal * ((r.VAT || 0) / 100);
  }, 0);
  const stored = {
    DocumentNumber: docNum,
    InvoiceNumber: docNum,
    Total: total + vatAmount,
    TotalVAT: vatAmount,
    Balance: total + vatAmount,
    Booked: false,
    Cancelled: false,
    ...invoice,
  };
  state.fortnox.invoices.set(docNum, stored);
  res.status(201).json({ Invoice: stored });
});

app.get("/fortnox/3/invoices/:docNum", (req, res) => {
  const docNum = parseInt(req.params.docNum, 10);
  const invoice = state.fortnox.invoices.get(docNum);
  if (!invoice) {
    res.status(404).json({ ErrorInformation: { message: "Invoice not found", code: 2000404 } });
    return;
  }
  res.json({ Invoice: invoice });
});

app.get("/fortnox/3/customers", (_req, res) => {
  const customers = Array.from(state.fortnox.customers.values());
  res.json({ Customers: customers });
});

app.post("/fortnox/3/customers", (req, res) => {
  if (!req.body?.Customer?.Name) {
    res.status(400).json({ ErrorInformation: { message: "Name is required", code: 2001 } });
    return;
  }
  const custNum = state.fortnox.nextCustNum++;
  const customer = { CustomerNumber: String(custNum), ...req.body.Customer };
  state.fortnox.customers.set(custNum, customer);
  res.status(201).json({ Customer: customer });
});

// Simulate payment
app.post("/twin/simulate-payment", (req, res) => {
  const invoiceNum = parseInt(req.query.invoice as string, 10);
  const invoice = state.fortnox.invoices.get(invoiceNum);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  invoice.Balance = 0;
  invoice.Booked = true;
  invoice.FinalPayDate = new Date().toISOString().split("T")[0];
  res.json({ status: "paid", invoice: invoiceNum });
});

// ============================================================================
// TWIN 4: BankID
// ============================================================================

app.post("/bankid/rp/v6.0/auth", (req, res) => {
  if (shouldFail("bankid")) {
    res.status(500).json({ errorCode: "internalError", details: "Simulated failure" });
    return;
  }
  const { personalNumber } = req.body;
  if (!personalNumber || personalNumber.length !== 12) {
    res.status(400).json({ errorCode: "invalidParameters", details: "personalNumber must be 12 digits" });
    return;
  }
  const orderRef = uuid();
  const autoStartToken = uuid();
  state.bankid.sessions.set(orderRef, { status: "pending", personalNumber, pollCount: 0 });
  res.json({ orderRef, autoStartToken });
});

app.post("/bankid/rp/v6.0/collect", (req, res) => {
  const { orderRef } = req.body;
  const session = state.bankid.sessions.get(orderRef);
  if (!session) {
    res.status(400).json({ errorCode: "notFound", details: "No such order" });
    return;
  }
  session.pollCount++;
  if (session.status === "failed") {
    res.json({ orderRef, status: "failed", hintCode: "userCancel" });
    return;
  }
  if (session.pollCount < 2) {
    res.json({ orderRef, status: "pending", hintCode: "outstandingTransaction" });
    return;
  }
  session.status = "complete";
  res.json({
    orderRef,
    status: "complete",
    completionData: {
      user: {
        personalNumber: session.personalNumber,
        name: "Test User",
        givenName: "Test",
        surname: "User",
      },
      signature: "base64signature",
      ocspResponse: "base64ocsp",
    },
  });
});

app.post("/twin/simulate-bankid-fail", (req, res) => {
  const orderRef = req.query.orderRef as string;
  const session = state.bankid.sessions.get(orderRef);
  if (session) {
    session.status = "failed";
    res.json({ status: "will-fail", orderRef });
  } else {
    res.status(404).json({ error: "No such session" });
  }
});

// ============================================================================
// TWIN 5: Email (Resend)
// ============================================================================

app.post("/email/emails", (req, res) => {
  if (shouldFail("email")) {
    res.status(500).json({ message: "Internal server error" });
    return;
  }
  const { from, to, subject } = req.body;
  if (!from || !to || !subject) {
    res.status(422).json({ message: "Missing required fields: from, to, subject" });
    return;
  }
  const emailId = uuid();
  state.email.emails.push({ id: emailId, ...req.body, timestamp: new Date().toISOString() });
  res.json({ id: emailId });
});

app.post("/twin/simulate-email", (req, res) => {
  state.email.emails.push({ ...req.body, direction: "inbound", timestamp: new Date().toISOString() });
  res.json({ status: "simulated" });
});

app.post("/twin/simulate-bounce", (req, res) => {
  const emailId = req.query.id as string;
  const email = state.email.emails.find((e) => e.id === emailId);
  if (email) {
    email.bounced = true;
    res.json({ status: "bounced", id: emailId });
  } else {
    res.status(404).json({ error: "Email not found" });
  }
});

// ============================================================================
// TWIN 6: Skatteverket ROT/RUT
// ============================================================================

app.post("/skatteverket/rot-rut/ansokan", (req, res) => {
  if (shouldFail("skatteverket")) {
    res.status(500).json({ status: "fel", meddelande: "Tjänsten är tillfälligt otillgänglig" });
    return;
  }
  const { mottagare_personnr, avdrag_typ, avdrag_belopp } = req.body;
  const key = `${mottagare_personnr}-${req.body.ar}`;
  const acc = state.skatteverket.accumulated.get(key) || { rot: 0, rut: 0 };

  const isRot = avdrag_typ === "ROT";
  const currentTotal = acc.rot + acc.rut;
  const newTotal = currentTotal + avdrag_belopp;

  // Check limits
  if (newTotal > 7500000) { // 75,000 SEK in öre
    res.status(400).json({
      status: "avvisad",
      felkod: "MAX_OVERSKRIDEN",
      meddelande: `Personen har redan utnyttjat ${(currentTotal / 100).toFixed(0)} kr i ROT/RUT-avdrag ${req.body.ar}.`,
    });
    return;
  }
  if (isRot && acc.rot + avdrag_belopp > 5000000) { // 50,000 SEK ROT max in öre
    res.status(400).json({
      status: "avvisad",
      felkod: "MAX_OVERSKRIDEN",
      meddelande: `Personen har redan utnyttjat ${(acc.rot / 100).toFixed(0)} kr i ROT-avdrag ${req.body.ar}.`,
    });
    return;
  }

  if (isRot) acc.rot += avdrag_belopp;
  else acc.rut += avdrag_belopp;
  state.skatteverket.accumulated.set(key, acc);

  const diarienummer = `SKV-${req.body.ar}-${avdrag_typ}-${String(state.skatteverket.claims.length + 1).padStart(5, "0")}`;
  const claim = { ...req.body, diarienummer, status: "mottagen" };
  state.skatteverket.claims.push(claim);

  const remaining = (isRot ? 5000000 - acc.rot : 7500000 - acc.rot - acc.rut);
  res.json({
    status: "mottagen",
    diarienummer,
    kvarvarande_utrymme: remaining,
  });
});

// ============================================================================
// TWIN 7: Object Storage (Supabase Storage)
// ============================================================================

app.post("/storage/storage/v1/object/:bucket/{*rest}", (req, res) => {
  if (shouldFail("storage")) {
    res.status(500).json({ error: "Storage unavailable" });
    return;
  }
  const bucket = req.params.bucket;
  const path = (req.params as any).rest || "";
  const key = `${bucket}/${path}`;
  const data = Buffer.isBuffer(req.body) ? req.body : Buffer.from("fake-file");

  if (data.length > 10 * 1024 * 1024) {
    res.status(413).json({ error: "File too large. Max 10 MB." });
    return;
  }

  state.storage.files.set(key, { data, metadata: { contentType: req.headers["content-type"] } });
  res.json({ Key: key });
});

app.post("/storage/storage/v1/object/sign/:bucket/{*rest}", (req, res) => {
  const bucket = req.params.bucket;
  const path = (req.params as any).rest || "";
  const key = `${bucket}/${path}`;
  const expiresIn = req.body?.expiresIn || 3600;
  res.json({
    signedURL: `http://localhost:9999/storage/signed/${key}?token=${uuid()}&expires=${expiresIn}`,
  });
});

app.get("/storage/signed/:bucket/{*rest}", (req, res) => {
  const bucket = req.params.bucket;
  const path = (req.params as any).rest || "";
  const key = `${bucket}/${path}`;
  const file = state.storage.files.get(key);
  if (file) {
    res.set("Content-Type", file.metadata.contentType || "application/octet-stream").send(file.data);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.TWIN_PORT || 9999;

app.listen(PORT, () => {
  console.log(`Twin server running on port ${PORT}`);
});

export default app;
