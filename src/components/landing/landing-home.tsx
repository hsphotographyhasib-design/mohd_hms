'use client'

import { PublicLayout } from './public-layout'
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
  SupportSection,
} from './sections'

export function LandingHome({ onSignIn }: { onSignIn: () => void }) {
  return (
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
      <SupportSection />
    </PublicLayout>
  )
}