import type { MessagingAdapter } from "../types";

export class WhatsAppAdapter implements MessagingAdapter {
  private baseUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  constructor(config: { baseUrl: string; phoneNumberId: string; accessToken: string }) {
    this.baseUrl = config.baseUrl;
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
  }

  async sendMessage(to: string, text: string): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    });
    const data = await res.json() as any;
    return { id: data.messages?.[0]?.id };
  }

  async sendTemplate(to: string, template: string, params: Record<string, string>): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: template, language: { code: "sv" }, components: [{ type: "body", parameters: Object.entries(params).map(([, v]) => ({ type: "text", text: v })) }] },
      }),
    });
    const data = await res.json() as any;
    return { id: data.messages?.[0]?.id };
  }
}
