'use client'
import { PublicLayout } from '@/components/landing/public-layout'
import { ProjectsSection } from '@/components/landing/sections'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProjectsPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (isAuthenticated) router.replace('/') }, [isAuthenticated, router])
  return <PublicLayout><ProjectsSection /></PublicLayout>
}