'use client'
import { PublicLayout } from '@/components/landing/public-layout'
import { SupportSection } from '@/components/landing/sections'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SupportPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (isAuthenticated) router.replace('/') }, [isAuthenticated, router])
  return <PublicLayout><SupportSection /></PublicLayout>
}