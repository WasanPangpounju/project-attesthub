"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  LayoutDashboard,
  Users,
  Network,
  FileText,
  Settings,
  Search,
  UserPlus,
  CheckCircle,
  Menu,
  X,
} from "lucide-react"

// Mock data
const metrics = [
  { title: "Active Audits", value: "24", change: "+12%", icon: LayoutDashboard },
  { title: "Pending Assignments", value: "8", change: "+5%", icon: Users },
  { title: "Completed Reports", value: "142", change: "+28%", icon: FileText },
  { title: "Active Testers", value: "16", change: "+2", icon: Network },
]

const projects = [
  {
    id: 1,
    name: "E-Commerce Platform Audit",
    customer: "TechCorp Inc.",
    tester: "Sarah Johnson",
    aiConfidence: 94,
    status: "In Progress",
  },
  {
    id: 2,
    name: "Banking App Security Review",
    customer: "SecureBank",
    tester: "Michael Chen",
    aiConfidence: 88,
    status: "Reviewing",
  },
  {
    id: 3,
    name: "Healthcare Portal Assessment",
    customer: "MediTech Solutions",
    tester: null,
    aiConfidence: 76,
    status: "Unassigned",
  },
  {
    id: 4,
    name: "Fintech API Penetration Test",
    customer: "PaymentFlow",
    tester: "David Rodriguez",
    aiConfidence: 92,
    status: "Finalized",
  },
  {
    id: 5,
    name: "SaaS Dashboard Vulnerability Scan",
    customer: "CloudMetrics",
    tester: "Emma Williams",
    aiConfidence: 85,
    status: "In Progress",
  },
  {
    id: 6,
    name: "Mobile App Security Audit",
    customer: "AppVentures",
    tester: null,
    aiConfidence: 71,
    status: "Unassigned",
  },
]

const statusColors = {
  Unassigned: "bg-muted text-muted-foreground",
  "In Progress": "bg-chart-1/20 text-chart-1",
  Reviewing: "bg-chart-4/20 text-chart-4",
  Finalized: "bg-chart-2/20 text-chart-2",
}

const navItems = [
  { label: "Project Overview", icon: LayoutDashboard, active: true },
  { label: "Customer Management", icon: Users, active: false },
  { label: "Tester Network", icon: Network, active: false },
  { label: "AI Audit Reports", icon: FileText, active: false },
  { label: "System Settings", icon: Settings, active: false },
]

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.tester && project.tester.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 border-r border-border bg-sidebar transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-sidebar-primary" />
              <span className="text-lg font-semibold text-sidebar-foreground">Attesthub</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    item.active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* User Section */}
          <div className="border-t border-sidebar-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-sidebar-foreground">Admin User</p>
                <p className="text-xs text-sidebar-foreground/70">admin@attesthub.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center gap-4 px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage audits, testers, and reports</p>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <Card key={metric.title} className="bg-card border-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-card-foreground">{metric.title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-card-foreground">{metric.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="text-chart-2">{metric.change}</span> from last month
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <UserPlus className="h-4 w-4" />
              Assign Tester to Project
            </Button>
            <Button variant="outline" className="gap-2 border-border bg-transparent">
              <CheckCircle className="h-4 w-4" />
              Validate AI Report
            </Button>
          </div>

          {/* Recent Projects */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-xl font-semibold text-card-foreground">Recent Projects</CardTitle>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background border-border"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/50">
                      <TableHead className="text-muted-foreground">Project Name</TableHead>
                      <TableHead className="text-muted-foreground">Customer</TableHead>
                      <TableHead className="text-muted-foreground">Assigned Tester</TableHead>
                      <TableHead className="text-muted-foreground">AI Confidence</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className="border-border hover:bg-muted/50 cursor-pointer">
                        <TableCell className="font-medium text-foreground">{project.name}</TableCell>
                        <TableCell className="text-foreground">{project.customer}</TableCell>
                        <TableCell className="text-foreground">
                          {project.tester || <span className="text-muted-foreground italic">Not assigned</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${
                                  project.aiConfidence >= 90
                                    ? "bg-chart-2"
                                    : project.aiConfidence >= 80
                                      ? "bg-chart-1"
                                      : "bg-chart-4"
                                }`}
                                style={{ width: `${project.aiConfidence}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-foreground">{project.aiConfidence}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={statusColors[project.status as keyof typeof statusColors]}
                          >
                            {project.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
