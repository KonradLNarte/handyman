import type { SigningAdapter, SigningResult } from "../types";

export class BankIdAdapter implements SigningAdapter {
  private baseUrl: string;

  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl;
  }

  async initiateAuth(personalNumber: string, userIp: string, data?: string): Promise<{ orderRef: string }> {
    const body: any = {
      endUserIp: userIp,
      personalNumber,
    };
    if (data) {
      body.userVisibleData = btoa(data);
      body.userVisibleDataFormat = "simpleMarkdownV1";
    }
    const res = await fetch(`${this.baseUrl}/rp/v6.0/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await res.json() as any;
    return { orderRef: result.orderRef };
  }

  async collect(orderRef: string): Promise<SigningResult> {
    const res = await fetch(`${this.baseUrl}/rp/v6.0/collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderRef }),
    });
    const data = await res.json() as any;
    if (data.status === "complete") {
      return {
        status: "complete",
        completionData: {
          personalNumber: data.completionData.user.personalNumber,
          name: data.completionData.user.name,
          signature: data.completionData.signature,
        },
      };
    }
    return {
      status: data.status as "pending" | "failed",
      hintCode: data.hintCode,
    };
  }
}
