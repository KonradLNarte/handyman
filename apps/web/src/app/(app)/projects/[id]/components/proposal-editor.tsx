"use client";

import { useState, useCallback } from "react";
import type { TransientProposal, ProposalLine } from "@resonansia/shared";
import { calculateRotRut, type RotRutLineInput, type RotRutType } from "@resonansia/core";
import { computeTotal } from "@resonansia/db";
import { generateId } from "@resonansia/shared";

interface ProposalEditorProps {
  proposal: TransientProposal;
  rotRutType: RotRutType;
  personNumber?: string;
  onApprove: (proposalId: string) => Promise<void>;
  onReject: (proposalId: string) => Promise<void>;
  type: "quote" | "invoice";
}

const UNIT_NAMES: Record<number, string> = {
  1: "tim", 2: "min", 3: "m²", 4: "lm", 5: "st", 6: "kg", 7: "l",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("sv-SE").format(Math.round(amount));
}

export function ProposalEditor({
  proposal: initialProposal,
  rotRutType,
  personNumber,
  onApprove,
  onReject,
  type,
}: ProposalEditorProps) {
  const [lines, setLines] = useState<ProposalLine[]>(initialProposal.lines);
  const [loading, setLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // Recompute all totals and ROT/RUT
  const recompute = useCallback(
    (updatedLines: ProposalLine[]) => {
      const recomputed = updatedLines.map((line) => ({
        ...line,
        total: computeTotal(line.qty, line.unitPrice) ?? 0,
      }));
      setLines(recomputed);
    },
    []
  );

  const updateLine = (index: number, field: keyof ProposalLine, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    recompute(updated);
  };

  const removeLine = (index: number) => {
    const updated = lines.filter((_, i) => i !== index);
    recompute(updated);
  };

  const addLine = () => {
    const newLine: ProposalLine = {
      tempId: generateId(),
      description: "",
      qty: 1,
      unitId: 5,
      unitPrice: 0,
      total: 0,
      isLabor: false,
      vatRate: 0.25,
      sortOrder: lines.length,
    };
    recompute([...lines, newLine]);
  };

  // Compute summaries
  const laborTotal = lines.filter((l) => l.isLabor).reduce((s, l) => s + l.total, 0);
  const materialTotal = lines.filter((l) => !l.isLabor).reduce((s, l) => s + l.total, 0);
  const subtotal = laborTotal + materialTotal;

  // Real-time ROT/RUT calculation
  let rotRut = null;
  if (rotRutType !== "none" && personNumber) {
    const rotRutLines: RotRutLineInput[] = lines.map((l) => ({
      total: l.total,
      isLabor: l.isLabor,
      rotRutType,
    }));
    rotRut = calculateRotRut(rotRutLines, 0, personNumber);
  }

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(initialProposal.id);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(initialProposal.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Reasoning Panel */}
      {initialProposal.reasoning && (
        <div>
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
          >
            {showReasoning ? "Dölj" : "Visa"} AI-resonemang
          </button>
          {showReasoning && (
            <div className="mt-2 bg-violet-50 border border-violet-200 rounded-lg p-4 text-sm text-violet-800">
              {initialProposal.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Deviation Banners (invoice only) */}
      {type === "invoice" && initialProposal.deviations?.map((dev, i) => (
        <div
          key={i}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3"
        >
          <span className="text-amber-600 text-lg">&#9888;</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{dev.message}</p>
            <p className="text-xs text-amber-600 mt-1">
              Offert: {formatCurrency(dev.quotedValue)} kr | Faktiskt: {formatCurrency(dev.actualValue)} kr
            </p>
          </div>
        </div>
      ))}

      {/* Line Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-[35%]">Beskrivning</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 w-[10%]">Antal</th>
              <th className="text-center px-2 py-2 font-medium text-gray-500 w-[8%]">Enhet</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 w-[15%]">À-pris</th>
              <th className="text-right px-3 py-2 font-medium text-gray-500 w-[15%]">Belopp</th>
              <th className="text-center px-2 py-2 font-medium text-gray-500 w-[7%]">Arbete</th>
              <th className="w-[10%]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {lines.map((line, i) => (
              <tr
                key={line.tempId}
                className={line.isLabor ? "bg-violet-50/50" : ""}
              >
                <td className="px-3 py-1">
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(i, "description", e.target.value)}
                    className="w-full border-0 bg-transparent focus:ring-1 focus:ring-blue-500 rounded px-1 py-1 text-sm"
                  />
                </td>
                <td className="px-3 py-1">
                  <input
                    type="number"
                    value={line.qty}
                    onChange={(e) => updateLine(i, "qty", parseFloat(e.target.value) || 0)}
                    className="w-full border-0 bg-transparent text-right focus:ring-1 focus:ring-blue-500 rounded px-1 py-1 text-sm"
                    step="0.1"
                  />
                </td>
                <td className="text-center px-2 py-1 text-xs text-gray-500">
                  {UNIT_NAMES[line.unitId] || "st"}
                </td>
                <td className="px-3 py-1">
                  <input
                    type="number"
                    value={line.unitPrice}
                    onChange={(e) => updateLine(i, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-full border-0 bg-transparent text-right focus:ring-1 focus:ring-blue-500 rounded px-1 py-1 text-sm"
                    step="1"
                  />
                </td>
                <td className="text-right px-3 py-1 font-medium">
                  {formatCurrency(line.total)}
                </td>
                <td className="text-center px-2 py-1">
                  <input
                    type="checkbox"
                    checked={line.isLabor}
                    onChange={(e) => updateLine(i, "isLabor", e.target.checked)}
                    className="rounded text-violet-600"
                  />
                </td>
                <td className="text-center px-2 py-1">
                  <button
                    onClick={() => removeLine(i)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Ta bort
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addLine}
        className="text-sm text-blue-600 hover:text-blue-700"
      >
        + Lägg till rad
      </button>

      {/* Totals */}
      <div className="space-y-1 text-sm border-t pt-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Arbetskostnad:</span>
          <span>{formatCurrency(laborTotal)} kr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Materialkostnad:</span>
          <span>{formatCurrency(materialTotal)} kr</span>
        </div>
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>Summa:</span>
          <span>{formatCurrency(subtotal)} kr</span>
        </div>
      </div>

      {/* ROT/RUT Breakdown (real-time) */}
      {rotRut && rotRut.deductionAmount > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <h3 className="font-semibold text-emerald-800 mb-2">
            {rotRut.deductionType === "rot" ? "ROT-avdrag" : "RUT-avdrag"}
          </h3>
          <div className="space-y-1 text-sm text-emerald-700">
            <div className="flex justify-between">
              <span>Arbetskostnad:</span>
              <span>{formatCurrency(rotRut.laborTotal)} kr</span>
            </div>
            <div className="flex justify-between">
              <span>{rotRut.deductionType === "rot" ? "ROT" : "RUT"}-avdrag ({Math.round(rotRut.deductionRate * 100)}%):</span>
              <span>-{formatCurrency(rotRut.deductionAmount)} kr</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-900 pt-2 border-t border-emerald-200">
              <span>Att betala:</span>
              <span>{formatCurrency(rotRut.customerPays)} kr</span>
            </div>
            {rotRut.cappedByYearlyMax && (
              <p className="text-xs text-amber-600 mt-2">
                &#9888; Avdraget har begränsats av det årliga maxbeloppet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleApprove}
          disabled={loading || lines.length === 0}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Godkänner..." : "Godkänn"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading}
          className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          Avvisa
        </button>
      </div>
    </div>
  );
}
