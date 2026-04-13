"use client"

import { useState } from "react"
import { Monitor, Smartphone, Home } from "lucide-react"
import type { ElementType } from "react"

const iconMap: Record<string, ElementType> = {
  Monitor,
  Smartphone,
  Home,
}

interface Service {
  icon: string
  title: string
  description: string
}

export function ServiceCards({ services }: { services: Service[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div className="mt-14 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {services.map((service, index) => {
        const featured = index === 1
        const hovered = hoveredIndex === index
        const Icon = iconMap[service.icon] ?? Monitor
        return (
          <div
            key={index}
            className="min-w-0 flex flex-col"
            style={{
              borderRadius: "16px",
              padding: "1.5rem",
              backgroundColor: featured ? "#1A7A6E" : "#FAFAF8",
              ...(!featured ? { borderLeft: "4px solid #1A7A6E" } : {borderLeft: "4px solid #FAFAFA"}),
              transition: "all 0.25s ease",
              ...(hovered ? { boxShadow: featured ? "0 8px 24px rgba(0,0,0,0.15)" : "0 8px 24px rgba(0,0,0,0.1)", transform: "translateY(-4px)" } : {}),
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className="mb-5 flex items-center justify-center"
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: featured ? "rgba(255,255,255,0.15)" : "#E1F5EE",
              }}
            >
              <Icon
                className="h-6 w-6"
                style={{ color: featured ? "white" : "#0F6E56" }}
                aria-hidden="true"
              />
            </div>
            <h3
              className="mb-3"
              style={{ fontSize: "15px", fontWeight: 500, color: featured ? "white" : "#0a2e28" }}
            >
              {service.title}
            </h3>
            <p
              className="flex-1"
              style={{ fontSize: "13px", lineHeight: 1.6, color: featured ? "rgba(255,255,255,0.8)" : "#4a6b65" }}
            >
              {service.description}
            </p>
            <a
              href="#"
              className="mt-4 text-sm font-medium"
              style={{ color: featured ? "#F5C518" : "#0F6E56" }}
            >
              Learn more →
            </a>
          </div>
        )
      })}
    </div>
  )
}
