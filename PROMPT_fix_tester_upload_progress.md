# Fix: Tester Dashboard — File Upload + Progress UI after Done

## Bug 1: File Upload not working

**File:** `app/dashboard/tester/page.tsx`
**Function:** `handleFileSelect`

Current issue: File is selected but nothing appears in the attachments list.

**Diagnosis steps:**
1. Open browser DevTools → Network tab
2. Select a file in the Upload input
3. Check if `POST /api/tester/tasks/[id]/attachments` is called
4. If called → check response status and body
5. If not called → the fetch is not firing

**Likely fix A: Check the API route**
Open `app/api/tester/tasks/[id]/attachments/route.ts`
Verify the POST handler:
- Reads body correctly: `const body = await req.json()`
- Returns `{ data: attachment }` where attachment includes `_id`, `name`, `size`, `type`, `uploadedAt`
- The returned attachment object must have enough fields for the UI to render

If the route returns the full `attachments` array instead of the single new attachment,
update the client to handle that:

```ts
// In handleFileSelect, after successful POST:
const json = await res.json()
// Handle both: { data: singleAttachment } OR { data: allAttachments[] }
const returned = json.data
if (Array.isArray(returned)) {
  setDrawerAttachments(returned)
} else {
  setDrawerAttachments((prev) => [...prev, returned])
}
```

**Likely fix B: file input onChange not triggering**
Check if the `<input type="file">` has `onChange={handleFileSelect}`.
Also check: after upload, `fileInputRef.current.value = ""` resets the input — this is correct.

**Likely fix C: CORS or auth issue**
The tester route checks role. If the auth check fails silently, add error logging:
```ts
// In handleFileSelect catch block:
console.error("Attachment upload error:", e)
toast.error(e instanceof Error ? e.message : "Failed to upload file")
```

**Fix the route to return the new attachment clearly:**
```ts
// In attachments/route.ts POST handler:
// After pushing to array and saving:
const saved = doc.attachments[doc.attachments.length - 1]
return NextResponse.json({ data: saved }, { status: 201 })
```

---

## Bug 2: Progress tab shows "Start working to update progress" after task is Done

**File:** `app/dashboard/tester/page.tsx`

In the Progress tab of the Sheet/Drawer, there is this message:
```tsx
{selectedTask.myTesterEntry?.workStatus !== "working" && (
  <span className="text-xs text-muted-foreground">
    Start working to update progress
  </span>
)}
```

This shows for ALL non-working statuses, including "done".

**Fix:** Update the condition to only show for assigned/accepted:
```tsx
{(selectedTask.myTesterEntry?.workStatus === "assigned" ||
  selectedTask.myTesterEntry?.workStatus === "accepted") && (
  <span className="text-xs text-muted-foreground">
    Start working to update progress
  </span>
)}
```

Also the Slider is disabled when status !== "working". After Done, show a read-only
progress display instead of a disabled slider:

```tsx
{selectedTask.myTesterEntry?.workStatus === "done" ? (
  <div className="space-y-2">
    <Progress
      value={progressValue}
      className="h-3"
      aria-label={`Completed at ${progressValue}%`}
    />
    <p className="text-xs text-muted-foreground text-center">
      Completed at {progressValue}%
    </p>
  </div>
) : (
  <Slider
    value={[progressValue]}
    onValueChange={([v]) => onProgressChange(v)}
    min={0}
    max={100}
    step={5}
    disabled={selectedTask.myTesterEntry?.workStatus !== "working"}
    aria-label="Task progress percentage"
  />
)}
```

---

## After fixing

Run:
```bash
npm run build
```

## Definition of Done
- [ ] Upload a file → appears in Files tab list immediately
- [ ] POST /api/tester/tasks/[id]/attachments returns 201 with attachment data
- [ ] After "Mark as Done" → Progress tab shows read-only progress bar, no "Start working" message
- [ ] `npm run build` passes
