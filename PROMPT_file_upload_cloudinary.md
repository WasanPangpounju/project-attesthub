# PROMPT: File Upload for Test Case Results (Cloudinary)

## Context
AttestHub Next.js 14 App Router project using MongoDB/Mongoose, Clerk auth, TypeScript strict mode.
Read CLAUDE.md for project conventions before starting.

Cloudinary credentials are already in `.env.local`:
```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## Task Overview

Enable Tester to upload real files (images, videos, PDFs) as attachments to each Test Case result.
Files are uploaded to Cloudinary. URLs are stored in MongoDB (`results[].attachments[].url`).

Files to modify:
1. Install Cloudinary SDK
2. Create upload API route
3. Update test case attachment API route
4. Update Tester UI (Test Cases tab in drawer)

---

## Step 1: Install Cloudinary SDK

```bash
npm install cloudinary
```

---

## Step 2: Create Cloudinary helper — `lib/cloudinary.ts`

```typescript
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export default cloudinary;
```

---

## Step 3: Create Upload API Route — `app/api/upload/route.ts`

```
POST /api/upload
Content-Type: multipart/form-data
Body: file (File), folder? (string)
Response: { data: { url: string, publicId: string, resourceType: string, format: string, bytes: number } }
```

Implementation rules:
- `export const runtime = "nodejs"`
- Auth via `auth()` from `@clerk/nextjs/server` — reject if not logged in (401)
- Accept `multipart/form-data` using `request.formData()`
- Get `file` from formData — reject if missing (400)
- Validate file type: allow `image/*`, `video/*`, `application/pdf` — reject others (400 "Unsupported file type")
- Validate file size: max 50MB for video, max 10MB for image/PDF — reject if too large (400 "File too large")
- Convert file to buffer: `Buffer.from(await file.arrayBuffer())`
- Upload to Cloudinary using upload_stream:
  ```typescript
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder || "attesthub/test-results",
        resource_type: "auto", // handles image, video, pdf
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
  ```
- Return `{ data: { url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format, bytes: result.bytes } }`
- Wrap in try/catch, return 500 on error

---

## Step 4: Update Test Case Attachment API

File: `app/api/tester/tasks/[id]/scenarios/[scenarioId]/test-cases/[tcId]/attachments/route.ts`

Update `POST` handler:
- Body now accepts: `{ name, size, type, url, publicId }` (url is now required — the Cloudinary URL)
- Store all fields including `url` and `publicId` in the attachment subdoc
- No other changes needed

Add `publicId?: string` to the attachment schema in `models/test-case.ts` AttachmentSchema:
```typescript
publicId: { type: String },
```

Also add `publicId?: string` to the `ITesterResult` attachment interface.

---

## Step 5: Update Tester UI — Test Cases Tab

File: `app/dashboard/tester/page.tsx`

### A. Add upload state per test case

Add to component state:
```typescript
const [uploadingTC, setUploadingTC] = useState<string | null>(null) // tcId being uploaded
```

Add hidden file input ref:
```typescript
const tcFileInputRef = useRef<HTMLInputElement>(null)
const [tcFileInputTarget, setTCFileInputTarget] = useState<{taskId: string, scenarioId: string, tcId: string} | null>(null)
```

### B. Add upload function

```typescript
async function handleTCFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file || !tcFileInputTarget) return

  const { taskId, scenarioId, tcId } = tcFileInputTarget
  setUploadingTC(tcId)

  try {
    // 1. Upload to Cloudinary via /api/upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("folder", "attesthub/test-results")

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })
    if (!uploadRes.ok) {
      const d = await uploadRes.json().catch(() => ({}))
      throw new Error((d as { error?: string })?.error || "Upload failed")
    }
    const { data: uploadData } = await uploadRes.json() as {
      data: { url: string; publicId: string; resourceType: string; format: string; bytes: number }
    }

    // 2. Save attachment metadata to MongoDB
    const attachRes = await fetch(
      `/api/tester/tasks/${taskId}/scenarios/${scenarioId}/test-cases/${tcId}/attachments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          type: file.type,
          url: uploadData.url,
          publicId: uploadData.publicId,
        }),
      }
    )
    if (!attachRes.ok) throw new Error("Failed to save attachment")

    const { data: attachData } = await attachRes.json()

    // 3. Update local state
    setScenarios((prev) =>
      prev.map((sc) =>
        sc._id !== scenarioId ? sc : {
          ...sc,
          testCases: sc.testCases.map((tc) =>
            tc._id !== tcId ? tc : {
              ...tc,
              myResult: {
                ...tc.myResult,
                attachments: [...(tc.myResult.attachments ?? []), attachData],
              },
            }
          ),
        }
      )
    )
    toast.success("File uploaded")
  } catch (e) {
    console.error("TC file upload error:", e)
    toast.error(e instanceof Error ? e.message : "Upload failed")
  } finally {
    setUploadingTC(null)
    setTCFileInputTarget(null)
    if (tcFileInputRef.current) tcFileInputRef.current.value = ""
  }
}
```

### C. Add hidden file input (once, outside drawer)

Place right before the closing `</DashboardLayout>`:
```tsx
<input
  ref={tcFileInputRef}
  type="file"
  className="hidden"
  accept="image/*,video/*,.pdf"
  onChange={handleTCFileUpload}
  aria-hidden="true"
/>
```

### D. Add Upload button + Attachment preview inside each expanded test case

In the expanded test case content (inside `isTCExpanded && ...`), after the Pass/Fail/Skip buttons section, add:

```tsx
{/* Attachments */}
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      Attachments ({tc.myResult.attachments?.length ?? 0})
    </p>
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 h-7 text-xs"
      disabled={uploadingTC === tc._id}
      onClick={() => {
        setTCFileInputTarget({
          taskId: selectedTask!._id,
          scenarioId: scenario._id,
          tcId: tc._id,
        })
        tcFileInputRef.current?.click()
      }}
      aria-label="Upload attachment"
    >
      {uploadingTC === tc._id ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Upload className="h-3 w-3" />
      )}
      {uploadingTC === tc._id ? "Uploading…" : "Upload"}
    </Button>
  </div>

  {/* Attachment list */}
  {(tc.myResult.attachments ?? []).length > 0 && (
    <div className="space-y-1.5">
      {tc.myResult.attachments.map((att, idx) => {
        const isImage = att.type?.startsWith("image/")
        const isVideo = att.type?.startsWith("video/")

        return (
          <div key={att._id ?? idx} className="border rounded-lg overflow-hidden">
            {/* Image preview */}
            {isImage && att.url && (
              <a href={att.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-full max-h-48 object-cover"
                  loading="lazy"
                />
              </a>
            )}

            {/* Video preview */}
            {isVideo && att.url && (
              <video
                src={att.url}
                controls
                className="w-full max-h-48"
                preload="metadata"
              />
            )}

            {/* File info row */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{att.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(att.size)}</p>
              </div>
              {att.url && (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline shrink-0"
                >
                  Open
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )}
</div>
```

Make sure `Upload` is imported from lucide-react (it should already be imported from the existing attachment feature — check and add if missing).

---

## Step 6: Update Admin UI — Test Case result preview

File: `app/dashboard/admin/projects/[id]/page.tsx`

In the expanded test case card (inside `expanded && ...`), after the Expected Result section, add a Results section showing each tester's result with their attachments:

```tsx
{/* Tester Results */}
{tc.results.length > 0 && (
  <div>
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
      Tester Results
    </p>
    <div className="space-y-3">
      {tc.results.map((result, rIdx) => {
        const testerInfo = testerMap[result.testerId]
        const testerName = testerInfo
          ? `${testerInfo.firstName ?? ""} ${testerInfo.lastName ?? ""}`.trim() || testerInfo.email || result.testerId
          : result.testerId

        return (
          <div key={rIdx} className="border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{testerName}</span>
              <Badge className={cn("text-xs", {
                "bg-green-100 text-green-700": result.status === "pass",
                "bg-red-100 text-red-700": result.status === "fail",
                "bg-yellow-100 text-yellow-700": result.status === "skip",
                "bg-gray-100 text-gray-600": result.status === "pending",
              })}>
                {result.status}
              </Badge>
              {result.testedAt && (
                <span className="text-xs text-muted-foreground">{fmtDate(result.testedAt)}</span>
              )}
            </div>

            {result.note && (
              <p className="text-xs text-muted-foreground italic">{result.note}</p>
            )}

            {/* Attachment previews */}
            {(result.attachments ?? []).length > 0 && (
              <div className="space-y-1.5">
                {result.attachments.map((att, aIdx) => {
                  const isImage = att.type?.startsWith("image/")
                  const isVideo = att.type?.startsWith("video/")
                  return (
                    <div key={aIdx} className="border rounded overflow-hidden">
                      {isImage && att.url && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <img src={att.url} alt={att.name} className="w-full max-h-40 object-cover" loading="lazy" />
                        </a>
                      )}
                      {isVideo && att.url && (
                        <video src={att.url} controls className="w-full max-h-40" preload="metadata" />
                      )}
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 text-xs">
                        <span className="flex-1 truncate">{att.name}</span>
                        {att.url && (
                          <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline shrink-0">
                            Open
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
)}
```

Also add `publicId?: string` to the `TesterResult` attachment interface in this file.

---

## Step 7: After implementation

Run `npm run build` — must pass with zero TypeScript errors.

Report all changed/created files.
