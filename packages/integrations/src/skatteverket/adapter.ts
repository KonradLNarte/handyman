import type { TaxAdapter, RotRutClaim, RotRutResult } from "../types.js";

export class SkatteverketAdapter implements TaxAdapter {
  private baseUrl: string;

  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl;
  }

  async submitRotRut(claim: RotRutClaim): Promise<RotRutResult> {
    const res = await fetch(`${this.baseUrl}/rot-rut/ansokan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utforare_orgnr: claim.orgNumber,
        mottagare_personnr: claim.personalNumber,
        fakturanummer: claim.invoiceNumber,
        belopp_arbete: claim.laborAmount,
        avdrag_typ: claim.deductionType,
        avdrag_belopp: claim.deductionAmount,
        ar: claim.year,
      }),
    });
    const data = await res.json() as any;
    if (data.status === "avvisad") {
      return {
        status: "avvisad",
        errorCode: data.felkod,
        message: data.meddelande,
      };
    }
    return {
      status: "mottagen",
      caseNumber: data.diarienummer,
      remainingSpace: data.kvarvarande_utrymme,
    };
  }
}
