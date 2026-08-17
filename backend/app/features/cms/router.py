"""
CMS feature router — ALL CMS endpoints organized by section.

MOHD.HMS ENTERPRISE

CMS access: super_admin only (from RBAC matrix).
Uses a single require_role("super_admin") dependency on all protected routes.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuthUser, get_current_user, get_optional_user, require_role
from app.features.cms import service
from app.features.cms.schemas import (
    CmsAboutUpdate,
    CmsActivityCreate,
    CmsAnnouncementCreate,
    CmsAnnouncementUpdate,
    CmsBlogCreate,
    CmsBlogUpdate,
    CmsCareerApplicationCreate,
    CmsCareerCreate,
    CmsCareerUpdate,
    CmsContactCreate,
    CmsContactUpdate,
    CmsFooterUpdate,
    CmsFormCreate,
    CmsFormUpdate,
    CmsHeroCreate,
    CmsHeroUpdate,
    CmsIndustryCreate,
    CmsIndustryUpdate,
    CmsMediaCreate,
    CmsPageBuilderCreate,
    CmsPageBuilderUpdate,
    CmsPageCreate,
    CmsPageUpdate,
    CmsPopupCreate,
    CmsPopupUpdate,
    CmsProjectCreate,
    CmsProjectUpdate,
    CmsRevisionCreate,
    CmsSeoCreate,
    CmsSeoUpdate,
    CmsServiceCreate,
    CmsServiceUpdate,
    CmsSettingCreate,
    CmsSettingUpdate,
    CmsTestimonialCreate,
    CmsTestimonialUpdate,
)

router = APIRouter(tags=["cms"])

# All CMS routes require super_admin role
_admin = require_role("super_admin")


# ════════════════════════════════════════════════════════════════════════════════
# Dashboard
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/dashboard")
async def get_dashboard(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/dashboard — CMS dashboard stats and recent activity."""
    return await service.get_dashboard(user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# About
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/about")
async def get_about(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/about — Get about page content."""
    return await service.get_about(user.tenantId, user)


@router.put("/about")
async def update_about(body: CmsAboutUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/about — Update about page content."""
    return await service.update_about(user.tenantId, user, body.model_dump(exclude_none=True))


# ════════════════════════════════════════════════════════════════════════════════
# Hero
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/hero")
async def list_heroes(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/hero — List hero sections."""
    return await service.list_heroes(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/hero")
async def create_hero(body: CmsHeroCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/hero — Create hero section."""
    return await service.create_hero(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/hero/{hero_id}")
async def get_hero(hero_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/hero/{id} — Get hero section detail."""
    return await service.get_hero(hero_id, user.tenantId, user)


@router.put("/hero/{hero_id}")
async def update_hero(hero_id: str, body: CmsHeroUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/hero/{id} — Update hero section."""
    return await service.update_hero(hero_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/hero/{hero_id}")
async def delete_hero(hero_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/hero/{id} — Delete hero section."""
    return await service.delete_hero(hero_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Footer
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/footer")
async def get_footer(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/footer — Get footer content."""
    return await service.get_footer(user.tenantId, user)


@router.put("/footer")
async def update_footer(body: CmsFooterUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/footer — Update footer content."""
    return await service.update_footer(user.tenantId, user, body.model_dump(exclude_none=True))


# ════════════════════════════════════════════════════════════════════════════════
# Services
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/services")
async def list_services(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/services — List services (paginated, filterable)."""
    return await service.list_services(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/services")
async def create_service(body: CmsServiceCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/services — Create a service."""
    return await service.create_service(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/services/{service_id}")
async def get_service(service_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/services/{id} — Get service detail."""
    return await service.get_service(service_id, user.tenantId, user)


@router.put("/services/{service_id}")
async def update_service(service_id: str, body: CmsServiceUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/services/{id} — Update a service."""
    return await service.update_service(service_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/services/{id} — Delete a service."""
    return await service.delete_service(service_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Industries
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/industries")
async def list_industries(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/industries — List industries."""
    return await service.list_industries(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/industries")
async def create_industry(body: CmsIndustryCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/industries — Create an industry."""
    return await service.create_industry(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/industries/{industry_id}")
async def get_industry(industry_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/industries/{id} — Get industry detail."""
    return await service.get_industry(industry_id, user.tenantId, user)


@router.put("/industries/{industry_id}")
async def update_industry(industry_id: str, body: CmsIndustryUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/industries/{id} — Update an industry."""
    return await service.update_industry(industry_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/industries/{industry_id}")
async def delete_industry(industry_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/industries/{id} — Delete an industry."""
    return await service.delete_industry(industry_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Projects
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/projects")
async def list_projects(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/projects — List projects."""
    return await service.list_projects(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/projects")
async def create_project(body: CmsProjectCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/projects — Create a project."""
    return await service.create_project(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/projects/{project_id}")
async def get_project(project_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/projects/{id} — Get project detail."""
    return await service.get_project(project_id, user.tenantId, user)


@router.put("/projects/{project_id}")
async def update_project(project_id: str, body: CmsProjectUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/projects/{id} — Update a project."""
    return await service.update_project(project_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/projects/{id} — Delete a project."""
    return await service.delete_project(project_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Blogs
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/blogs")
async def list_blogs(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
    categoryId: str = Query(default=""),
):
    """GET /api/v1/cms/blogs — List blogs (paginated, filterable)."""
    return await service.list_blogs(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status, "categoryId": categoryId,
    })


@router.post("/blogs")
async def create_blog(body: CmsBlogCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/blogs — Create a blog post."""
    return await service.create_blog(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/blogs/{blog_id}")
async def get_blog(blog_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/blogs/{id} — Get blog detail."""
    return await service.get_blog(blog_id, user.tenantId, user)


@router.put("/blogs/{blog_id}")
async def update_blog(blog_id: str, body: CmsBlogUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/blogs/{id} — Update a blog post."""
    return await service.update_blog(blog_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/blogs/{blog_id}")
async def delete_blog(blog_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/blogs/{id} — Delete a blog post."""
    return await service.delete_blog(blog_id, user.tenantId, user)


# ── Blog Categories ───────────────────────────────────────────────────────────


@router.get("/blogs/categories")
async def list_blog_categories(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/blogs/categories — List blog categories."""
    return await service.list_blog_categories(user.tenantId, user)


@router.post("/blogs/categories")
async def create_blog_category(
    body: CmsServiceCreate,  # Reuse: has name + slug + description
    user: AuthUser = Depends(_admin),
):
    """POST /api/v1/cms/blogs/categories — Create a blog category."""
    data = body.model_dump(exclude_none=True)
    return await service.create_blog_category(user.tenantId, user, data)


@router.put("/blogs/categories/{category_id}")
async def update_blog_category(
    category_id: str,
    body: CmsServiceUpdate,  # Reuse: has optional name + slug + description
    user: AuthUser = Depends(_admin),
):
    """PUT /api/v1/cms/blogs/categories/{id} — Update a blog category."""
    return await service.update_blog_category(category_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/blogs/categories/{category_id}")
async def delete_blog_category(category_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/blogs/categories/{id} — Delete a blog category."""
    return await service.delete_blog_category(category_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Testimonials
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/testimonials")
async def list_testimonials(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/testimonials — List testimonials."""
    return await service.list_testimonials(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/testimonials")
async def create_testimonial(body: CmsTestimonialCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/testimonials — Create a testimonial."""
    return await service.create_testimonial(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/testimonials/{testimonial_id}")
async def get_testimonial(testimonial_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/testimonials/{id} — Get testimonial detail."""
    return await service.get_testimonial(testimonial_id, user.tenantId, user)


@router.put("/testimonials/{testimonial_id}")
async def update_testimonial(testimonial_id: str, body: CmsTestimonialUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/testimonials/{id} — Update a testimonial."""
    return await service.update_testimonial(testimonial_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/testimonials/{id} — Delete a testimonial."""
    return await service.delete_testimonial(testimonial_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Careers
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/careers")
async def list_careers(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/careers — List career job postings."""
    return await service.list_careers(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/careers")
async def create_career(body: CmsCareerCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/careers — Create a career job posting."""
    return await service.create_career(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/careers/{career_id}")
async def get_career(career_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/careers/{id} — Get career job detail."""
    return await service.get_career(career_id, user.tenantId, user)


@router.put("/careers/{career_id}")
async def update_career(career_id: str, body: CmsCareerUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/careers/{id} — Update a career job posting."""
    return await service.update_career(career_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/careers/{career_id}")
async def delete_career(career_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/careers/{id} — Delete a career job posting."""
    return await service.delete_career(career_id, user.tenantId, user)


# ── Career Applications ──────────────────────────────────────────────────────


@router.get("/careers/{career_id}/applications")
async def list_career_applications(career_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/careers/{id}/applications — List applications for a job."""
    return await service.list_career_applications(career_id, user.tenantId, user)


@router.post("/careers/{career_id}/applications")
async def create_career_application(
    career_id: str,
    body: CmsCareerApplicationCreate,
    user: AuthUser = Depends(_admin),
):
    """POST /api/v1/cms/careers/{id}/applications — Submit a job application."""
    data = body.model_dump(exclude_none=True)
    data["careerJobId"] = career_id
    return await service.create_career_application(user.tenantId, data)


# ════════════════════════════════════════════════════════════════════════════════
# Contact Messages
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/contact")
async def list_contact_messages(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/contact — List contact messages."""
    return await service.list_contact_messages(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/contact")
async def create_contact_message(body: CmsContactCreate):
    """POST /api/v1/cms/contact — Submit contact form (public, no auth)."""
    data = body.model_dump(exclude_none=True)
    # For public submissions, use a default tenant or from body
    return await service.create_contact_message(data.get("tenantId", "default"), data)


@router.get("/contact/{message_id}")
async def get_contact_message(message_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/contact/{id} — Get contact message detail."""
    return await service.get_contact_message(message_id, user.tenantId, user)


@router.put("/contact/{message_id}")
async def update_contact_message(message_id: str, body: CmsContactUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/contact/{id} — Update contact message (status, reply)."""
    return await service.update_contact_message(message_id, user.tenantId, user, body.model_dump(exclude_none=True))


# ════════════════════════════════════════════════════════════════════════════════
# Announcements
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/announcements")
async def list_announcements(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/announcements — List announcements."""
    return await service.list_announcements(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/announcements")
async def create_announcement(body: CmsAnnouncementCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/announcements — Create an announcement."""
    return await service.create_announcement(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/announcements/{announcement_id}")
async def get_announcement(announcement_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/announcements/{id} — Get announcement detail."""
    return await service.get_announcement(announcement_id, user.tenantId, user)


@router.put("/announcements/{announcement_id}")
async def update_announcement(announcement_id: str, body: CmsAnnouncementUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/announcements/{id} — Update an announcement."""
    return await service.update_announcement(announcement_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/announcements/{announcement_id}")
async def delete_announcement(announcement_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/announcements/{id} — Delete an announcement."""
    return await service.delete_announcement(announcement_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Popups
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/popups")
async def list_popups(
    user: AuthUser = Depends(_admin),
    search: str = Query(default=""),
):
    """GET /api/v1/cms/popups — List popups."""
    return await service.list_popups(user.tenantId, user, {"search": search})


@router.post("/popups")
async def create_popup(body: CmsPopupCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/popups — Create a popup."""
    return await service.create_popup(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/popups/{popup_id}")
async def get_popup(popup_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/popups/{id} — Get popup detail."""
    return await service.get_popup(popup_id, user.tenantId, user)


@router.put("/popups/{popup_id}")
async def update_popup(popup_id: str, body: CmsPopupUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/popups/{id} — Update a popup."""
    return await service.update_popup(popup_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/popups/{popup_id}")
async def delete_popup(popup_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/popups/{id} — Delete a popup."""
    return await service.delete_popup(popup_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Forms
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/forms")
async def list_forms(
    user: AuthUser = Depends(_admin),
    search: str = Query(default=""),
):
    """GET /api/v1/cms/forms — List CMS forms."""
    return await service.list_forms(user.tenantId, user, {"search": search})


@router.post("/forms")
async def create_form(body: CmsFormCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/forms — Create a CMS form."""
    return await service.create_form(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/forms/{form_id}")
async def get_form(form_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/forms/{id} — Get form detail."""
    return await service.get_form(form_id, user.tenantId, user)


@router.put("/forms/{form_id}")
async def update_form(form_id: str, body: CmsFormUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/forms/{id} — Update a CMS form."""
    return await service.update_form(form_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/forms/{form_id}")
async def delete_form(form_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/forms/{id} — Delete a CMS form."""
    return await service.delete_form(form_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# SEO
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/seo")
async def list_seo(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/seo — List all SEO settings."""
    return await service.list_seo(user.tenantId, user)


@router.put("/seo")
async def bulk_update_seo(
    body: list[CmsSeoCreate],
    user: AuthUser = Depends(_admin),
):
    """PUT /api/v1/cms/seo — Bulk upsert SEO settings."""
    return await service.update_seo_bulk(user.tenantId, user, [item.model_dump(exclude_none=True) for item in body])


@router.get("/seo/{page_path:path}")
async def get_seo(page_path: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/seo/{pagePath} — Get SEO for a specific page path."""
    return await service.get_seo_by_path(page_path, user.tenantId, user)


@router.put("/seo/{page_path:path}")
async def update_seo(page_path: str, body: CmsSeoUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/seo/{pagePath} — Update SEO for a specific page path."""
    return await service.update_seo_bulk(user.tenantId, user, [
        {"pagePath": page_path, **body.model_dump(exclude_none=True)}
    ])


@router.delete("/seo/{page_path:path}")
async def delete_seo(page_path: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/seo/{pagePath} — Delete SEO settings for a page path."""
    return await service.delete_seo(page_path, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Media
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/media")
async def list_media(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/media — List media files."""
    return await service.list_media(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/media")
async def create_media(body: CmsMediaCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/media — Register a media file."""
    return await service.create_media(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/media/{media_id}")
async def get_media(media_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/media/{id} — Get media file detail."""
    return await service.get_media(media_id, user.tenantId, user)


@router.delete("/media/{media_id}")
async def delete_media(media_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/media/{id} — Delete a media file."""
    return await service.delete_media(media_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Activity
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/activity")
async def list_activity(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/activity — List CMS activity log."""
    return await service.list_activity(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/activity")
async def create_activity_entry(body: CmsActivityCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/activity — Create an activity log entry."""
    return await service.create_activity_entry(user.tenantId, user, body.model_dump(exclude_none=True))


# ════════════════════════════════════════════════════════════════════════════════
# Analytics
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/analytics")
async def get_analytics(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/analytics — CMS analytics summary."""
    return await service.get_analytics(user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Settings
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/settings")
async def get_settings(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/settings — Get all CMS settings."""
    return await service.get_settings(user.tenantId, user)


@router.put("/settings")
async def update_settings(
    body: list[CmsSettingCreate],
    user: AuthUser = Depends(_admin),
):
    """PUT /api/v1/cms/settings — Bulk upsert CMS settings."""
    return await service.update_settings_bulk(user.tenantId, user, [item.model_dump(exclude_none=True) for item in body])


# ════════════════════════════════════════════════════════════════════════════════
# Pages
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/pages")
async def list_pages(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/pages — List CMS pages."""
    return await service.list_pages(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search, "status": status,
    })


@router.post("/pages")
async def create_page(body: CmsPageCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/pages — Create a CMS page."""
    return await service.create_page(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/pages/{page_id}")
async def get_page(page_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/pages/{id} — Get page detail."""
    return await service.get_page(page_id, user.tenantId, user)


@router.put("/pages/{page_id}")
async def update_page(page_id: str, body: CmsPageUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/pages/{id} — Update a CMS page."""
    return await service.update_page(page_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/pages/{page_id}")
async def delete_page(page_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/pages/{id} — Delete a CMS page."""
    return await service.delete_page(page_id, user.tenantId, user)


# ════════════════════════════════════════════════════════════════════════════════
# Page Builder
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/builder/pages")
async def list_builder_pages(
    user: AuthUser = Depends(_admin),
    search: str = Query(default=""),
    status: str = Query(default=""),
):
    """GET /api/v1/cms/builder/pages — List builder pages."""
    return await service.list_builder_pages(user.tenantId, user, {"search": search, "status": status})


@router.post("/builder/pages")
async def create_builder_page(body: CmsPageBuilderCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/builder/pages — Create a builder page."""
    return await service.create_builder_page(user.tenantId, user, body.model_dump(exclude_none=True))


@router.get("/builder/pages/{page_id}")
async def get_builder_page(page_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/builder/pages/{id} — Get builder page detail."""
    return await service.get_builder_page(page_id, user.tenantId, user)


@router.put("/builder/pages/{page_id}")
async def update_builder_page(page_id: str, body: CmsPageBuilderUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/builder/pages/{id} — Update a builder page."""
    return await service.update_builder_page(page_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.delete("/builder/pages/{page_id}")
async def delete_builder_page(page_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/builder/pages/{id} — Delete a builder page."""
    return await service.delete_builder_page(page_id, user.tenantId, user)


@router.post("/builder/pages/{page_id}/publish")
async def publish_builder_page(page_id: str, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/builder/pages/{id}/publish — Publish a builder page."""
    return await service.publish_builder_page(page_id, user.tenantId, user)


@router.post("/builder/pages/{page_id}/duplicate")
async def duplicate_builder_page(page_id: str, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/builder/pages/{id}/duplicate — Duplicate a builder page."""
    return await service.duplicate_builder_page(page_id, user.tenantId, user)


@router.get("/builder/pages/{page_id}/revisions")
async def list_builder_page_revisions(page_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/builder/pages/{id}/revisions — List page revisions."""
    return await service.list_builder_page_revisions(page_id, user.tenantId, user)


@router.post("/builder/pages/{page_id}/revisions")
async def create_builder_page_revision(page_id: str, body: CmsRevisionCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/builder/pages/{id}/revisions — Create a revision snapshot."""
    return await service.create_builder_page_revision(page_id, user.tenantId, user, body.model_dump(exclude_none=True))


@router.post("/builder/pages/{page_id}/revisions/{rev_id}/restore")
async def restore_builder_revision(page_id: str, rev_id: str, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/builder/pages/{id}/revisions/{revId}/restore — Restore a revision."""
    return await service.restore_builder_revision(rev_id, page_id, user.tenantId, user)


@router.get("/builder/revisions")
async def list_all_revisions(
    user: AuthUser = Depends(_admin),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    search: str = Query(default=""),
):
    """GET /api/v1/cms/builder/revisions — List all revisions across pages."""
    return await service.list_all_revisions(user.tenantId, user, {
        "page": page, "pageSize": pageSize, "search": search,
    })


@router.post("/builder/revisions")
async def create_revision(
    body: CmsRevisionCreate,
    user: AuthUser = Depends(_admin),
    pageId: str = Query(..., alias="pageId"),
):
    """POST /api/v1/cms/builder/revisions — Create revision for a page."""
    return await service.create_builder_page_revision(pageId, user.tenantId, user, body.model_dump(exclude_none=True))


# ── Builder Templates ──────────────────────────────────────────────────────────


@router.get("/builder/templates")
async def list_builder_templates(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/builder/templates — List page builder templates."""
    return await service.list_builder_templates(user.tenantId, user)


@router.post("/builder/templates")
async def create_builder_template(body: CmsPageCreate, user: AuthUser = Depends(_admin)):
    """POST /api/v1/cms/builder/templates — Create a page builder template."""
    data = body.model_dump(exclude_none=True)
    return await service.create_builder_template(user.tenantId, user, data)


@router.get("/builder/templates/{template_id}")
async def get_builder_template(template_id: str, user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/builder/templates/{id} — Get template detail."""
    return await service.get_builder_template(template_id, user.tenantId, user)


@router.put("/builder/templates/{template_id}")
async def update_builder_template(template_id: str, body: CmsPageUpdate, user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/builder/templates/{id} — Update a template."""
    data = body.model_dump(exclude_none=True)
    return await service.update_builder_template(template_id, user.tenantId, user, data)


@router.delete("/builder/templates/{template_id}")
async def delete_builder_template(template_id: str, user: AuthUser = Depends(_admin)):
    """DELETE /api/v1/cms/builder/templates/{id} — Delete a template."""
    return await service.delete_builder_template(template_id, user.tenantId, user)


# ── Builder Theme ──────────────────────────────────────────────────────────────


@router.get("/builder/theme")
async def get_builder_theme(user: AuthUser = Depends(_admin)):
    """GET /api/v1/cms/builder/theme — Get builder theme settings."""
    return await service.get_builder_theme(user.tenantId, user)


@router.put("/builder/theme")
async def update_builder_theme(body: dict[str, Any], user: AuthUser = Depends(_admin)):
    """PUT /api/v1/cms/builder/theme — Update builder theme settings."""
    return await service.update_builder_theme(user.tenantId, user, body)


# ════════════════════════════════════════════════════════════════════════════════
# Public Landing (no auth)
# ════════════════════════════════════════════════════════════════════════════════


@router.get("/public/landing")
async def get_public_landing():
    """GET /api/v1/cms/public/landing — Public landing page data (no auth required)."""
    return await service.get_public_landing()
