"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface BankIdSigningProps {
  token: string;
  projectId: string;
  tenantId: string;
  personNumber?: string | null;
}

type SigningState = "idle" | "initiating" | "pending" | "complete" | "failed";

export function BankIdSigning({ token, projectId, tenantId, personNumber }: BankIdSigningProps) {
  const [state, setState] = useState<SigningState>("idle");
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startSigning = useCallback(async () => {
    setState("initiating");
    setError(null);

    try {
      const res = await fetch("/api/signing/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, projectId, tenantId, personNumber }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Kunde inte starta BankID-signering");
      }

      const data = await res.json();
      setOrderRef(data.orderRef);
      setState("pending");
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Okänt fel");
    }
  }, [token, projectId, tenantId, personNumber]);

  // Poll for signing status
  useEffect(() => {
    if (state !== "pending" || !orderRef) return;

    const poll = async () => {
      try {
        const res = await fetch("/api/signing/poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderRef, token, projectId, tenantId }),
        });

        if (!res.ok) {
          setState("failed");
          setError("Polling misslyckades");
          return;
        }

        const data = await res.json();

        if (data.status === "complete") {
          setState("complete");
        } else if (data.status === "failed") {
          setState("failed");
          setError("BankID-signering misslyckades");
        }
        // 'pending' — continue polling
      } catch {
        setState("failed");
        setError("Nätverksfel vid polling");
      }
    };

    pollRef.current = setInterval(poll, 2000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [state, orderRef, token, projectId, tenantId]);

  if (state === "complete") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-green-600 text-4xl mb-3">&#10003;</div>
        <p className="text-green-800 font-semibold text-lg">Signering genomförd!</p>
        <p className="text-green-600 text-sm mt-1">
          Offerten är nu godkänd. Arbetet kan påbörjas.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Godkänn offerten
      </h3>

      {state === "idle" && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Signera offerten med BankID för att godkänna.
          </p>
          <button
            onClick={startSigning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Signera med BankID
          </button>
          {!personNumber && (
            <button
              onClick={startSigning}
              className="block mx-auto mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Godkänn utan BankID
            </button>
          )}
        </>
      )}

      {state === "initiating" && (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mb-3" />
          <p className="text-sm text-gray-600">Startar BankID...</p>
        </div>
      )}

      {state === "pending" && (
        <div className="flex flex-col items-center">
          <div className="animate-pulse bg-blue-100 rounded-lg p-8 mb-4">
            <p className="text-blue-800 font-medium">Öppna BankID-appen</p>
          </div>
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2" />
          <p className="text-sm text-gray-500">Väntar på signering...</p>
        </div>
      )}

      {state === "failed" && (
        <div>
          <p className="text-red-600 mb-3">{error || "Signering misslyckades"}</p>
          <button
            onClick={() => {
              setState("idle");
              setError(null);
              setOrderRef(null);
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Försök igen
          </button>
        </div>
      )}
    </div>
  );
}
