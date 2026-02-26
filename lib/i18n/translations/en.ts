const en = {
  nav: {
    home: "Home",
    features: "Features",
    pricing: "Pricing",
    about: "About",
    login: "Login",
    getStarted: "Get Started",
    dashboard: "Dashboard",
  },
  hero: {
    title: "Accessibility Testing for Everyone",
    subtitle: "Connect with expert testers who understand real-world accessibility challenges. Get comprehensive WCAG audits that make your product inclusive.",
    ctaPrimary: "Start Your Audit",
    ctaSecondary: "Learn More",
  },
  features: {
    title: "Everything You Need for Accessibility Compliance",
    subtitle: "A complete platform for managing accessibility audits, tracking issues, and delivering results.",
  },
  dashboard: {
    welcome: "Welcome",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
  },
  status: {
    pending: "Pending",
    inProgress: "In Progress",
    completed: "Completed",
    approved: "Approved",
    rejected: "Rejected",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    language: "Language",
    submit: "Submit",
    upload: "Upload",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    back: "Back",
  },
} as const

export default en
export type Translations = typeof en
