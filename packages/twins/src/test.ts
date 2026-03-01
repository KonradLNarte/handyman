/**
 * Basic integration test for all 7 digital twins.
 * Run with: pnpm --filter @resonansia/twins test
 *
 * Starts the server, runs tests, exits.
 */

const BASE = "http://localhost:9999";

async function postJson(path: string, body: any, headers?: Record<string, string>) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, data: await res.json() };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`PASS: ${message}`);
}

async function runTests() {
  // Wait for server to be ready
  let retries = 10;
  while (retries > 0) {
    try {
      await get("/twin/inspect/whatsapp");
      break;
    } catch {
      retries--;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  if (retries === 0) {
    console.error("FAIL: Server did not start in time");
    process.exit(1);
  }

  // Reset state
  const reset = await postJson("/twin/reset", {});
  assert(reset.status === 200, "POST /twin/reset returns 200");

  // 1. WhatsApp
  const wa = await postJson("/whatsapp/v21.0/123456/messages", {
    messaging_product: "whatsapp",
    to: "+46701234567",
    type: "text",
    text: { body: "Test message" },
  });
  assert(wa.status === 200, "WhatsApp: send message returns 200");
  assert(wa.data.messages?.[0]?.id?.startsWith("wamid."), "WhatsApp: message ID starts with wamid.");

  // 2. SMS
  const sms = await postJson("/sms/a1/sms", {
    from: "Resonansia",
    to: "+46701234567",
    message: "Test SMS",
  });
  assert(sms.status === 200, "SMS: send returns 200");
  assert(sms.data.status === "created", "SMS: status is created");

  // 3. Fortnox
  const invoice = await postJson(
    "/fortnox/3/invoices",
    {
      Invoice: {
        CustomerNumber: "10042",
        InvoiceDate: "2026-03-28",
        DueDate: "2026-04-27",
        InvoiceRows: [
          { ArticleNumber: "LABOR-1", Description: "Test", DeliveredQuantity: 8, Price: 650, VAT: 25 },
        ],
      },
    },
    { "Access-Token": "test-token" }
  );
  assert(invoice.status === 201, "Fortnox: create invoice returns 201");
  assert(typeof invoice.data.Invoice?.DocumentNumber === "number", "Fortnox: returns DocumentNumber");

  // 4. BankID
  const bankid = await postJson("/bankid/rp/v6.0/auth", {
    endUserIp: "192.168.1.1",
    personalNumber: "199001011234",
    userVisibleData: "dGVzdA==",
  });
  assert(bankid.status === 200, "BankID: auth returns 200");
  assert(typeof bankid.data.orderRef === "string", "BankID: returns orderRef");

  const collect1 = await postJson("/bankid/rp/v6.0/collect", { orderRef: bankid.data.orderRef });
  assert(collect1.data.status === "pending", "BankID: first collect returns pending");

  const collect2 = await postJson("/bankid/rp/v6.0/collect", { orderRef: bankid.data.orderRef });
  assert(collect2.data.status === "complete", "BankID: second collect returns complete");

  // 5. Email
  const email = await postJson("/email/emails", {
    from: "test@resonansia.se",
    to: ["recipient@example.com"],
    subject: "Test email",
    html: "<p>Hello</p>",
  });
  assert(email.status === 200, "Email: send returns 200");
  assert(typeof email.data.id === "string", "Email: returns id");

  // 6. Skatteverket
  const skv = await postJson("/skatteverket/rot-rut/ansokan", {
    utforare_orgnr: "5561234567",
    mottagare_personnr: "199001011234",
    fakturanummer: "10042",
    belopp_arbete: 33800,
    avdrag_typ: "ROT",
    avdrag_belopp: 10140,
    ar: 2026,
  });
  assert(skv.status === 200, "Skatteverket: submit returns 200");
  assert(skv.data.status === "mottagen", "Skatteverket: status is mottagen");
  assert(typeof skv.data.diarienummer === "string", "Skatteverket: returns diarienummer");

  // 7. Storage
  const upload = await postJson("/storage/storage/v1/object/photos/test.jpg", { data: "test" });
  assert(upload.status === 200, "Storage: upload returns 200");
  assert(typeof upload.data.Key === "string", "Storage: returns Key");

  // Inspect
  const inspect = await get("/twin/inspect/whatsapp");
  assert(inspect.status === 200, "Inspect: whatsapp returns 200");
  assert(inspect.data.messages?.length >= 1, "Inspect: has stored messages");

  // Final reset
  const finalReset = await postJson("/twin/reset", {});
  assert(finalReset.status === 200, "Final reset: returns 200");

  const afterReset = await get("/twin/inspect/whatsapp");
  assert(afterReset.data.messages?.length === 0, "After reset: whatsapp messages cleared");

  console.log("\nAll twin tests passed!");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
