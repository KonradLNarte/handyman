"use client";

import { useState } from "react";
import { correctEventAction } from "@/app/actions/events";

export function CorrectionForm({
  eventId,
  projectId,
  currentQty,
  currentUnitPrice,
}: {
  eventId: string;
  projectId: string;
  currentQty: number;
  currentUnitPrice: number;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-500 hover:underline mt-1"
      >
        Korrigera
      </button>
    );
  }

  async function handleSubmit(formData: FormData) {
    formData.set("eventId", eventId);
    formData.set("projectId", projectId);
    await correctEventAction(formData);
    setOpen(false);
  }

  return (
    <form action={handleSubmit} className="mt-2 space-y-2 text-left">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">Antal</label>
          <input
            name="qty"
            type="number"
            step="0.5"
            defaultValue={currentQty}
            className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">á-pris</label>
          <input
            name="unitPrice"
            type="number"
            step="0.01"
            defaultValue={currentUnitPrice}
            className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Orsak *</label>
        <input
          name="reason"
          type="text"
          required
          className="block w-full rounded border border-gray-300 px-2 py-1 text-xs"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
        >
          Korrigera
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
