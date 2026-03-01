export interface MessagingAdapter {
  sendMessage(to: string, text: string): Promise<{ id: string }>;
  sendTemplate(to: string, template: string, params: Record<string, string>): Promise<{ id: string }>;
}

export interface AccountingAdapter {
  createInvoice(invoice: InvoiceData): Promise<{ id: string; number: number }>;
  getInvoice(id: string): Promise<InvoiceStatus>;
  createCustomer(customer: CustomerData): Promise<{ id: string }>;
}

export interface SigningAdapter {
  initiateAuth(personalNumber: string, userIp: string, data?: string): Promise<{ orderRef: string }>;
  collect(orderRef: string): Promise<SigningResult>;
}

export interface EmailAdapter {
  sendEmail(params: EmailParams): Promise<{ id: string }>;
}

export interface TaxAdapter {
  submitRotRut(claim: RotRutClaim): Promise<RotRutResult>;
}

export interface StorageAdapter {
  upload(bucket: string, path: string, data: Buffer, contentType: string): Promise<{ key: string }>;
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<{ signedURL: string }>;
}

// Supporting types

export interface InvoiceData {
  customerNumber: string;
  invoiceDate: string;
  dueDate: string;
  rows: InvoiceRow[];
  yourReference?: string;
  ourReference?: string;
  currency?: string;
}

export interface InvoiceRow {
  articleNumber?: string;
  description: string;
  quantity: number;
  price: number;
  vatPercent: number;
}

export interface InvoiceStatus {
  documentNumber: number;
  balance: number;
  booked: boolean;
  cancelled: boolean;
  finalPayDate?: string;
}

export interface CustomerData {
  name: string;
  address?: string;
  zipCode?: string;
  city?: string;
  email?: string;
  phone?: string;
  orgNumber?: string;
}

export interface SigningResult {
  status: "pending" | "complete" | "failed";
  hintCode?: string;
  completionData?: {
    personalNumber: string;
    name: string;
    signature: string;
  };
}

export interface EmailParams {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}

export interface RotRutClaim {
  orgNumber: string;
  personalNumber: string;
  invoiceNumber: string;
  laborAmount: number; // öre
  deductionType: "ROT" | "RUT";
  deductionAmount: number; // öre
  year: number;
}

export interface RotRutResult {
  status: "mottagen" | "avvisad";
  caseNumber?: string;
  remainingSpace?: number;
  errorCode?: string;
  message?: string;
}
