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

  it("handles Enter to commit and Escape to cancel an edit", () => {
    const onPatchMock = vi.fn().mockResolvedValue(true);

    render(
      <FieldEditor
        recordId="rec_keyboard_test"
        recordData={{
          company: "Original Company",
        }}
        fieldMeta={{}}
        editedFields={[]}
        originalValues={{}}
        onPatchField={onPatchMock}
        fieldErrors={{}}
        isSaving={false}
      />
    );

    const input = screen.getByTestId("input-company") as HTMLInputElement;
    expect(input.value).toBe("Original Company");

    // Change and press Enter -> triggers onPatchField
    fireEvent.change(input, { target: { value: "New Company" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onPatchMock).toHaveBeenCalledWith("company", "New Company");

    // Change again and press Escape -> reverts back to original
    fireEvent.change(input, { target: { value: "Aborted Company" } });
    expect(input.value).toBe("Aborted Company");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("Original Company");
  });

  it("retains rejected value open when fieldErrors is populated after failed patch", () => {
    const onPatchMock = vi.fn().mockResolvedValue(false);

    const { rerender } = render(
      <FieldEditor
        recordId="rec_rollback_test"
        recordData={{
          company: "Original Company",
          severity: "low",
        }}
        fieldMeta={{}}
        editedFields={[]}
        originalValues={{}}
        onPatchField={onPatchMock}
        fieldErrors={{}}
        isSaving={false}
      />
    );

    const select = screen.getByTestId("select-severity") as HTMLSelectElement;
    expect(select.value).toBe("low");

    // Re-render as if optimistic patch rolled back to original data but fieldErrors has error
    rerender(
      <FieldEditor
        recordId="rec_rollback_test"
        recordData={{
          company: "Original Company",
          severity: "low",
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

    // Error is visible
    const errorEl = screen.getByTestId("error-severity");
    expect(errorEl.textContent).toContain("Input should be 'low', 'medium', 'high' or 'critical'");
  });

  it("does not overwrite field values from props when field is focused or has unsaved edit", () => {
    const onPatchMock = vi.fn().mockResolvedValue(true);

    const { rerender } = render(
      <FieldEditor
        recordId="rec_edit_sync_test"
        recordData={{
          company: "Initial Company",
        }}
        fieldMeta={{}}
        editedFields={[]}
        originalValues={{}}
        onPatchField={onPatchMock}
        fieldErrors={{}}
        isSaving={false}
      />
    );

    const input = screen.getByTestId("input-company") as HTMLInputElement;
    expect(input.value).toBe("Initial Company");

    // Focus input and type an unsaved edit
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "User Is Typing..." } });
    expect(input.value).toBe("User Is Typing...");

    // Background poll triggers re-render with different/old prop data
    rerender(
      <FieldEditor
        recordId="rec_edit_sync_test"
        recordData={{
          company: "Background Updated Company",
        }}
        fieldMeta={{}}
        editedFields={[]}
        originalValues={{}}
        onPatchField={onPatchMock}
        fieldErrors={{}}
        isSaving={false}
      />
    );

    // Assert user's in-progress typed value is preserved
    expect(input.value).toBe("User Is Typing...");
  });
});
