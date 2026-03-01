import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuotePdf, type QuotePdfProps } from "./quote";
import { InvoicePdf, type InvoicePdfProps } from "./invoice";

export type { QuotePdfProps } from "./quote";
export type { InvoicePdfProps } from "./invoice";

/**
 * Generates a quote PDF as a Buffer.
 *
 * INVARIANT pdf_numbers_match_economics:
 * Every number on the PDF matches the output of calculateProjectEconomics
 * and calculateRotRut. The PDF renderer NEVER computes its own totals —
 * it receives pre-computed values.
 */
export async function generateQuotePdf(data: QuotePdfProps): Promise<Buffer> {
  const element = React.createElement(QuotePdf, data);
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}

/**
 * Generates an invoice PDF as a Buffer.
 */
export async function generateInvoicePdf(data: InvoicePdfProps): Promise<Buffer> {
  const element = React.createElement(InvoicePdf, data);
  const buffer = await renderToBuffer(element as any);
  return Buffer.from(buffer);
}
