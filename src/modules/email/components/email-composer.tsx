'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/shared/ui/sheet'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover'
import { Badge } from '@/shared/ui/badge'
import { Separator } from '@/shared/ui/separator'
import { Label } from '@/shared/ui/label'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group'
import { Calendar } from '@/shared/ui/calendar'
import { RichTextEditor, getPlainText } from './rich-text-editor'
import { cn } from '@/core/utils/utils'
import { toast } from 'sonner'
import {
  X,
  Send,
  Clock,
  Paperclip,
  Upload,
  FileText,
  ChevronDown,
  Loader2,
  Search,
  User,
  Building2,
  Phone,
  Mail,
  FileSpreadsheet,
  ClipboardList,
} from 'lucide-react'

// --- Types ---

interface Attachment {
  id: string
  name: string
  url?: string
  type: 'file' | 'quotation' | 'invoice' | 'work-order'
  file?: File
  referenceId?: string
}

interface CustomerSearchResult {
  id: string
  name: string
  email: string
  company?: string
  phone?: string
}

interface EmailTemplate {
  id: string
  name: string
  subject?: string
  bodyHtml?: string
}

interface Recipient {
  email: string
  name?: string
  customerId?: string
}

// --- Component Props ---

export interface EmailComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillTo?: string
  prefillSubject?: string
  prefillBody?: string
  prefillModule?: string
  prefillCustomerId?: string
  prefillAttachments?: Array<{ name: string; url: string; type: string }>
  onSent?: () => void
}

// --- Helper ---

function generateId() {
  return Math.random().toString(36).substring(2, 11)
}

// --- Main Component ---

