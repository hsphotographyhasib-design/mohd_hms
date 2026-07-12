'use client'

import { PublicLayout } from './public-layout'
import { LandingDataProvider } from './use-landing-data'
import {
  HeroSection,
  SectorsStrip,
  AboutSection,
  ServicesSection,
  IndustriesSection,
  SystemSection,
  WorkflowSection,
  ProjectsSection,
  PortalSection,
  DigitalSection,
  TeamSection,
  TestimonialsSection,
  BlogSection,
  CareersSection,
  ContactSection,
} from './sections'

export function LandingHome({ onSignIn }: { onSignIn: () => void }) {
  return (
    <LandingDataProvider>
      <PublicLayout onSignIn={onSignIn}>
        <HeroSection />
        <SectorsStrip />
        <AboutSection />
        <ServicesSection />
        <IndustriesSection />
        <SystemSection />
        <WorkflowSection />
        <ProjectsSection />
        <PortalSection />
        <DigitalSection />
        <TeamSection />
        <TestimonialsSection />
        <BlogSection />
        <CareersSection />
        <ContactSection />
      </PublicLayout>
    </LandingDataProvider>
  )
}