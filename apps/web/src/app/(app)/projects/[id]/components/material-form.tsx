"use client";

import { useRef } from "react";
import { registerMaterialAction } from "@/app/actions/events";

export function MaterialForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("projectId", projectId);
    await registerMaterialAction(formData);
    formRef.current?.reset();
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="mat-date" className="block text-sm font-medium text-gray-700">
          Datum
        </label>
        <input
          id="mat-date"
          name="date"
          type="date"
          defaultValue={today}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="mat-desc" className="block text-sm font-medium text-gray-700">
          Beskrivning
        </label>
        <input
          id="mat-desc"
          name="description"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="mat-qty" className="block text-sm font-medium text-gray-700">
            Antal
          </label>
          <input
            id="mat-qty"
            name="qty"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="mat-unit" className="block text-sm font-medium text-gray-700">
            Enhet
          </label>
          <select
            id="mat-unit"
            name="unit"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          >
            <option value="piece">st</option>
            <option value="liter">liter</option>
            <option value="kg">kg</option>
            <option value="sqm">m²</option>
            <option value="lm">lm</option>
          </select>
        </div>
        <div>
          <label htmlFor="mat-price" className="block text-sm font-medium text-gray-700">
            á-pris (kr)
          </label>
          <input
            id="mat-price"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700"
      >
        Registrera material
      </button>
    </form>
  );
}
