'use client'
import { PublicLayout } from '@/landing/components/public-layout'
import { ContactSection } from '@/landing/components/sections'
import { useAuthStore } from '@/app-shell/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ContactPage() {
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  useEffect(() => { if (isAuthenticated) router.replace('/') }, [isAuthenticated, router])
  return <PublicLayout><ContactSection /></PublicLayout>
}