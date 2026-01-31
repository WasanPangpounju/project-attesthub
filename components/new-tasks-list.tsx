import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Calendar, DollarSign, Globe, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  name: string
  type: "Web" | "App"
  deadline: string
  reward: string
  description: string
  priority: "high" | "medium" | "low"
}

interface NewTasksListProps {
  tasks: Task[]
}

export function NewTasksList({ tasks }: NewTasksListProps) {
  const getPriorityStyles = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "border-destructive bg-destructive/10"
      case "medium":
        return "border-accent bg-accent/10"
      case "low":
        return "border-muted-foreground bg-muted"
      default:
        return ""
    }
  }

  const getPriorityLabel = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "High Priority"
      case "medium":
        return "Medium Priority"
      case "low":
        return "Low Priority"
      default:
        return priority
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => {
        const TaskIcon = task.type === "Web" ? Globe : Smartphone
        const deadlineDate = new Date(task.deadline).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })

        return (
          <Card
            key={task.id}
            className={cn("flex flex-col border-2 transition-all hover:shadow-lg", getPriorityStyles(task.priority))}
          >
            <CardHeader className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      task.type === "Web"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground",
                    )}
                    aria-hidden="true"
                  >
                    <TaskIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div
                      className="mb-1 inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                      style={{
                        backgroundColor: task.type === "Web" ? "var(--color-primary)" : "var(--color-secondary)",
                        color:
                          task.type === "Web" ? "var(--color-primary-foreground)" : "var(--color-secondary-foreground)",
                      }}
                      role="status"
                      aria-label={`Task type: ${task.type}`}
                    >
                      <span>{task.type}</span>
                    </div>
                  </div>
                </div>
                {task.priority === "high" && (
                  <AlertCircle className="h-6 w-6 flex-shrink-0 text-destructive" aria-label="High priority task" />
                )}
              </div>

              <CardTitle className="text-xl font-bold leading-tight text-foreground">{task.name}</CardTitle>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col space-y-4 pb-6">
              <p className="text-base leading-relaxed text-foreground">{task.description}</p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-base">
                  <Calendar className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">Due:</span>
                  <time dateTime={task.deadline} className="font-semibold text-foreground">
                    {deadlineDate}
                  </time>
                </div>

                <div className="flex items-center gap-3 text-base">
                  <DollarSign className="h-5 w-5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">Reward:</span>
                  <span className="text-xl font-bold text-success">{task.reward}</span>
                </div>
              </div>

              <Button
                size="lg"
                className="mt-auto min-h-[3.5rem] w-full text-base font-semibold"
                aria-label={`Accept task: ${task.name}`}
              >
                Accept Task
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
