import puppeteer from "puppeteer"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { connectToDatabase } from "@/lib/mongodb"
import User from "@/models/User"
import AuditRequest from "@/models/audit-request"

export const runtime = "nodejs"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await connectToDatabase()
  const { projectId } = await params

  // Verify access
  const request = await AuditRequest.findById(projectId).lean()
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const user = await User.findOne({ clerkUserId: userId }).lean()
  const hasAccess =
    user?.role === "admin" ||
    request.customerId === userId ||
    (request.orgMembers ?? []).includes(userId)
  if (!hasAccess) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Get the report type from query param
  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get("type") ?? "summary" // "summary" | "wcag"
  const wcagLevel = searchParams.get("level") ?? "AA"

  // Build the URL to screenshot
  const origin = req.headers.get("origin") ?? req.headers.get("x-forwarded-host")
    ? `https://${req.headers.get("x-forwarded-host")}`
    : "http://localhost:3000"

  const reportUrl = reportType === "wcag"
    ? `${origin}/dashboard/reports/${projectId}/wcag?level=${wcagLevel}&print=1`
    : `${origin}/dashboard/reports/${projectId}/summary?print=1`

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  })

  try {
    const page = await browser.newPage()

    // Pass auth cookies so the report page renders with data
    const cookieHeader = req.headers.get("cookie") ?? ""
    const cookies = cookieHeader.split(";").map((c) => {
      const [name, ...rest] = c.trim().split("=")
      return { name: name.trim(), value: rest.join("="), domain: "localhost" }
    }).filter((c) => c.name && c.value)

    if (cookies.length > 0) {
      await page.setCookie(...cookies)
    }

    await page.goto(reportUrl, { waitUntil: "networkidle0", timeout: 30000 })

    // Wait for loading state to resolve
    await page.waitForSelector("[data-report-ready]", { timeout: 15000 }).catch(() => {})

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "1.5cm", right: "1.5cm", bottom: "1.5cm", left: "1.5cm" },
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:9px;color:#666;width:100%;text-align:center;padding-top:5px;">
        AttestHub Accessibility Audit Report
      </div>`,
      footerTemplate: `<div style="font-size:9px;color:#666;width:100%;text-align:center;padding-bottom:5px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`,
    })

    const filename = `${request.projectName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${reportType}-report.pdf`

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdf.length.toString(),
      },
    })
  } finally {
    await browser.close()
  }
}