export function EmailComposer({
  open,
  onOpenChange,
  prefillTo,
  prefillSubject,
  prefillBody,
  prefillModule,
  prefillCustomerId,
  prefillAttachments,
  onSent,
}: EmailComposerProps) {
  // State
  const [toRecipients, setToRecipients] = useState<Recipient[]>([])
  const [toInput, setToInput] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [replyTo, setReplyTo] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [showReplyTo, setShowReplyTo] = useState(false)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [category, setCategory] = useState<
    'general' | 'notification' | 'marketing' | 'transactional'
  >('general')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined)
  const [scheduledTime, setScheduledTime] = useState('09:00')
  const [sending, setSending] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Customer search
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  // Templates
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close search on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Pre-fill on open
  useEffect(() => {
    if (open) {
      if (prefillTo) {
        // Check if it looks like an email
        if (prefillTo.includes('@')) {
          setToRecipients([{ email: prefillTo }])
        } else {
          setToInput(prefillTo)
        }
      }
      if (prefillSubject) setSubject(prefillSubject)
      if (prefillBody) setBodyHtml(prefillBody)
      if (prefillAttachments && prefillAttachments.length > 0) {
        setAttachments(
          prefillAttachments.map((a) => ({
            id: generateId(),
            name: a.name,
            url: a.url,
            type: 'file' as const,
          }))
        )
      }
      fetchTemplates()
    } else {
      // Reset on close
      setToRecipients([])
      setToInput('')
      setCc('')
      setBcc('')
      setReplyTo('')
      setShowCc(false)
      setShowBcc(false)
      setShowReplyTo(false)
      setSubject('')
      setBodyHtml('')
      setPriority('normal')
      setCategory('general')
      setAttachments([])
      setScheduleMode('now')
      setScheduledDate(undefined)
      setScheduledTime('09:00')
      setSelectedTemplate('')
    }
    }, [open])

  // Fetch templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/email/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || data || [])
      }
    } catch {
      // Silently fail - templates are optional
    } finally {
      setLoadingTemplates(false)
    }
  }

  // Customer search with debounce
  const handleToInputChange = useCallback((value: string) => {
    setToInput(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.length < 2) {
      setCustomerResults([])
      setShowSearch(false)
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/email/customers/search?q=${encodeURIComponent(value)}`
        )
        if (res.ok) {
          const data = await res.json()
          setCustomerResults(data.customers || data || [])
          setShowSearch(true)
        }
      } catch {
        // Silently fail
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  // Add recipient from search
  const addRecipient = (customer: CustomerSearchResult) => {
    if (!toRecipients.find((r) => r.email === customer.email)) {
      setToRecipients((prev) => [
        ...prev,
        {
          email: customer.email,
          name: customer.name,
          customerId: customer.id,
        },
      ])
    }
    setToInput('')
    setShowSearch(false)
    setCustomerResults([])
  }

  // Add recipient from manual input (comma or Enter)
  const addManualRecipient = (emailStr: string) => {
    const parts = emailStr
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean)

    const newRecipients: Recipient[] = []
    for (const part of parts) {
      const emailMatch = part.match(/<(.+@.+\..+)>/)
      const email = emailMatch ? emailMatch[1] : part
      if (email.includes('@') && !toRecipients.find((r) => r.email === email)) {
        const nameMatch = part.match(/^(.+?)\s*<.+@.+\..+>$/)
        newRecipients.push({
          email,
          name: nameMatch ? nameMatch[1].trim() : undefined,
        })
      }
    }
    if (newRecipients.length > 0) {
      setToRecipients((prev) => [...prev, ...newRecipients])
    }
    setToInput('')
  }

  const removeRecipient = (email: string) => {
    setToRecipients((prev) => prev.filter((r) => r.email !== email))
  }

  const handleToKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      addManualRecipient(toInput)
    }
    if (e.key === 'Backspace' && toInput === '' && toRecipients.length > 0) {
      removeRecipient(toRecipients[toRecipients.length - 1].email)
    }
  }

  // Attachment handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: generateId(),
      name: file.name,
      type: 'file' as const,
      file,
    }))
    setAttachments((prev) => [...prev, ...newAttachments])
    e.target.value = ''
  }

  const attachModuleDocument = (type: 'quotation' | 'invoice' | 'work-order') => {
    const labels = {
      quotation: 'Latest Quotation',
      invoice: 'Latest Invoice',
      'work-order': 'Latest Work Order',
    }
    const existing = attachments.find((a) => a.type === type)
    if (existing) {
      toast.info(`${labels[type]} is already attached`)
      return
    }
    setAttachments((prev) => [
      ...prev,
      {
        id: generateId(),
        name: labels[type],
        type,
      },
    ])
    toast.success(`${labels[type]} will be attached on send`)
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  // Template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      if (template.subject) setSubject(template.subject)
      if (template.bodyHtml) setBodyHtml(template.bodyHtml)
    }
  }

  // Build form data for submission
  const buildPayload = () => {
    const toEmails = toRecipients.map((r) => r.email).join(',')
    const bodyText = getPlainText(bodyHtml)
    const moduleAttachments = attachments
      .filter((a) => a.type !== 'file')
      .map((a) => ({
        type: a.type,
        referenceId: a.referenceId,
        name: a.name,
      }))

    let scheduledFor: string | null = null
    if (scheduleMode === 'schedule' && scheduledDate) {
      const [hours, minutes] = scheduledTime.split(':').map(Number)
      const dt = new Date(scheduledDate)
      dt.setHours(hours, minutes, 0, 0)
      scheduledFor = dt.toISOString()
    }

    const formData = new FormData()
    formData.append('to', toEmails)
    if (cc.trim()) formData.append('cc', cc.trim())
    if (bcc.trim()) formData.append('bcc', bcc.trim())
    formData.append('subject', subject)
    formData.append('bodyHtml', bodyHtml)
    formData.append('bodyText', bodyText)
    if (replyTo.trim()) formData.append('replyTo', replyTo.trim())
    formData.append('priority', priority)
    formData.append('category', category)
    if (scheduledFor) formData.append('scheduledFor', scheduledFor)
    if (prefillModule) formData.append('module', prefillModule)
    if (prefillCustomerId) formData.append('customerId', prefillCustomerId)

    // File attachments
    const fileAttachments = attachments.filter((a) => a.type === 'file' && a.file)
    fileAttachments.forEach((a, i) => {
      if (a.file) {
        formData.append(`attachments`, a.file, a.name)
      }
    })

    // Module attachments metadata
    if (moduleAttachments.length > 0) {
      formData.append(
        'metadata',
        JSON.stringify({ moduleAttachments })
      )
    }

    return formData
  }

  // Submit handler
  const handleSubmit = async (mode: 'send' | 'schedule') => {
    // Validation
    if (toRecipients.length === 0 && !toInput.includes('@')) {
      toast.error('Please add at least one recipient')
      return
    }
    if (toInput.includes('@') && toInput.length > 3) {
      addManualRecipient(toInput)
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject')
      return
    }
    if (!bodyHtml.trim() || bodyHtml === '<p></p>') {
      toast.error('Please write an email body')
      return
    }
    if (mode === 'schedule' && !scheduledDate) {
      toast.error('Please select a schedule date')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/email/compose', {
        method: 'POST',
        body: buildPayload(),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(
          errorData?.error || errorData?.message || 'Failed to send email'
        )
      }

      if (mode === 'send') {
        toast.success('📧 Email Sent Successfully')
      } else {
        toast.success('📅 Email Scheduled')
      }
      onSent?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to send email'
      )
    } finally {
      setSending(false)
    }
  }

  // --- Render ---

  const toFieldLabel = (
    <span className="flex items-center gap-2 text-sm text-muted-foreground min-w-[40px]">
      To
    </span>
  )

  const recipientChips = toRecipients.map((r) => (
    <Badge
      key={r.email}
      variant="secondary"
      className="flex items-center gap-1.5 pr-1 py-1"
    >
      <span className="max-w-[140px] truncate">{r.email}</span>
      {r.name && (
        <span className="text-muted-foreground text-[10px] max-w-[80px] truncate">
          ({r.name})
        </span>
      )}
      <button
        type="button"
        onClick={() => removeRecipient(r.email)}
        className="ml-0.5 hover:bg-foreground/10 rounded-full p-0.5 transition-colors"
      >
        <X className="size-3" />
      </button>
    </Badge>
  ))

  const toField = (
    <div className="flex items-start gap-2">
      {toFieldLabel}
      <div className="flex-1 relative" ref={searchRef}>
        <div className="flex flex-wrap items-center gap-1.5 border border-gray-300 rounded-md bg-white px-2 py-1.5 min-h-[38px] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/50 transition-all">
          {recipientChips}
          <input
            type="text"
            value={toInput}
            onChange={(e) => handleToInputChange(e.target.value)}
            onKeyDown={handleToKeyDown}
            onBlur={() => {
              if (toInput.includes('@') && toInput.length > 3) {
                addManualRecipient(toInput)
              }
            }}
            placeholder={
              toRecipients.length === 0
                ? 'Search customers or type email...'
                : 'Add more...'
            }
            className="flex-1 min-w-[150px] outline-none text-sm bg-transparent placeholder:text-muted-foreground"
          />
          {searching && (
            <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />
          )}
        </div>

        {/* Customer search dropdown */}
        {showSearch && customerResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {customerResults.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
                onClick={() => addRecipient(customer)}
              >
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="size-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {customer.name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="size-3 shrink-0" />
                        {customer.email}
                      </span>
                      {customer.company && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="size-3 shrink-0" />
                          {customer.company}
                        </span>
                      )}
                    </div>
                    {customer.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="size-3 shrink-0" />
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const collapsibleFields = (
    <div className="space-y-2">
      {/* CC / BCC / Reply-To toggles */}
      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          className={cn(
            'hover:underline transition-colors',
            showCc ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
          onClick={() => setShowCc(!showCc)}
        >
          CC
        </button>
        <button
          type="button"
          className={cn(
            'hover:underline transition-colors',
            showBcc ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
          onClick={() => setShowBcc(!showBcc)}
        >
          BCC
        </button>
        <button
          type="button"
          className={cn(
            'hover:underline transition-colors',
            showReplyTo ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
          onClick={() => setShowReplyTo(!showReplyTo)}
        >
          Reply-To
        </button>
      </div>

      {/* CC field */}
      {showCc && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground min-w-[40px]">CC</span>
          <Input
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="cc@example.com, cc2@example.com"
            className="flex-1"
          />
        </div>
      )}

      {/* BCC field */}
      {showBcc && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground min-w-[40px]">
            BCC
          </span>
          <Input
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="bcc@example.com"
            className="flex-1"
          />
        </div>
      )}

      {/* Reply-To field */}
      {showReplyTo && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground min-w-[40px]">
            Reply-To
          </span>
          <Input
            value={replyTo}
            onChange={(e) => setReplyTo(e.target.value)}
            placeholder="replyto@example.com"
            className="flex-1"
          />
        </div>
      )}
    </div>
  )

  const subjectField = (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground min-w-[40px]">
        Subject
      </span>
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Email subject"
        className="flex-1"
      />
    </div>
  )

  const templateSelector = (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground min-w-[64px] shrink-0">
        Template
      </Label>
      <Select
        value={selectedTemplate}
        onValueChange={handleTemplateSelect}
      >
        <SelectTrigger className="flex-1">
          <SelectValue
            placeholder={
              loadingTemplates
                ? 'Loading templates...'
                : 'Choose a template...'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {templates.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
          {templates.length === 0 && !loadingTemplates && (
            <SelectItem value="__none" disabled>
              No templates available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
    </div>
  )

  const metaRow = (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex items-center gap-2 flex-1">
        <Label className="text-sm text-muted-foreground min-w-[64px] shrink-0">
          Priority
        </Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 flex-1">
        <Label className="text-sm text-muted-foreground min-w-[64px] shrink-0">
          Category
        </Label>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="notification">Notification</SelectItem>
            <SelectItem value="marketing">Marketing</SelectItem>
            <SelectItem value="transactional">Transactional</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const attachmentsSection = (
    <div className="space-y-2">
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((att) => (
            <Badge
              key={att.id}
              variant="outline"
              className="flex items-center gap-1.5 pr-1 py-1.5 text-xs"
            >
              {att.type === 'quotation' && <FileSpreadsheet className="size-3.5" />}
              {att.type === 'invoice' && <FileText className="size-3.5" />}
              {att.type === 'work-order' && <ClipboardList className="size-3.5" />}
              {att.type === 'file' && <Paperclip className="size-3.5" />}
              <span className="max-w-[180px] truncate">{att.name}</span>
              {att.type !== 'file' && (
                <span className="text-[10px] text-muted-foreground">(auto)</span>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(att.id)}
                className="ml-0.5 hover:bg-foreground/10 rounded-full p-0.5 transition-colors"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Attach button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Paperclip className="size-4" />
            Attach Document
            <ChevronDown className="size-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="space-y-1">
            <label className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors text-sm">
              <Upload className="size-4 text-muted-foreground" />
              Upload File
              <input
                type="file"
                className="hidden"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                onChange={handleFileUpload}
              />
            </label>
            <Separator />
            <button
              type="button"
              className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm text-left"
              onClick={() => attachModuleDocument('quotation')}
            >
              <FileSpreadsheet className="size-4 text-muted-foreground" />
              Latest Quotation
            </button>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm text-left"
              onClick={() => attachModuleDocument('invoice')}
            >
              <FileText className="size-4 text-muted-foreground" />
              Latest Invoice
            </button>
            <button
              type="button"
              className="flex items-center gap-2 w-full px-2 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm text-left"
              onClick={() => attachModuleDocument('work-order')}
            >
              <ClipboardList className="size-4 text-muted-foreground" />
              Latest Work Order
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )

  const scheduleSection = (
    <div className="space-y-3">
      <RadioGroup
        value={scheduleMode}
        onValueChange={(v) => setScheduleMode(v as 'now' | 'schedule')}
        className="flex gap-4"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="now" id="schedule-now" />
          <Label htmlFor="schedule-now" className="cursor-pointer font-normal">
            Send Now
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="schedule" id="schedule-later" />
          <Label htmlFor="schedule-later" className="cursor-pointer font-normal">
            Schedule
          </Label>
        </div>
      </RadioGroup>

      {scheduleMode === 'schedule' && (
        <div className="flex flex-col sm:flex-row gap-3 pl-6">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'justify-start text-left font-normal',
                  !scheduledDate && 'text-muted-foreground'
                )}
              >
                <Calendar className="size-4 mr-2" />
                {scheduledDate
                  ? scheduledDate.toLocaleDateString()
                  : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduledDate}
                onSelect={setScheduledDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="w-full sm:w-32"
          />
        </div>
      )}
    </div>
  )

  const footerContent = (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 pt-2">
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenChange(false)}
        disabled={sending}
        className="flex-1 sm:flex-none"
      >
        Discard
      </Button>
      <div className="flex gap-2">
        {scheduleMode === 'schedule' && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit('schedule')}
            disabled={sending}
            className="gap-2"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Clock className="size-4" />
            )}
            Schedule
          </Button>
        )}
        <Button
          type="button"
          onClick={() => handleSubmit('send')}
          disabled={sending}
          className="gap-2 flex-1 sm:flex-none"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Send
        </Button>
      </div>
    </div>
  )

  // --- Compose Body (shared between Dialog and Sheet) ---

  const composeBody = (
    <div className="space-y-4">
      {/* To */}
      {toField}

      {/* CC / BCC / Reply-To */}
      {collapsibleFields}

      <Separator />

      {/* Subject */}
      {subjectField}

      {/* Template */}
      {templates.length > 0 && templateSelector}

      {/* Rich Text Editor */}
      <RichTextEditor
        content={bodyHtml}
        onChange={setBodyHtml}
        placeholder="Write your email here..."
      />

      <Separator />

      {/* Meta: Priority, Category */}
      {metaRow}

      <Separator />

      {/* Attachments */}
      {attachmentsSection}

      <Separator />

      {/* Schedule */}
      {scheduleSection}

      {/* Footer */}
      {footerContent}
    </div>
  )

  // --- Desktop: Dialog ---

  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle className="text-xl">Compose Email</DialogTitle>
            <DialogDescription>
              Write and send an email to your customers
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="py-4">{composeBody}</div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )
  }

  // --- Mobile: Sheet ---

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-0 flex-row items-center justify-between space-y-0">
          <div>
            <SheetTitle className="text-lg">Compose Email</SheetTitle>
            <SheetDescription className="text-xs">
              Write and send an email
            </SheetDescription>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="py-4">{composeBody}</div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}