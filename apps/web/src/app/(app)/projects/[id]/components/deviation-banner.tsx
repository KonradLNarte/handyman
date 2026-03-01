"use client";

import type { Deviation } from "@resonansia/shared";

interface DeviationBannerProps {
  deviations: Deviation[];
  onAdjust?: (field: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("sv-SE").format(Math.round(amount));
}

export function DeviationBanner({ deviations, onAdjust }: DeviationBannerProps) {
  if (deviations.length === 0) return null;

  return (
    <div className="space-y-3">
      {deviations.map((dev, i) => (
        <div
          key={i}
          className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3"
        >
          <span className="text-amber-500 text-xl leading-none">&#9888;</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{dev.message}</p>
            <div className="flex gap-4 mt-2 text-xs text-amber-600">
              <span>Offert: {formatCurrency(dev.quotedValue)} kr</span>
              <span>Faktiskt: {formatCurrency(dev.actualValue)} kr</span>
              <span className={dev.percentageDiff > 0 ? "text-red-600" : "text-green-600"}>
                {dev.percentageDiff > 0 ? "+" : ""}{dev.percentageDiff}%
              </span>
            </div>
          </div>
          {onAdjust && (
            <button
              onClick={() => onAdjust(dev.field)}
              className="text-sm text-amber-700 hover:text-amber-900 font-medium px-3 py-1 rounded border border-amber-300 hover:bg-amber-100 transition-colors"
            >
              Justera
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
