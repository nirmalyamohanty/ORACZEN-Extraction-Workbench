import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { sortItemsForReview } from "../components/ItemList";
import { FieldEditor } from "../components/FieldEditor";
import { JobResultItem } from "../lib/types";

describe("sortItemsForReview", () => {
  it("puts unresolved needs_review items first, then failed, then done", () => {
    const items: JobResultItem[] = [
      {
        ticket_id: "tkt_0001",
        record_id: "rec_1",
        status: "done",
        attempts: 1,
        field_meta: {},
        flags: [],
        edited_fields: [],
        original_values: {},
        resolved: false,
        raw_outputs: [],
        validation_errors: [],
        ticket: { subject: "", body: "", channel: "email", received_at: "", from_email: "" },
      },
      {
        ticket_id: "tkt_0002",
        record_id: "rec_2",
        status: "needs_review",
        attempts: 2,
        field_meta: {},
        flags: [],
        edited_fields: [],
        original_values: {},
        resolved: false,
        raw_outputs: [],
        validation_errors: [],
        ticket: { subject: "", body: "", channel: "email", received_at: "", from_email: "" },
      },
      {
        ticket_id: "tkt_0003",
        record_id: "rec_3",
        status: "failed",
        attempts: 1,
        field_meta: {},
        flags: [],
        edited_fields: [],
        original_values: {},
        resolved: false,
        raw_outputs: [],
        validation_errors: [],
        ticket: { subject: "", body: "", channel: "email", received_at: "", from_email: "" },
      },
      {
        ticket_id: "tkt_0004",
        record_id: "rec_4",
        status: "needs_review",
        attempts: 2,
        field_meta: {},
        flags: [],
        edited_fields: ["severity"],
        original_values: {},
        resolved: true, // Resolved review item
        raw_outputs: [],
        validation_errors: [],
        ticket: { subject: "", body: "", channel: "email", received_at: "", from_email: "" },
      },
    ];

    const sorted = sortItemsForReview(items);
    expect(sorted.map((i) => i.ticket_id)).toEqual([
      "tkt_0002", // Unresolved needs_review
      "tkt_0003", // Failed
      "tkt_0004", // Resolved needs_review
      "tkt_0001", // Done
    ]);
  });
});

describe("FieldEditor component", () => {
  it("renders a server validation error under the correct field and retains the typed value", () => {
    const onPatchMock = vi.fn().mockResolvedValue(false);

    render(
      <FieldEditor
        recordId="rec_test_123"
        recordData={{
          company: "Castlerock Mining",
          severity: "urgent" as any,
        }}
        fieldMeta={{}}
        editedFields={[]}
        originalValues={{}}
        onPatchField={onPatchMock}
        fieldErrors={{
          severity: "Input should be 'low', 'medium', 'high' or 'critical'",
        }}
        isSaving={false}
      />
    );

    // Assert error message is displayed
    const errorEl = screen.getByTestId("error-severity");
    expect(errorEl).not.toBeNull();
    expect(errorEl.textContent).toContain(
      "Input should be 'low', 'medium', 'high' or 'critical'"
    );

    // Assert company input retains typed value
    const companyInput = screen.getByTestId("input-company") as HTMLInputElement;
    expect(companyInput.value).toBe("Castlerock Mining");

    // Type a new company and trigger blur
    fireEvent.change(companyInput, { target: { value: "Oraczen Inc" } });
    expect(companyInput.value).toBe("Oraczen Inc");
    fireEvent.blur(companyInput);

    expect(onPatchMock).toHaveBeenCalledWith("company", "Oraczen Inc");
  });
});
