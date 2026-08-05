"use client";

// Hands the selected video File from the project-list page to the editor page
// across a client-side navigation. Files can't be serialized into the URL and
// videos are never uploaded, so an in-memory handoff is the only option. After
// a hard reload the editor simply asks the user to re-select the file.
let pendingFile: File | null = null;

export function setPendingVideo(file: File | null): void {
  pendingFile = file;
}

export function takePendingVideo(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
