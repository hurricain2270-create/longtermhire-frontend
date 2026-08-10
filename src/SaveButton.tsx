// @ts-nocheck
import React, { useState } from "react";

// A save button that tells you where it has got to.
//
// The problem it solves: you press Save, a toast appears, and the screen still
// shows the old data because nothing refetched. You cannot tell whether the
// save worked, whether the screen is stale, or both. Worse on the client and
// partner portals, where they cannot ring us to ask.
//
// So the button carries the state through:
//   Save  ->  Saving...  ->  Saved, updating...  ->  Saved  ->  Save
//
// If the refresh fails it stays on "Saved - refresh to see it", which is
// honest. The save worked; the screen did not catch up.
//
// Usage:
//   <SaveButton onSave={save} onRefresh={load}>Save</SaveButton>
//
// onSave should throw if it fails. onRefresh is optional - without it the
// button settles at "Saved" and stays there briefly.

const SaveButton = ({
  onSave,
  onRefresh,
  children = "Save",
  className = "",
  disabled = false,
  ...rest
}) => {
  const [state, setState] = useState("idle");

  const label =
    state === "saving" ? "Saving…"
    : state === "refreshing" ? "Saved, updating…"
    : state === "done" ? "Saved ✓"
    : state === "stale" ? "Saved — refresh to see it"
    : children;

  const tone =
    state === "done" ? "!bg-[#4CAF50] !text-[#1F1F20]"
    : state === "stale" ? "!bg-[#3a2f14] !text-[#F59E0B] !border-[#F59E0B]"
    : "";

  const press = async () => {
    if (state === "saving" || state === "refreshing") return;
    setState("saving");
    try {
      await onSave();
    } catch (e) {
      setState("idle");
      return; // whoever called us shows the error
    }
    if (!onRefresh) {
      setState("done");
      setTimeout(() => setState("idle"), 1800);
      return;
    }
    setState("refreshing");
    try {
      await onRefresh();
      setState("done");
      setTimeout(() => setState("idle"), 1800);
    } catch (e) {
      // Saved, but the screen is behind. Say so rather than pretending.
      setState("stale");
    }
  };

  return (
    <button
      onClick={press}
      disabled={disabled || state === "saving" || state === "refreshing"}
      className={className + " " + tone}
      {...rest}
    >
      {label}
    </button>
  );
};

export default SaveButton;
