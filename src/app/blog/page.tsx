'use client'
import { PublicLayout } from '@/components/landing/public-layout'
import { BlogSection } from '@/components/landing/sections'
import { useAuthStore } from '@/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function BlogPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (isAuthenticated) router.replace('/') }, [isAuthenticated, router])
  return <PublicLayout><BlogSection /></PublicLayout>
}