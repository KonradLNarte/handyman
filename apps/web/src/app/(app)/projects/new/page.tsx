import { createProjectAction } from "@/app/actions/nodes";

export default function NewProjectPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Nytt projekt</h1>
      <form action={createProjectAction} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Projektnamn *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Beskrivning
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="street"
              className="block text-sm font-medium text-gray-700"
            >
              Gatuadress
            </label>
            <input
              id="street"
              name="street"
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="city"
              className="block text-sm font-medium text-gray-700"
            >
              Stad
            </label>
            <input
              id="city"
              name="city"
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="postal_code"
            className="block text-sm font-medium text-gray-700"
          >
            Postnummer
          </label>
          <input
            id="postal_code"
            name="postal_code"
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="rot_applicable" className="rounded" />
            <span className="text-sm text-gray-700">ROT-avdrag</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="rut_applicable" className="rounded" />
            <span className="text-sm text-gray-700">RUT-avdrag</span>
          </label>
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Skapa projekt
        </button>
      </form>
    </div>
  );
}
