"use client";

import { useState, useEffect } from "react";
import {
  ExtractedRecord,
  FieldMeta,
} from "@/lib/types";
import { AlertCircle, Quote } from "lucide-react";

interface FieldEditorProps {
  recordId: string;
  recordData: Partial<ExtractedRecord>;
  fieldMeta: Record<string, FieldMeta>;
  editedFields: string[];
  originalValues: Record<string, unknown>;
  onPatchField: (field: string, value: unknown) => Promise<boolean>;
  fieldErrors: Record<string, string>;
  isSaving: boolean;
}

export function FieldEditor({
  recordId,
  recordData,
  fieldMeta,
  editedFields,
  originalValues,
  onPatchField,
  fieldErrors,
  isSaving,
}: FieldEditorProps) {
  // Local state for field values to allow immediate typing and retain invalid values
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    setValues((prev) => {
      const incoming: Record<string, unknown> = {
        company: recordData.company ?? "",
        product: recordData.product ?? "",
        category: recordData.category ?? "",
        severity: recordData.severity ?? "",
        requested_action: recordData.requested_action ?? "",
        refund_amount:
          recordData.refund_amount !== null && recordData.refund_amount !== undefined
            ? recordData.refund_amount
            : "",
        deadline: recordData.deadline ?? "",
        escalated: recordData.escalated ?? false,
      };

      // Only reset a field if it is not currently focused, has no validation error, and has no unsaved local edit
      const next: Record<string, unknown> = { ...incoming };
      for (const f of Object.keys(incoming)) {
        const isFocused = focusedField === f;
        const hasError = Boolean(fieldErrors[f]);
        const hasLocalEdit = prev[f] !== undefined && prev[f] !== incoming[f];

        if (isFocused || hasError || hasLocalEdit) {
          if (f in prev && prev[f] !== undefined) {
            next[f] = prev[f];
          }
        }
      }
      return next;
    });
  }, [recordId, recordData, fieldErrors, focusedField]);

  const handleChange = (field: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [field]: val }));
  };

  const handleCommit = (field: string) => {
    let rawVal = values[field];
    // Convert empty strings to null for nullable fields
    if (rawVal === "" && ["product", "severity", "refund_amount", "deadline"].includes(field)) {
      rawVal = null;
    } else if (field === "refund_amount" && rawVal !== null && rawVal !== "") {
      const num = Number(rawVal);
      if (!isNaN(num)) {
        rawVal = num;
      }
    }
    onPatchField(field, rawVal);
  };

  const handleKeyDown = (field: string, e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit(field);
    } else if (e.key === "Escape") {
      e.preventDefault();
      const orig = recordData[field as keyof ExtractedRecord];
      setValues((prev) => ({
        ...prev,
        [field]: orig !== null && orig !== undefined ? orig : (field === "escalated" ? false : ""),
      }));
      (e.target as HTMLElement).blur();
    }
  };

  const renderFieldFooter = (field: string) => {
    const meta = fieldMeta[field];
    const isEdited = editedFields.includes(field);
    const errorMsg = fieldErrors[field];
    const origVal = originalValues[field];

    return (
      <div className="mt-1 space-y-1">
        {/* Error message under field */}
        {errorMsg && (
          <div
            role="alert"
            data-testid={`error-${field}`}
            className="flex items-center gap-1.5 text-xs text-[#f87171] font-medium bg-[#7f1d1d]/30 px-2 py-1 rounded border border-[#b91c1c]/50"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Minimal metadata pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#94a3b8]">
          {meta && (
            <>
              {/* Confidence */}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1e222f] border border-[#2e3344] text-[#f3f4f6]">
                <span>{Math.round(meta.confidence * 100)}%</span>
                <span className="text-[#94a3b8]">conf</span>
              </span>

              {/* Source badge */}
              {isEdited || meta.source === "human" ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1e3a8a]/40 border border-[#1d4ed8]/50 text-[#93c5fd] font-medium">
                  edited by reviewer
                </span>
              ) : meta.grounded ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1e222f] border border-[#2e3344] text-[#94a3b8]">
                  model
                </span>
              ) : meta.note?.includes("domain") ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#78350f]/35 border border-[#92400e]/50 text-[#fbbf24] font-medium">
                  inferred
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#7f1d1d]/35 border border-[#b91c1c]/50 text-[#f87171] font-medium">
                  ungrounded
                </span>
              )}

              {/* Note */}
              {meta.note && (
                <span className="text-[#94a3b8] italic">({meta.note})</span>
              )}
            </>
          )}

          {/* Original value hint if touched */}
          {isEdited && origVal !== undefined && (
            <span className="text-[#64748b] ml-auto text-[10px]">
              orig: {origVal === null ? "null" : String(origVal)}
            </span>
          )}
        </div>

        {/* Evidence quote */}
        {meta?.evidence && (
          <div className="flex items-start gap-1 text-[11px] text-[#94a3b8] italic bg-[#0d0f14] px-2 py-1 rounded border border-[#262a36]">
            <Quote className="w-3 h-3 text-[#64748b] shrink-0 mt-0.5" />
            <span className="line-clamp-2">{meta.evidence}</span>
          </div>
        )}
      </div>
    );
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-1.5 rounded-md bg-[#0d0f14] border text-sm text-[#f3f4f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6] transition-colors ${
      hasError ? "border-[#ef4444]" : "border-[#262a36]"
    }`;

  return (
    <div className="space-y-3.5">
      {/* Company */}
      <div className="space-y-1">
        <label htmlFor="field-company" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Company *</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">required</span>
        </label>
        <input
          type="text"
          id="field-company"
          data-testid="input-company"
          value={(values.company as string) || ""}
          onFocus={() => setFocusedField("company")}
          onChange={(e) => handleChange("company", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("company");
          }}
          onKeyDown={(e) => handleKeyDown("company", e)}
          className={inputClass(Boolean(fieldErrors.company))}
          placeholder="e.g. Acme Corp"
        />
        {renderFieldFooter("company")}
      </div>

      {/* Product */}
      <div className="space-y-1">
        <label htmlFor="field-product" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Product</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">optional</span>
        </label>
        <select
          id="field-product"
          data-testid="select-product"
          value={(values.product as string) || ""}
          onFocus={() => setFocusedField("product")}
          onChange={(e) => handleChange("product", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("product");
          }}
          onKeyDown={(e) => handleKeyDown("product", e)}
          className={inputClass(Boolean(fieldErrors.product))}
        >
          <option value="" className="bg-[#161922] text-[#f3f4f6]">(not stated)</option>
          <option value="Zen Orchestrator" className="bg-[#161922] text-[#f3f4f6]">Zen Orchestrator</option>
          <option value="Zen Studio" className="bg-[#161922] text-[#f3f4f6]">Zen Studio</option>
          <option value="Zen Connect" className="bg-[#161922] text-[#f3f4f6]">Zen Connect</option>
          <option value="Zen Insights" className="bg-[#161922] text-[#f3f4f6]">Zen Insights</option>
          <option value="Zen Vault" className="bg-[#161922] text-[#f3f4f6]">Zen Vault</option>
        </select>
        {renderFieldFooter("product")}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label htmlFor="field-category" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Category *</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">required</span>
        </label>
        <select
          id="field-category"
          data-testid="select-category"
          value={(values.category as string) || ""}
          onFocus={() => setFocusedField("category")}
          onChange={(e) => handleChange("category", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("category");
          }}
          onKeyDown={(e) => handleKeyDown("category", e)}
          className={inputClass(Boolean(fieldErrors.category))}
        >
          <option value="" className="bg-[#161922] text-[#f3f4f6]">(select category)</option>
          <option value="outage" className="bg-[#161922] text-[#f3f4f6]">outage</option>
          <option value="billing" className="bg-[#161922] text-[#f3f4f6]">billing</option>
          <option value="bug" className="bg-[#161922] text-[#f3f4f6]">bug</option>
          <option value="feature_request" className="bg-[#161922] text-[#f3f4f6]">feature_request</option>
          <option value="how_to" className="bg-[#161922] text-[#f3f4f6]">how_to</option>
          <option value="churn_risk" className="bg-[#161922] text-[#f3f4f6]">churn_risk</option>
        </select>
        {renderFieldFooter("category")}
      </div>

      {/* Severity */}
      <div className="space-y-1">
        <label htmlFor="field-severity" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Severity</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">optional</span>
        </label>
        <select
          id="field-severity"
          data-testid="select-severity"
          value={(values.severity as string) || ""}
          onFocus={() => setFocusedField("severity")}
          onChange={(e) => handleChange("severity", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("severity");
          }}
          onKeyDown={(e) => handleKeyDown("severity", e)}
          className={inputClass(Boolean(fieldErrors.severity))}
        >
          <option value="" className="bg-[#161922] text-[#f3f4f6]">(not stated)</option>
          <option value="low" className="bg-[#161922] text-[#f3f4f6]">low</option>
          <option value="medium" className="bg-[#161922] text-[#f3f4f6]">medium</option>
          <option value="high" className="bg-[#161922] text-[#f3f4f6]">high</option>
          <option value="critical" className="bg-[#161922] text-[#f3f4f6]">critical</option>
        </select>
        {renderFieldFooter("severity")}
      </div>

      {/* Requested Action */}
      <div className="space-y-1">
        <label htmlFor="field-requested_action" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Requested Action *</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">required</span>
        </label>
        <select
          id="field-requested_action"
          data-testid="select-requested_action"
          value={(values.requested_action as string) || ""}
          onFocus={() => setFocusedField("requested_action")}
          onChange={(e) => handleChange("requested_action", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("requested_action");
          }}
          onKeyDown={(e) => handleKeyDown("requested_action", e)}
          className={inputClass(Boolean(fieldErrors.requested_action))}
        >
          <option value="" className="bg-[#161922] text-[#f3f4f6]">(select action)</option>
          <option value="refund" className="bg-[#161922] text-[#f3f4f6]">refund</option>
          <option value="credit" className="bg-[#161922] text-[#f3f4f6]">credit</option>
          <option value="fix" className="bg-[#161922] text-[#f3f4f6]">fix</option>
          <option value="callback" className="bg-[#161922] text-[#f3f4f6]">callback</option>
          <option value="information" className="bg-[#161922] text-[#f3f4f6]">information</option>
          <option value="none" className="bg-[#161922] text-[#f3f4f6]">none</option>
        </select>
        {renderFieldFooter("requested_action")}
      </div>

      {/* Refund Amount (USD) */}
      <div className="space-y-1">
        <label htmlFor="field-refund_amount" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Refund Amount (USD)</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">optional</span>
        </label>
        <input
          type="number"
          id="field-refund_amount"
          data-testid="input-refund_amount"
          step="any"
          value={values.refund_amount !== undefined ? (values.refund_amount as string | number) : ""}
          onFocus={() => setFocusedField("refund_amount")}
          onChange={(e) => handleChange("refund_amount", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("refund_amount");
          }}
          onKeyDown={(e) => handleKeyDown("refund_amount", e)}
          className={inputClass(Boolean(fieldErrors.refund_amount))}
          placeholder="e.g. 4820"
        />
        {renderFieldFooter("refund_amount")}
      </div>

      {/* Deadline */}
      <div className="space-y-1">
        <label htmlFor="field-deadline" className="text-xs font-semibold text-[#f3f4f6] flex items-center justify-between">
          <span>Deadline</span>
          <span className="text-[11px] text-[#94a3b8] font-normal">optional</span>
        </label>
        <input
          type="date"
          id="field-deadline"
          data-testid="input-deadline"
          value={(values.deadline as string) || ""}
          onFocus={() => setFocusedField("deadline")}
          onChange={(e) => handleChange("deadline", e.target.value)}
          onBlur={() => {
            setFocusedField(null);
            handleCommit("deadline");
          }}
          onKeyDown={(e) => handleKeyDown("deadline", e)}
          className={inputClass(Boolean(fieldErrors.deadline))}
        />
        {renderFieldFooter("deadline")}
      </div>

      {/* Escalated */}
      <div className="p-3 rounded-md bg-[#161922] border border-[#262a36] flex items-center justify-between">
        <div>
          <label
            htmlFor="field-escalated"
            className="text-xs font-semibold text-[#f3f4f6] cursor-pointer select-none"
          >
            Escalated
          </label>
          <p className="text-[11px] text-[#94a3b8]">
            Check if customer indicated executive escalation or churn risk
          </p>
        </div>
        <input
          type="checkbox"
          id="field-escalated"
          data-testid="input-escalated"
          checked={Boolean(values.escalated)}
          onChange={(e) => {
            handleChange("escalated", e.target.checked);
            onPatchField("escalated", e.target.checked);
          }}
          className="w-4 h-4 rounded border-[#262a36] bg-[#0d0f14] text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
        />
      </div>
      {renderFieldFooter("escalated")}
    </div>
  );
}
