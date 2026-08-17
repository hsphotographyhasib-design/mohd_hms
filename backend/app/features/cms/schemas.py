"""
Pydantic schemas for the CMS feature module.

MOHD.HMS ENTERPRISE

Practical schemas for all CMS entities. Uses common base fields to avoid
excessive duplication while still providing clear request/response typing.
"""

from typing import Any

from pydantic import BaseModel, Field


# ── Common list/filter params ──────────────────────────────────────────────────


class CmsListParams(BaseModel):
    """Generic pagination + filter params shared across CMS list endpoints."""
    search: str = Field(default="", description="Search term for text fields")
    status: str = Field(default="", description="Filter by status field")
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=20, ge=1, le=100)


# ── Hero ────────────────────────────────────────────────────────────────────


class CmsHeroCreate(BaseModel):
    headline: str | None = None
    subheadline: str | None = None
    backgroundImage: str | None = None
    backgroundVideo: str | None = None
    cta1Text: str | None = None
    cta1Link: str | None = None
    cta2Text: str | None = None
    cta2Link: str | None = None
    stat1Value: str | None = None
    stat1Label: str | None = None
    stat2Value: str | None = None
    stat2Label: str | None = None
    stat3Value: str | None = None
    stat3Label: str | None = None
    chipText: str | None = None
    chipSubtext: str | None = None
    isActive: bool = True


class CmsHeroUpdate(BaseModel):
    headline: str | None = None
    subheadline: str | None = None
    backgroundImage: str | None = None
    backgroundVideo: str | None = None
    cta1Text: str | None = None
    cta1Link: str | None = None
    cta2Text: str | None = None
    cta2Link: str | None = None
    stat1Value: str | None = None
    stat1Label: str | None = None
    stat2Value: str | None = None
    stat2Label: str | None = None
    stat3Value: str | None = None
    stat3Label: str | None = None
    chipText: str | None = None
    chipSubtext: str | None = None
    isActive: bool | None = None


# ── Services ─────────────────────────────────────────────────────────────────


class CmsServiceCreate(BaseModel):
    name: str = Field(..., min_length=1)
    slug: str | None = None
    description: str | None = None
    image: str | None = None
    icon: str | None = None
    category: str | None = None
    status: str = "draft"
    seoTitle: str | None = None
    seoDescription: str | None = None
    displayOrder: int = 0
    isEnabled: bool = True


class CmsServiceUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    image: str | None = None
    icon: str | None = None
    category: str | None = None
    status: str | None = None
    seoTitle: str | None = None
    seoDescription: str | None = None
    displayOrder: int | None = None
    isEnabled: bool | None = None


# ── Industries ────────────────────────────────────────────────────────────────


class CmsIndustryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    slug: str | None = None
    description: str | None = None
    image: str | None = None
    icon: str | None = None
    status: str = "draft"
    displayOrder: int = 0
    isEnabled: bool = True


class CmsIndustryUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description: str | None = None
    image: str | None = None
    icon: str | None = None
    status: str | None = None
    displayOrder: int | None = None
    isEnabled: bool | None = None


# ── Projects ─────────────────────────────────────────────────────────────────


class CmsProjectCreate(BaseModel):
    title: str = Field(..., min_length=1)
    slug: str | None = None
    description: str | None = None
    client: str | None = None
    image: str | None = None
    category: str | None = None
    status: str = "draft"
    seoTitle: str | None = None
    seoDescription: str | None = None
    displayOrder: int = 0
    isEnabled: bool = True


class CmsProjectUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    description: str | None = None
    client: str | None = None
    image: str | None = None
    category: str | None = None
    status: str | None = None
    seoTitle: str | None = None
    seoDescription: str | None = None
    displayOrder: int | None = None
    isEnabled: bool | None = None


# ── Blogs ────────────────────────────────────────────────────────────────────


class CmsBlogCreate(BaseModel):
    title: str = Field(..., min_length=1)
    slug: str | None = None
    excerpt: str | None = None
    content: str | None = None
    featuredImage: str | None = None
    categoryId: str | None = None
    authorId: str | None = None
    status: str = "draft"
    seoTitle: str | None = None
    seoDescription: str | None = None
    seoKeywords: str | None = None
    isFeatured: bool = False


class CmsBlogUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    excerpt: str | None = None
    content: str | None = None
    featuredImage: str | None = None
    categoryId: str | None = None
    authorId: str | None = None
    status: str | None = None
    seoTitle: str | None = None
    seoDescription: str | None = None
    seoKeywords: str | None = None
    isFeatured: bool | None = None


# ── Testimonials ───────────────────────────────────────────────────────────────


class CmsTestimonialCreate(BaseModel):
    customerName: str = Field(..., min_length=1)
    company: str | None = None
    photo: str | None = None
    rating: int = 5
    comment: str = Field(..., min_length=1)
    status: str = "draft"
    displayOrder: int = 0
    isEnabled: bool = True


class CmsTestimonialUpdate(BaseModel):
    customerName: str | None = None
    company: str | None = None
    photo: str | None = None
    rating: int | None = None
    comment: str | None = None
    status: str | None = None
    displayOrder: int | None = None
    isEnabled: bool | None = None


# ── Careers ───────────────────────────────────────────────────────────────────


class CmsCareerCreate(BaseModel):
    title: str = Field(..., min_length=1)
    department: str | None = None
    description: str | None = None
    requirements: str | None = None
    salary: str | None = None
    status: str = "open"
    applicationDeadline: str | None = None
    location: str | None = None
    type: str = "fulltime"


