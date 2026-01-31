import { DashboardLayout } from "@/components/dashboard-layout"
import { CurrentTaskCard } from "@/components/current-task-card"
import { NewTasksList } from "@/components/new-tasks-list"

export default function DashboardPage() {
  // Mock data - in real app, fetch from API
  const testerName = "Alex Johnson"

  const currentTask = {
    id: "task-001",
    website: "EcoCommerce Shop",
    url: "https://ecocommerce-demo.vercel.app",
    taskType: "Web",
    description: "Test checkout flow and payment accessibility",
    deadline: "2026-01-08",
  }

  const newTasks = [
    {
      id: "task-002",
      name: "HealthTracker Mobile App",
      type: "App",
      deadline: "2026-01-10",
      reward: "$85",
      description: "Test navigation and screen reader compatibility",
      priority: "high",
    },
    {
      id: "task-003",
      name: "BudgetPlanner Dashboard",
      type: "Web",
      deadline: "2026-01-12",
      reward: "$65",
      description: "Evaluate keyboard navigation and form controls",
      priority: "medium",
    },
    {
      id: "task-004",
      name: "FitnessCoach App",
      type: "App",
      deadline: "2026-01-15",
      reward: "$90",
      description: "Test video player controls and captions",
      priority: "medium",
    },
    {
      id: "task-005",
      name: "RecipeHub Website",
      type: "Web",
      deadline: "2026-01-18",
      reward: "$55",
      description: "Review color contrast and readability",
      priority: "low",
    },
  ]

  return (
    <DashboardLayout testerName={testerName}>
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>

      <main id="main-content" className="flex-1 p-6 lg:p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">Tester Dashboard</h1>
            <p className="text-lg text-muted-foreground">Manage your accessibility testing tasks and submissions</p>
          </div>

          {/* Current Task Section */}
          <section aria-labelledby="current-task-heading">
            <h2 id="current-task-heading" className="mb-4 text-2xl font-semibold text-foreground">
              Current Task
            </h2>
            <CurrentTaskCard task={currentTask} />
          </section>

          {/* New Tasks Section */}
          <section aria-labelledby="new-tasks-heading">
            <h2 id="new-tasks-heading" className="mb-4 text-2xl font-semibold text-foreground">
              New Tasks Available
            </h2>
            <NewTasksList tasks={newTasks} />
          </section>
        </div>
      </main>
    </DashboardLayout>
  )
}
