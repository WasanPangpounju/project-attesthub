import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, FileCheck, Globe, Smartphone } from "lucide-react"

interface CurrentTaskCardProps {
  task: {
    id: string
    website: string
    url: string
    taskType: "Web" | "App"
    description: string
    deadline: string
  }
}

export function CurrentTaskCard({ task }: CurrentTaskCardProps) {
  const TaskIcon = task.taskType === "Web" ? Globe : Smartphone
  const deadlineDate = new Date(task.deadline).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <Card className="border-2 border-primary shadow-lg">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
              <TaskIcon className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">{task.website}</CardTitle>
              <CardDescription className="mt-1 text-base text-muted-foreground">
                {task.taskType} Application Testing
              </CardDescription>
            </div>
          </div>
          <div
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
            role="status"
            aria-label="Task status: In Progress"
          >
            In Progress
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pb-8">
        <div className="space-y-3">
          <p className="text-base leading-relaxed text-foreground">{task.description}</p>

          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <span className="font-medium">Deadline:</span>
            <time dateTime={task.deadline} className="font-semibold text-foreground">
              {deadlineDate}
            </time>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-[3.5rem] flex-1 gap-3 text-base font-semibold">
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${task.website} in a new tab`}
            >
              <ExternalLink className="h-5 w-5" aria-hidden="true" />
              Open Website
            </a>
          </Button>

          <Button asChild variant="secondary" size="lg" className="min-h-[3.5rem] flex-1 gap-3 text-base font-semibold">
            <a href={`/evaluate/${task.id}`}>
              <FileCheck className="h-5 w-5" aria-hidden="true" />
              Open Evaluation Form
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
