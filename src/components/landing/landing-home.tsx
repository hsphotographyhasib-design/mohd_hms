'use client'

import { PublicLayout } from './public-layout'
import { HeroSection, SectorsStrip } from './sections'

export function LandingHome({ onSignIn }: { onSignIn: () => void }) {
  return (
    <PublicLayout onSignIn={onSignIn}>
      <HeroSection />
      <SectorsStrip />
    </PublicLayout>
  )
}