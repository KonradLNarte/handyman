import type { EmailAdapter, EmailParams } from "../types.js";

export class ResendEmailAdapter implements EmailAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: { baseUrl: string; apiKey: string }) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  async sendEmail(params: EmailParams): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        attachments: params.attachments,
      }),
    });
    const data = await res.json() as any;
    return { id: data.id };
  }
}
