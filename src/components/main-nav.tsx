"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useEffect, useState } from "react"
import { LogOut, Home } from "lucide-react"

import { cn } from "@/lib/utils"

export function MainNav() {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center space-x-2">
          <Home className="h-5 w-5" />
          <span className="font-bold">MediaVault</span>
        </Link>

        {isLoggedIn && (
          <Link href="/dashboard">
            <Button variant="ghost">ダッシュボード</Button>
          </Link>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {isLoggedIn ? (
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            サインアウト
          </Button>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>サインアップ</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
} 