"use client";

import { useState } from "react";
import { sendQuoteAction } from "@/app/actions/quotes";

interface QuoteActionsProps {
  projectId: string;
}

export function QuoteActions({ projectId }: QuoteActionsProps) {
  const [sending, setSending] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [channel, setChannel] = useState<"sms" | "email" | "whatsapp">("sms");
  const [recipient, setRecipient] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const sendResult = await sendQuoteAction(
        projectId,
        channel,
        channel !== "email" ? recipient : undefined,
        channel === "email" ? recipient : undefined
      );
      if (sendResult.success) {
        setResult("Offerten skickad!");
        setShowChannelPicker(false);
      } else {
        setResult(`Fel: ${sendResult.error}`);
      }
    } catch (err) {
      setResult(`Fel: ${err instanceof Error ? err.message : "Okänt fel"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 pt-4 border-t space-y-3">
      <div className="flex gap-3">
        <a
          href={`/api/pdf/quote/${projectId}?download=true`}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Ladda ner PDF
        </a>
        <button
          onClick={() => setShowChannelPicker(!showChannelPicker)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Skicka till kund
        </button>
      </div>

      {showChannelPicker && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            {(["sms", "email", "whatsapp"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  channel === ch
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {ch === "sms" ? "SMS" : ch === "email" ? "E-post" : "WhatsApp"}
              </button>
            ))}
          </div>
          <input
            type={channel === "email" ? "email" : "tel"}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={channel === "email" ? "kund@example.com" : "+46701234567"}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={sending || !recipient}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sending ? "Skickar..." : "Skicka"}
          </button>
        </div>
      )}

      {result && (
        <p className={`text-sm ${result.startsWith("Fel") ? "text-red-600" : "text-green-600"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
