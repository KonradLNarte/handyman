import type { AccountingAdapter, InvoiceData, InvoiceStatus, CustomerData } from "../types";

export class FortnoxAdapter implements AccountingAdapter {
  private baseUrl: string;
  private accessToken: string;

  constructor(config: { baseUrl: string; accessToken: string }) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
  }

  async createInvoice(invoice: InvoiceData): Promise<{ id: string; number: number }> {
    const res = await fetch(`${this.baseUrl}/3/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": this.accessToken,
      },
      body: JSON.stringify({
        Invoice: {
          CustomerNumber: invoice.customerNumber,
          InvoiceDate: invoice.invoiceDate,
          DueDate: invoice.dueDate,
          Currency: invoice.currency || "SEK",
          YourReference: invoice.yourReference,
          OurReference: invoice.ourReference,
          InvoiceRows: invoice.rows.map((r) => ({
            ArticleNumber: r.articleNumber,
            Description: r.description,
            DeliveredQuantity: r.quantity,
            Price: r.price,
            VAT: r.vatPercent,
          })),
        },
      }),
    });
    const data = await res.json() as any;
    return {
      id: String(data.Invoice?.DocumentNumber),
      number: data.Invoice?.DocumentNumber,
    };
  }

  async getInvoice(id: string): Promise<InvoiceStatus> {
    const res = await fetch(`${this.baseUrl}/3/invoices/${id}`, {
      headers: { "Access-Token": this.accessToken },
    });
    const data = await res.json() as any;
    return {
      documentNumber: data.Invoice?.DocumentNumber,
      balance: data.Invoice?.Balance,
      booked: data.Invoice?.Booked,
      cancelled: data.Invoice?.Cancelled,
      finalPayDate: data.Invoice?.FinalPayDate,
    };
  }

  async createCustomer(customer: CustomerData): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/3/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": this.accessToken,
      },
      body: JSON.stringify({
        Customer: {
          Name: customer.name,
          Address1: customer.address,
          ZipCode: customer.zipCode,
          City: customer.city,
          Email: customer.email,
          Phone1: customer.phone,
          OrganisationNumber: customer.orgNumber,
        },
      }),
    });
    const data = await res.json() as any;
    return { id: data.Customer?.CustomerNumber };
  }
}