class CmsCareerUpdate(BaseModel):
    title: str | None = None
    department: str | None = None
    description: str | None = None
    requirements: str | None = None
    salary: str | None = None
    status: str | None = None
    applicationDeadline: str | None = None
    location: str | None = None
    type: str | None = None


class CmsCareerApplicationCreate(BaseModel):
    careerJobId: str = Field(...)
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    phone: str | None = None
    resumeUrl: str | None = None
    coverLetter: str | None = None
    linkedIn: str | None = None
    portfolio: str | None = None


# ── Contact Messages ──────────────────────────────────────────────────────────


class CmsContactCreate(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    phone: str | None = None
    subject: str | None = None
    message: str = Field(..., min_length=1)
    source: str = "website"


class CmsContactUpdate(BaseModel):
    status: str | None = None
    assignedToId: str | None = None
    reply: str | None = None


# ── Popups ────────────────────────────────────────────────────────────────────


class CmsPopupCreate(BaseModel):
    title: str = Field(..., min_length=1)
    content: str | None = None
    type: str = "welcome"
    imageUrl: str | None = None
    frequency: str = "once"
    isEnabled: bool = True
    scheduledFrom: str | None = None
    scheduledTo: str | None = None


class CmsPopupUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    type: str | None = None
    imageUrl: str | None = None
    frequency: str | None = None
    isEnabled: bool | None = None
    scheduledFrom: str | None = None
    scheduledTo: str | None = None


# ── Forms ───────────────────────────────────────────────────────────────────


class CmsFormCreate(BaseModel):
    name: str = Field(..., min_length=1)
    formType: str = "contact"
    fields: Any = None
    isActive: bool = True


class CmsFormUpdate(BaseModel):
    name: str | None = None
    formType: str | None = None
    fields: Any = None
    isActive: bool | None = None


# ── Media ────────────────────────────────────────────────────────────────────


class CmsMediaCreate(BaseModel):
    fileName: str = Field(..., min_length=1)
    originalName: str | None = None
    mimeType: str = Field(..., min_length=1)
    size: int = 0
    url: str | None = None
    thumbnailUrl: str | None = None
    folder: str | None = None
    category: str | None = None
    alt: str | None = None
    width: int | None = None
    height: int | None = None


# ── SEO ──────────────────────────────────────────────────────────────────────


class CmsSeoCreate(BaseModel):
    pagePath: str = Field(..., min_length=1)
    title: str | None = None
    description: str | None = None
    keywords: str | None = None
    ogTitle: str | None = None
    ogDescription: str | None = None
    ogImage: str | None = None
    schemaMarkup: str | None = None
    canonicalUrl: str | None = None


class CmsSeoUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    keywords: str | None = None
    ogTitle: str | None = None
    ogDescription: str | None = None
    ogImage: str | None = None
    schemaMarkup: str | None = None
    canonicalUrl: str | None = None


# ── Pages ─────────────────────────────────────────────────────────────────────


class CmsPageCreate(BaseModel):
    title: str = Field(..., min_length=1)
    slug: str | None = None
    status: str = "draft"
    pageData: Any = None
    seoData: Any = None
    templateId: str | None = None


class CmsPageUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    status: str | None = None
    pageData: Any = None
    seoData: Any = None
    templateId: str | None = None


# ── Page Builder ────────────────────────────────────────────────────────────


class CmsPageBuilderCreate(BaseModel):
    title: str = Field(..., min_length=1)
    slug: str | None = None
    status: str = "draft"
    template: str | None = None
    page_schema: Any = None
    seoTitle: str | None = None
    seoDesc: str | None = None
    ogImage: str | None = None
    canonical: str | None = None
    schemaMarkup: str | None = None


class CmsPageBuilderUpdate(BaseModel):
    title: str | None = None
    slug: str | None = None
    status: str | None = None
    template: str | None = None
    page_schema: Any = None
    seoTitle: str | None = None
    seoDesc: str | None = None
    ogImage: str | None = None
    canonical: str | None = None
    schemaMarkup: str | None = None


# ── Announcements ────────────────────────────────────────────────────────────


class CmsAnnouncementCreate(BaseModel):
    text: str = Field(..., min_length=1)
    type: str = "info"
    link: str | None = None
    isEnabled: bool = True
    scheduledFrom: str | None = None
    scheduledTo: str | None = None
    displayOrder: int = 0


class CmsAnnouncementUpdate(BaseModel):
    text: str | None = None
    type: str | None = None
    link: str | None = None
    isEnabled: bool | None = None
    scheduledFrom: str | None = None
    scheduledTo: str | None = None
    displayOrder: int | None = None


# ── Footer ───────────────────────────────────────────────────────────────────


class CmsFooterUpdate(BaseModel):
    content: Any = None
    columns: Any = None
    copyrightText: str | None = None
    socialLinks: Any = None


# ── About ────────────────────────────────────────────────────────────────────


class CmsAboutUpdate(BaseModel):
    content: Any = None
    mission: str | None = None
    vision: str | None = None
    values: Any = None
    teamSection: Any = None
    historySection: Any = None


# ── Settings ───────────────────────────────────────────────────────────────────


class CmsSettingCreate(BaseModel):
    key: str = Field(..., min_length=1)
    value: Any = None
    category: str | None = None
    description: str | None = None


class CmsSettingUpdate(BaseModel):
    value: Any = None
    category: str | None = None
    description: str | None = None


# ── Activity Log ─────────────────────────────────────────────────────────────


class CmsActivityCreate(BaseModel):
    action: str = Field(..., min_length=1)
    section: str | None = None
    details: str | None = None
    entityId: str | None = None


# ── Revision ──────────────────────────────────────────────────────────────────


class CmsRevisionCreate(BaseModel):
    label: str | None = None
