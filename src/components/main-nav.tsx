"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      <Link
        href="/"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}
      >
        ホーム
      </Link>
      <Link
        href="/categories"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/categories" ? "text-primary" : "text-muted-foreground"
        )}
      >
        カテゴリ
      </Link>
      <Link
        href="/settings"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/settings" ? "text-primary" : "text-muted-foreground"
        )}
      >
        設定
      </Link>
    </nav>
  )
} 