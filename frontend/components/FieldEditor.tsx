"use client";

import { useState, useEffect } from "react";
import {
  ExtractedRecord,
  FieldMeta,
  Product,
  Category,
  Severity,
  RequestedAction,
} from "@/lib/types";
import { Check, User, Cpu, AlertCircle, Quote } from "lucide-react";

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

  useEffect(() => {
    setValues({
      company: recordData.company ?? "",
      product: recordData.product ?? "",
      category: recordData.category ?? "",
      severity: recordData.severity ?? "",
      requested_action: recordData.requested_action ?? "",
      refund_amount: recordData.refund_amount !== null && recordData.refund_amount !== undefined
        ? recordData.refund_amount
        : "",
      deadline: recordData.deadline ?? "",
      escalated: recordData.escalated ?? false,
    });
  }, [recordId, recordData]);

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
            className="flex items-center gap-1.5 text-xs text-rose-400 font-medium bg-rose-950/40 px-2 py-1 rounded border border-rose-800/60"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Metadata pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          {meta && (
            <>
              {/* Confidence */}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/70 border border-slate-700/60 text-slate-300 font-medium">
                <span>{Math.round(meta.confidence * 100)}%</span>
                <span className="text-slate-500">conf</span>
              </span>

              {/* Source badge */}
              {isEdited || meta.source === "human" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-medium">
                  <User className="w-3 h-3" />
                  <span>edited by reviewer</span>
                </span>
              ) : meta.grounded ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Cpu className="w-3 h-3" />
                  <span>model</span>
                </span>
              ) : meta.note?.includes("domain") ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                  <span>inferred</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-medium">
                  <span>ungrounded</span>
                </span>
              )}

              {/* Note */}
              {meta.note && (
                <span className="text-slate-500 italic">({meta.note})</span>
              )}
            </>
          )}

          {/* Original value hint if touched */}
          {isEdited && origVal !== undefined && (
            <span className="text-slate-500 ml-auto text-[10px]">
              orig: {origVal === null ? "null" : String(origVal)}
            </span>
          )}
        </div>

        {/* Evidence quote */}
        {meta?.evidence && (
          <div className="flex items-start gap-1 text-[11px] text-slate-400 italic bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
            <Quote className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{meta.evidence}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Company */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Company *</span>
          <span className="text-[11px] text-slate-500 font-normal">string (required)</span>
        </label>
        <input
          type="text"
          id="field-company"
          data-testid="input-company"
          value={(values.company as string) || ""}
          onChange={(e) => handleChange("company", e.target.value)}
          onBlur={() => handleCommit("company")}
          onKeyDown={(e) => e.key === "Enter" && handleCommit("company")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.company ? "border-rose-500" : "border-slate-700"
          }`}
          placeholder="e.g. Acme Corp"
        />
        {renderFieldFooter("company")}
      </div>

      {/* Product */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Product</span>
          <span className="text-[11px] text-slate-500 font-normal">Zen enum (optional)</span>
        </label>
        <select
          id="field-product"
          data-testid="select-product"
          value={(values.product as string) || ""}
          onChange={(e) => handleChange("product", e.target.value)}
          onBlur={() => handleCommit("product")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.product ? "border-rose-500" : "border-slate-700"
          }`}
        >
          <option value="">(not stated)</option>
          <option value="Zen Orchestrator">Zen Orchestrator</option>
          <option value="Zen Studio">Zen Studio</option>
          <option value="Zen Connect">Zen Connect</option>
          <option value="Zen Insights">Zen Insights</option>
          <option value="Zen Vault">Zen Vault</option>
        </select>
        {renderFieldFooter("product")}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Category *</span>
          <span className="text-[11px] text-slate-500 font-normal">enum (required)</span>
        </label>
        <select
          id="field-category"
          data-testid="select-category"
          value={(values.category as string) || ""}
          onChange={(e) => handleChange("category", e.target.value)}
          onBlur={() => handleCommit("category")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.category ? "border-rose-500" : "border-slate-700"
          }`}
        >
          <option value="">(select category)</option>
          <option value="outage">outage</option>
          <option value="billing">billing</option>
          <option value="bug">bug</option>
          <option value="feature_request">feature_request</option>
          <option value="how_to">how_to</option>
          <option value="churn_risk">churn_risk</option>
        </select>
        {renderFieldFooter("category")}
      </div>

      {/* Severity */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Severity</span>
          <span className="text-[11px] text-slate-500 font-normal">enum (optional)</span>
        </label>
        <select
          id="field-severity"
          data-testid="select-severity"
          value={(values.severity as string) || ""}
          onChange={(e) => handleChange("severity", e.target.value)}
          onBlur={() => handleCommit("severity")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.severity ? "border-rose-500" : "border-slate-700"
          }`}
        >
          <option value="">(not stated)</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        {renderFieldFooter("severity")}
      </div>

      {/* Requested Action */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Requested Action *</span>
          <span className="text-[11px] text-slate-500 font-normal">enum (required)</span>
        </label>
        <select
          id="field-requested_action"
          data-testid="select-requested_action"
          value={(values.requested_action as string) || ""}
          onChange={(e) => handleChange("requested_action", e.target.value)}
          onBlur={() => handleCommit("requested_action")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.requested_action ? "border-rose-500" : "border-slate-700"
          }`}
        >
          <option value="">(select action)</option>
          <option value="refund">refund</option>
          <option value="credit">credit</option>
          <option value="fix">fix</option>
          <option value="callback">callback</option>
          <option value="information">information</option>
          <option value="none">none</option>
        </select>
        {renderFieldFooter("requested_action")}
      </div>

      {/* Refund Amount (USD) */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Refund Amount (USD)</span>
          <span className="text-[11px] text-slate-500 font-normal">number &ge; 0 (optional)</span>
        </label>
        <input
          type="number"
          id="field-refund_amount"
          data-testid="input-refund_amount"
          step="any"
          value={values.refund_amount !== undefined ? (values.refund_amount as string | number) : ""}
          onChange={(e) => handleChange("refund_amount", e.target.value)}
          onBlur={() => handleCommit("refund_amount")}
          onKeyDown={(e) => e.key === "Enter" && handleCommit("refund_amount")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.refund_amount ? "border-rose-500" : "border-slate-700"
          }`}
          placeholder="e.g. 4820"
        />
        {renderFieldFooter("refund_amount")}
      </div>

      {/* Deadline */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
          <span>Deadline</span>
          <span className="text-[11px] text-slate-500 font-normal">date YYYY-MM-DD (optional)</span>
        </label>
        <input
          type="date"
          id="field-deadline"
          data-testid="input-deadline"
          value={(values.deadline as string) || ""}
          onChange={(e) => handleChange("deadline", e.target.value)}
          onBlur={() => handleCommit("deadline")}
          className={`w-full px-3 py-2 rounded-lg bg-slate-950 border text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
            fieldErrors.deadline ? "border-rose-500" : "border-slate-700"
          }`}
        />
        {renderFieldFooter("deadline")}
      </div>

      {/* Escalated */}
      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
        <div>
          <label
            htmlFor="field-escalated"
            className="text-xs font-semibold text-slate-200 cursor-pointer select-none"
          >
            Escalated
          </label>
          <p className="text-[11px] text-slate-400">
            Check if customer indicated executive/leadership escalation or termination risk
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
          className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 cursor-pointer"
        />
      </div>
      {renderFieldFooter("escalated")}
    </div>
  );
}
