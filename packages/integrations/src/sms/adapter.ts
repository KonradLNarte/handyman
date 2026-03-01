import type { MessagingAdapter } from "../types.js";

export class SmsAdapter implements MessagingAdapter {
  private baseUrl: string;
  private apiUser: string;
  private apiPassword: string;

  constructor(config: { baseUrl: string; apiUser: string; apiPassword: string }) {
    this.baseUrl = config.baseUrl;
    this.apiUser = config.apiUser;
    this.apiPassword = config.apiPassword;
  }

  async sendMessage(to: string, text: string): Promise<{ id: string }> {
    const body = new URLSearchParams({ from: "Resonansia", to, message: text });
    const res = await fetch(`${this.baseUrl}/a1/sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + btoa(`${this.apiUser}:${this.apiPassword}`),
      },
      body: body.toString(),
    });
    const data = await res.json() as any;
    return { id: data.id };
  }

  async sendTemplate(to: string, template: string, params: Record<string, string>): Promise<{ id: string }> {
    // SMS doesn't support templates natively — interpolate and send as plain text
    let text = template;
    for (const [key, value] of Object.entries(params)) {
      text = text.replace(`{{${key}}}`, value);
    }
    return this.sendMessage(to, text);
  }
}
