'use client'
import { PublicLayout } from '@/components/landing/public-layout'
import { CareersSection } from '@/components/landing/sections'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CareersPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (isAuthenticated) router.replace('/') }, [isAuthenticated, router])
  return <PublicLayout><CareersSection /></PublicLayout>
}