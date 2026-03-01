"use client";

import { useRef } from "react";
import { registerTimeAction } from "@/app/actions/events";

export function TimeForm({ projectId }: { projectId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    formData.set("projectId", projectId);
    await registerTimeAction(formData);
    formRef.current?.reset();
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="time-date" className="block text-sm font-medium text-gray-700">
          Datum
        </label>
        <input
          id="time-date"
          name="date"
          type="date"
          defaultValue={today}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="time-hours" className="block text-sm font-medium text-gray-700">
            Timmar
          </label>
          <input
            id="time-hours"
            name="hours"
            type="number"
            step="0.5"
            min="0.5"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
        <div>
          <label htmlFor="time-rate" className="block text-sm font-medium text-gray-700">
            Timpris (kr)
          </label>
          <input
            id="time-rate"
            name="hourlyRate"
            type="number"
            min="1"
            defaultValue="650"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="time-note" className="block text-sm font-medium text-gray-700">
          Anteckning
        </label>
        <input
          id="time-note"
          name="note"
          type="text"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
      >
        Registrera tid
      </button>
    </form>
  );
}
