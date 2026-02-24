export type ReportData = {
  project: {
    _id: string
    projectName: string
    serviceCategory: string
    servicePackage: string
    accessibilityStandard: string
    targetUrl?: string
    locationAddress?: string
    status: string
    createdAt: string
    statusHistory: { from?: string; to: string; changedAt: string; note?: string }[]
  }
  summary: {
    totalTestCases: number
    pass: number
    fail: number
    skip: number
    pending: number
    passRate: number
    criticalCount: number
    highCount: number
    mediumCount: number
    lowCount: number
    totalRecommendations: number
  }
  scenarios: {
    _id: string
    title: string
    order: number
    testerName: string
    testCases: {
      _id: string
      title: string
      description?: string
      order: number
      priority: string
      wcagCriteria: string[]
      expectedResult: string
      steps: { order: number; instruction: string }[]
      result: {
        status: "pass" | "fail" | "skip" | "pending"
        note?: string
        attachments: { name: string; url?: string; type: string }[]
        testedAt?: string
        testerName?: string
      }
      recommendations: {
        _id: string
        title: string
        description: string
        severity: string
        howToFix: string
        technique?: string
        referenceUrl?: string
        codeSnippet?: string
      }[]
    }[]
  }[]
  wcagReport: {
    level: "A" | "AA" | "AAA"
    principles: {
      name: string
      criteria: {
        id: string
        title: string
        level: string
        status: "pass" | "fail" | "not_tested"
        testCases: { id: string; title: string; result: string }[]
        recommendations: { title: string; severity: string; howToFix: string }[]
      }[]
    }[]
    conformance: {
      A:   { total: number; pass: number; fail: number; not_tested: number }
      AA:  { total: number; pass: number; fail: number; not_tested: number }
      AAA: { total: number; pass: number; fail: number; not_tested: number }
    }
  }
  generatedAt: string
}
