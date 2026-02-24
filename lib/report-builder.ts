import User from "@/models/User"
import AuditRequest from "@/models/audit-request"
import Scenario from "@/models/scenario"
import TestCase from "@/models/test-case"
import { WCAG_CRITERIA, WcagLevel } from "@/lib/wcag-criteria"
import type { ReportData } from "@/types/report"

const LEVEL_ORDER: Record<WcagLevel, number> = { A: 1, AA: 2, AAA: 3 }

function parseReportLevel(standard: string): WcagLevel {
  if (standard.includes("AAA")) return "AAA"
  if (standard.includes("AA")) return "AA"
  return "A"
}

interface CriterionEntry {
  id: string
  title: string
  level: string
  status: "pass" | "fail" | "not_tested"
  testCases: { id: string; title: string; result: string }[]
  recommendations: { title: string; severity: string; howToFix: string }[]
}

type TCStatus = "pass" | "fail" | "skip" | "pending"

export async function buildReportData(projectId: string): Promise<ReportData> {
  const project = await AuditRequest.findById(projectId).lean()
  if (!project) throw new Error("Project not found")

  // Fetch scenarios sorted by order
  const scenarios = await Scenario.find({ auditRequestId: projectId }).sort({ order: 1 }).lean()

  // Fetch all test cases for this project
  const allTestCases = await TestCase.find({ auditRequestId: projectId }).sort({ order: 1 }).lean()

  // Build tester name map
  const testerIds = [...new Set(scenarios.map((s) => s.assignedTesterId).filter(Boolean))]
  const testerUsers = await User.find({ clerkUserId: { $in: testerIds } }).lean()
  const testerNameMap: Record<string, string> = {}
  for (const t of testerUsers) {
    const name = [t.firstName, t.lastName].filter(Boolean).join(" ").trim()
    testerNameMap[t.clerkUserId] = name || t.email || t.clerkUserId
  }

  // Compute summary
  let pass = 0, fail = 0, skip = 0, pending = 0
  let criticalCount = 0, highCount = 0, mediumCount = 0, lowCount = 0

  for (const tc of allTestCases) {
    const lastResult = tc.results?.[tc.results.length - 1]
    const status = lastResult?.status ?? "pending"
    if (status === "pass") pass++
    else if (status === "fail") fail++
    else if (status === "skip") skip++
    else pending++

    for (const rec of tc.recommendations ?? []) {
      if (rec.severity === "critical") criticalCount++
      else if (rec.severity === "high") highCount++
      else if (rec.severity === "medium") mediumCount++
      else if (rec.severity === "low") lowCount++
    }
  }

  const totalTestCases = allTestCases.length
  const passRate = totalTestCases > 0 ? Math.round((pass / totalTestCases) * 100) : 0
  const totalRecommendations = criticalCount + highCount + mediumCount + lowCount

  // Build scenarios output
  const tcByScenario: Record<string, typeof allTestCases> = {}
  for (const tc of allTestCases) {
    const sid = String(tc.scenarioId)
    if (!tcByScenario[sid]) tcByScenario[sid] = []
    tcByScenario[sid].push(tc)
  }

  const scenariosOut = scenarios.map((s) => {
    const tcs = tcByScenario[String(s._id)] ?? []
    return {
      _id: String(s._id),
      title: s.title,
      order: s.order,
      testerName: testerNameMap[s.assignedTesterId] ?? s.assignedTesterId,
      testCases: tcs.map((tc) => {
        const lastResult = tc.results?.[tc.results.length - 1]
        const resultStatus: "pass" | "fail" | "skip" | "pending" = lastResult?.status ?? "pending"
        let testerName: string | undefined
        if (lastResult?.testerId) {
          testerName = testerNameMap[lastResult.testerId]
        }
        return {
          _id: String(tc._id),
          title: tc.title,
          description: tc.description,
          order: tc.order,
          priority: tc.priority,
          wcagCriteria: tc.wcagCriteria ?? [],
          expectedResult: tc.expectedResult,
          steps: (tc.steps ?? []).map((step) => ({
            order: step.order,
            instruction: step.instruction,
          })),
          result: {
            status: resultStatus,
            note: lastResult?.note,
            attachments: (lastResult?.attachments ?? []).map((a) => ({
              name: a.name,
              url: a.url,
              type: a.type,
            })),
            testedAt: lastResult?.testedAt ? String(lastResult.testedAt) : undefined,
            testerName,
          },
          recommendations: (tc.recommendations ?? []).map((r) => ({
            _id: String(r._id),
            title: r.title,
            description: r.description,
            severity: r.severity,
            howToFix: r.howToFix,
            technique: r.technique,
            referenceUrl: r.referenceUrl,
            codeSnippet: r.codeSnippet,
          })),
        }
      }),
    }
  })

  // Build WCAG report
  const reportLevel = parseReportLevel(project.accessibilityStandard ?? "")
  const reportLevelOrder = LEVEL_ORDER[reportLevel]

  const criteriaInScope = WCAG_CRITERIA.filter(
    (c) => LEVEL_ORDER[c.level] <= reportLevelOrder
  )

  const criterionMap: Record<string, CriterionEntry> = {}
  for (const c of criteriaInScope) {
    criterionMap[c.id] = {
      id: c.id,
      title: c.title,
      level: c.level,
      status: "not_tested",
      testCases: [],
      recommendations: [],
    }
  }

  for (const tc of allTestCases) {
    const wcag = tc.wcagCriteria ?? []
    if (wcag.length === 0) continue

    const lastResult = tc.results?.[tc.results.length - 1]
    const tcStatus: TCStatus = lastResult?.status ?? "pending"

    for (const criterionId of wcag) {
      if (!criterionMap[criterionId]) continue
      const entry = criterionMap[criterionId]
      entry.testCases.push({
        id: String(tc._id),
        title: tc.title,
        result: tcStatus,
      })
      for (const rec of tc.recommendations ?? []) {
        entry.recommendations.push({
          title: rec.title,
          severity: rec.severity,
          howToFix: rec.howToFix,
        })
      }
    }
  }

  for (const entry of Object.values(criterionMap)) {
    if (entry.testCases.length === 0) {
      entry.status = "not_tested"
    } else if (entry.testCases.some((tc) => tc.result === "fail")) {
      entry.status = "fail"
    } else if (entry.testCases.every((tc) => tc.result === "pass")) {
      entry.status = "pass"
    } else {
      entry.status = "not_tested"
    }
  }

  const principleOrder = ["Perceivable", "Operable", "Understandable", "Robust"]
  const principleMap: Record<string, CriterionEntry[]> = {}
  for (const c of criteriaInScope) {
    if (!principleMap[c.principle]) principleMap[c.principle] = []
    principleMap[c.principle].push(criterionMap[c.id])
  }

  const principles = principleOrder
    .filter((p) => principleMap[p])
    .map((p) => ({ name: p, criteria: principleMap[p] }))

  const conformance = {
    A:   { total: 0, pass: 0, fail: 0, not_tested: 0 },
    AA:  { total: 0, pass: 0, fail: 0, not_tested: 0 },
    AAA: { total: 0, pass: 0, fail: 0, not_tested: 0 },
  }
  for (const entry of Object.values(criterionMap)) {
    const lvl = entry.level as WcagLevel
    if (!conformance[lvl]) continue
    conformance[lvl].total++
    if (entry.status === "pass") conformance[lvl].pass++
    else if (entry.status === "fail") conformance[lvl].fail++
    else conformance[lvl].not_tested++
  }

  return {
    project: {
      _id: String(project._id),
      projectName: project.projectName,
      serviceCategory: project.serviceCategory,
      servicePackage: project.servicePackage,
      accessibilityStandard: project.accessibilityStandard,
      targetUrl: project.targetUrl,
      locationAddress: project.locationAddress,
      status: project.status,
      createdAt: String(project.createdAt),
      statusHistory: (project.statusHistory ?? []).map((h) => ({
        from: h.from,
        to: h.to,
        changedAt: String(h.changedAt),
        note: h.note,
      })),
    },
    summary: {
      totalTestCases,
      pass,
      fail,
      skip,
      pending,
      passRate,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      totalRecommendations,
    },
    scenarios: scenariosOut,
    wcagReport: {
      level: reportLevel,
      principles,
      conformance,
    },
    generatedAt: new Date().toISOString(),
  }
}
