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
  // local copy of field values so the user can type freely without triggering a save on each keystroke
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // sync local values from props BUT only for fields that arent currently being edited
  // this prevents the input from resetting while the user is mid-type
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

      const next: Record<string, unknown> = { ...incoming };
      for (const f of Object.keys(incoming)) {
        const isFocused = focusedField === f;
        const hasError = Boolean(fieldErrors[f]);
        // if user typed something that doesnt match what the server returned, keep their version
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

  // called on blur (leaving the field) or on Enter - sends the value to the server
  const handleCommit = (field: string) => {
    let rawVal = values[field];
    // convert empty string to null for optional fields - backend expects null not ""
    if (rawVal === "" && ["product", "severity", "refund_amount", "deadline"].includes(field)) {
      rawVal = null;
    } else if (field === "refund_amount" && rawVal !== null && rawVal !== "") {
      const num = Number(rawVal);
      if (!isNaN(num)) {
        rawVal = num; // convert to number type before sending
      }
    }
    onPatchField(field, rawVal);
  };

  const handleKeyDown = (field: string, e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit(field);
    } else if (e.key === "Escape") {
      // discard the edit and restore the last saved value
      e.preventDefault();
      const orig = recordData[field as keyof ExtractedRecord];
      setValues((prev) => ({
        ...prev,
        [field]: orig !== null && orig !== undefined ? orig : (field === "escalated" ? false : ""),
      }));
      (e.target as HTMLElement).blur();
    }
  };

  // renders the small metadata strip below each field - confidence %, source badge, evidence quote
  const renderFieldFooter = (field: string) => {
    const meta = fieldMeta[field];
    const isEdited = editedFields.includes(field);
    const errorMsg = fieldErrors[field];
    const origVal = originalValues[field];

    return (
      <div className="mt-1 space-y-1">
        {errorMsg && (
          <div
            role="alert"
            data-testid={`error-${field}`}
            className="flex items-center gap-1.5 text-xs text-[#991b1b] font-medium bg-[#fee2e2] px-2 py-1 rounded border border-[#fecaca]"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#57534e]">
          {meta && (
            <>
              {/* confidence score from the model - higher is better */}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#f5f2eb] border border-[#eae6de] text-[#1c1917] font-mono">
                <span>{Math.round(meta.confidence * 100)}%</span>
                <span className="text-[#8c857b]">conf</span>
              </span>

              {/* source badge - tells reviewer where the value came from */}
              {isEdited || meta.source === "human" ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fef9ee] border border-[#fde68a] text-[#92400e] font-medium">
                  manual override
                </span>
              ) : meta.grounded ? (
                // grounded = model found this directly in the ticket text
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#f5f2eb] border border-[#eae6de] text-[#57534e]">
                  model
                </span>
              ) : meta.note?.includes("domain") ? (
                // inferred from domain knowledge, not directly stated in ticket
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fef3c7] border border-[#fde68a] text-[#92400e] font-medium">
                  inferred
                </span>
              ) : (
                // ungrounded = model made this up, definitely needs review
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#fee2e2] border border-[#fecaca] text-[#991b1b] font-medium">
                  ungrounded
                </span>
              )}

              {meta.note && (
                <span className="text-[#8c857b] italic text-[10px]">({meta.note})</span>
              )}
            </>
          )}

          {/* show what the original model value was, in case the reviewer wants to revert */}
          {isEdited && origVal !== undefined && (
            <span className="text-[#8c857b] ml-auto text-[10px] font-mono">
              orig: {origVal === null ? "null" : String(origVal)}
            </span>
          )}
        </div>

        {/* quote from the ticket that the model used as evidence for this value */}
        {meta?.evidence && (
          <div className="flex items-start gap-1 text-[11px] text-[#57534e] italic bg-[#fbf9f5] px-2 py-1 rounded border border-[#eae6de]">
            <Quote className="w-3 h-3 text-[#8c857b] shrink-0 mt-0.5" />
            <span className="line-clamp-2">{meta.evidence}</span>
          </div>
        )}
      </div>
    );
  };

  // shared class for all text inputs and selects
  const inputClass = (hasError: boolean) =>
    `w-full px-2.5 py-1.5 rounded-md bg-[#fbf9f5] focus:bg-white border text-xs text-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#15803d] focus:border-[#15803d] transition-all ${
      hasError ? "border-[#dc2626] bg-[#fef2f2]" : "border-[#eae6de]"
    }`;

  return (
    <div className="space-y-3.5">
      <div className="space-y-1">
        <label htmlFor="field-company" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Company *</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">required</span>
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

      <div className="space-y-1">
        <label htmlFor="field-product" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Product</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">optional</span>
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
          <option value="" className="bg-white text-[#1c1917]">(not stated)</option>
          <option value="Zen Orchestrator" className="bg-white text-[#1c1917]">Zen Orchestrator</option>
          <option value="Zen Studio" className="bg-white text-[#1c1917]">Zen Studio</option>
          <option value="Zen Connect" className="bg-white text-[#1c1917]">Zen Connect</option>
          <option value="Zen Insights" className="bg-white text-[#1c1917]">Zen Insights</option>
          <option value="Zen Vault" className="bg-white text-[#1c1917]">Zen Vault</option>
        </select>
        {renderFieldFooter("product")}
      </div>

      <div className="space-y-1">
        <label htmlFor="field-category" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Category *</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">required</span>
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
          <option value="" className="bg-white text-[#1c1917]">(select category)</option>
          <option value="outage" className="bg-white text-[#1c1917]">outage</option>
          <option value="billing" className="bg-white text-[#1c1917]">billing</option>
          <option value="bug" className="bg-white text-[#1c1917]">bug</option>
          <option value="feature_request" className="bg-white text-[#1c1917]">feature_request</option>
          <option value="how_to" className="bg-white text-[#1c1917]">how_to</option>
          <option value="churn_risk" className="bg-white text-[#1c1917]">churn_risk</option>
        </select>
        {renderFieldFooter("category")}
      </div>

      <div className="space-y-1">
        <label htmlFor="field-severity" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Severity</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">optional</span>
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
          <option value="" className="bg-white text-[#1c1917]">(not stated)</option>
          <option value="low" className="bg-white text-[#1c1917]">low</option>
          <option value="medium" className="bg-white text-[#1c1917]">medium</option>
          <option value="high" className="bg-white text-[#1c1917]">high</option>
          <option value="critical" className="bg-white text-[#1c1917]">critical</option>
        </select>
        {renderFieldFooter("severity")}
      </div>

      <div className="space-y-1">
        <label htmlFor="field-requested_action" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Requested Action *</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">required</span>
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
          <option value="" className="bg-white text-[#1c1917]">(select action)</option>
          <option value="refund" className="bg-white text-[#1c1917]">refund</option>
          <option value="credit" className="bg-white text-[#1c1917]">credit</option>
          <option value="fix" className="bg-white text-[#1c1917]">fix</option>
          <option value="callback" className="bg-white text-[#1c1917]">callback</option>
          <option value="information" className="bg-white text-[#1c1917]">information</option>
          <option value="none" className="bg-white text-[#1c1917]">none</option>
        </select>
        {renderFieldFooter("requested_action")}
      </div>

      <div className="space-y-1">
        <label htmlFor="field-refund_amount" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Refund Amount (USD)</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">optional</span>
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

      <div className="space-y-1">
        <label htmlFor="field-deadline" className="text-xs font-semibold text-[#1c1917] flex items-center justify-between">
          <span>Deadline</span>
          <span className="text-[10px] text-[#8c857b] font-normal uppercase tracking-wider">optional</span>
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

      {/* escalated boolean toggle */}
      <div className="p-3 rounded-lg bg-[#fbf9f5] border border-[#eae6de] flex items-center justify-between">
        <div>
          <label
            htmlFor="field-escalated"
            className="text-xs font-semibold text-[#1c1917] cursor-pointer select-none"
          >
            Escalated Ticket
          </label>
          <p className="text-[11px] text-[#57534e]">
            Customer indicated executive escalation or urgent churn risk
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
          className="w-4 h-4 rounded border-[#d6d0c4] bg-[#fbf9f5] text-[#15803d] focus:ring-[#15803d] cursor-pointer"
        />
      </div>
      {renderFieldFooter("escalated")}
    </div>
  );
}
