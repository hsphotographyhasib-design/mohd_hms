"""
CMS business logic for all content management operations.

MOHD.HMS ENTERPRISE

All CMS entities share a common CRUD pattern: list (paginated, filterable),
create, get, update, delete. Page builder additionally has publish, duplicate,
and revision management.
"""

import json
import re
from typing import Any

from app.api.dependencies import AuthUser
from app.core.database import (
    MODEL_TO_TABLE,
    count_records,
    delete_record,
    insert_record,
    query_table,
    update_record,
)
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.core.logging import get_logger

log = get_logger(__name__)

# ── Table name constants ──────────────────────────────────────────────────────

T_HERO = MODEL_TO_TABLE.get("cmsHero", "CmsHero")
T_SERVICE = MODEL_TO_TABLE.get("cmsService", "CmsService")
T_INDUSTRY = MODEL_TO_TABLE.get("cmsIndustry", "CmsIndustry")
T_PROJECT = MODEL_TO_TABLE.get("cmsProject", "CmsProject")
T_BLOG = MODEL_TO_TABLE.get("cmsBlog", "CmsBlog")
T_BLOG_CATEGORY = MODEL_TO_TABLE.get("cmsBlogCategory", "CmsBlogCategory")
T_TESTIMONIAL = MODEL_TO_TABLE.get("cmsTestimonial", "CmsTestimonial")
T_CAREER_JOB = MODEL_TO_TABLE.get("cmsCareerJob", "CmsCareerJob")
T_CAREER_APP = MODEL_TO_TABLE.get("cmsCareerApplication", "CmsCareerApplication")
T_CONTACT = MODEL_TO_TABLE.get("cmsContactMessage", "CmsContactMessage")
T_POPUP = MODEL_TO_TABLE.get("cmsPopup", "CmsPopup")
T_FORM = MODEL_TO_TABLE.get("cmsForm", "CmsForm")
T_MEDIA = MODEL_TO_TABLE.get("cmsMedia", "CmsMedia")
T_SEO = MODEL_TO_TABLE.get("cmsSeo", "CmsSeo")
T_PAGE = MODEL_TO_TABLE.get("cmsPage", "CmsPage")
T_PAGE_TEMPLATE = MODEL_TO_TABLE.get("cmsPageTemplate", "CmsPageTemplate")
T_REVISION = MODEL_TO_TABLE.get("cmsRevision", "CmsRevision")
T_ANNOUNCEMENT = MODEL_TO_TABLE.get("cmsAnnouncement", "CmsAnnouncement")
T_SETTING = MODEL_TO_TABLE.get("cmsSetting", "CmsSetting")
T_ACTIVITY_LOG = MODEL_TO_TABLE.get("cmsActivityLog", "CmsActivityLog")
T_FOOTER = MODEL_TO_TABLE.get("cmsFooter", "CmsFooter")


# ── Slug generation ───────────────────────────────────────────────────────────


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a name string."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug


def _serialize_json_fields(data: dict[str, Any], *fields: str) -> dict[str, Any]:
    """Serialize dict/list fields to JSON strings for PostgREST text columns."""
    result = dict(data)
    for field in fields:
        val = result.get(field)
        if val is not None and not isinstance(val, str):
            result[field] = json.dumps(val)
    return result


# ── Generic CRUD helpers ──────────────────────────────────────────────────────


async def _generic_list(
    table: str,
    tenant_id: str,
    params: dict[str, Any],
    search_fields: list[str] | None = None,
    order: str = "createdAt.desc",
) -> dict[str, Any]:
    """List records with pagination, search, and optional status filter."""
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")

    where: dict[str, Any] = {}
    if search and search_fields:
        where["OR"] = [{f: {"contains": search}} for f in search_fields]
    if status:
        where["status"] = status

    offset = (page - 1) * page_size

    result = await query_table(
        table,
        select="*",
        where=where if where else None,
        order=order,
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )

    items = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "") else len(items)

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "pagination": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": max(1, (total + page_size - 1) // page_size),
        },
    }


async def _generic_get(table: str, record_id: str, tenant_id: str, resource_name: str = "Resource") -> dict[str, Any]:
    """Get a single record by ID within tenant scope."""
    result = await query_table(table, select="*", where={"id": record_id}, tenant_id=tenant_id)
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource=resource_name)
    return items[0]


async def _generic_create(table: str, tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Create a record, injecting tenantId."""
    data["tenantId"] = tenant_id
    return await insert_record(table, data)


async def _generic_update(table: str, record_id: str, tenant_id: str, data: dict[str, Any], resource_name: str = "Resource") -> dict[str, Any]:
    """Update a record after verifying existence."""
    result = await query_table(table, select="id", where={"id": record_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource=resource_name)
    update_data = {k: v for k, v in data.items() if v is not None}
    return await update_record(table, record_id, update_data)


async def _generic_delete(table: str, record_id: str, tenant_id: str, resource_name: str = "Resource") -> dict[str, Any]:
    """Delete a record after verifying existence."""
    result = await query_table(table, select="id", where={"id": record_id}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource=resource_name)
    await delete_record(table, record_id)
    return {"message": f"{resource_name} deleted successfully"}


async def _log_activity(
    tenant_id: str,
    user: AuthUser,
    action: str,
    section: str | None = None,
    details: str | None = None,
    entity_id: str | None = None,
) -> None:
    """Log an activity to the CMS activity log (fire-and-forget)."""
    try:
        record = {
            "tenantId": tenant_id,
            "userId": user.userId,
            "action": action,
            "section": section or "cms",
            "details": details or "",
            "entityId": entity_id,
        }
        await insert_record(T_ACTIVITY_LOG, record)
    except Exception:
        log.warning("Failed to log CMS activity", exc_info=True)


# ════════════════════════════════════════════════════════════════════════════════
# Dashboard
# ════════════════════════════════════════════════════════════════════════════════


async def get_dashboard(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Get CMS dashboard stats and recent activity."""
    published_blogs = await count_records(T_BLOG, {"status": "published"}, tenant_id=tenant_id)
    active_services = await count_records(T_SERVICE, {"status": "active"}, tenant_id=tenant_id)
    active_projects = await count_records(T_PROJECT, {"status": "published"}, tenant_id=tenant_id)
    active_testimonials = await count_records(T_TESTIMONIAL, {"status": "active"}, tenant_id=tenant_id)
    contact_requests = await count_records(T_CONTACT, tenant_id=tenant_id)
    career_applications = await count_records(T_CAREER_APP, tenant_id=tenant_id)
    unread_messages = await count_records(T_CONTACT, {"status": "new"}, tenant_id=tenant_id)
    announcements = await count_records(T_ANNOUNCEMENT, {"isEnabled": True}, tenant_id=tenant_id)
    draft_blogs = await count_records(T_BLOG, {"status": "draft"}, tenant_id=tenant_id)
    total_blogs = await count_records(T_BLOG, tenant_id=tenant_id)
    total_projects = await count_records(T_PROJECT, tenant_id=tenant_id)
    total_media = await count_records(T_MEDIA, tenant_id=tenant_id)
    active_careers = await count_records(T_CAREER_JOB, {"status": "open"}, tenant_id=tenant_id)

    activity_result = await query_table(
        T_ACTIVITY_LOG,
        select="*",
        order="createdAt.desc",
        limit=10,
        tenant_id=tenant_id,
    )
    recent_activity = activity_result.get("data", [])

    return {
        "overview": {
            "publishedBlogs": published_blogs,
            "activeServices": active_services,
            "activeProjects": active_projects,
            "activeTestimonials": active_testimonials,
            "contactRequests": contact_requests,
            "careerApplications": career_applications,
            "unreadMessages": unread_messages,
            "announcements": announcements,
        },
        "quickStats": {
            "draftBlogs": draft_blogs,
            "totalBlogs": total_blogs,
            "totalProjects": total_projects,
            "totalMedia": total_media,
            "activeCareers": active_careers,
        },
        "recentActivity": recent_activity,
    }


# ════════════════════════════════════════════════════════════════════════════════
# Hero
# ════════════════════════════════════════════════════════════════════════════════


async def list_heroes(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_HERO, tenant_id, params, search_fields=["headline", "subheadline"], order="createdAt.desc")


async def create_hero(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    data["publishedAt"] = data.get("isActive", True) if not data.get("isActive") else None
    result = await _generic_create(T_HERO, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "hero", "Created hero section", result.get("id"))
    return result


async def get_hero(hero_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_HERO, hero_id, tenant_id, "Hero")


async def update_hero(hero_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_HERO, hero_id, tenant_id, data, "Hero")
    await _log_activity(tenant_id, user, "update", "hero", "Updated hero section", hero_id)
    return result


async def delete_hero(hero_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "hero", "Deleted hero section", hero_id)
    return await _generic_delete(T_HERO, hero_id, tenant_id, "Hero")


# ════════════════════════════════════════════════════════════════════════════════
# Services
# ════════════════════════════════════════════════════════════════════════════════


async def list_services(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_SERVICE, tenant_id, params, search_fields=["name", "description", "slug"], order="displayOrder.asc,createdAt.desc")


async def create_service(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("name", ""))
    result = await _generic_create(T_SERVICE, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "services", f"Created service: {data.get('name')}", result.get("id"))
    return result


async def get_service(service_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_SERVICE, service_id, tenant_id, "Service")


async def update_service(service_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_SERVICE, service_id, tenant_id, data, "Service")
    await _log_activity(tenant_id, user, "update", "services", "Updated service", service_id)
    return result


async def delete_service(service_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "services", "Deleted service", service_id)
    return await _generic_delete(T_SERVICE, service_id, tenant_id, "Service")


# ════════════════════════════════════════════════════════════════════════════════
# Industries
# ════════════════════════════════════════════════════════════════════════════════


async def list_industries(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_INDUSTRY, tenant_id, params, search_fields=["name", "description"], order="displayOrder.asc,createdAt.desc")


async def create_industry(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("name", ""))
    result = await _generic_create(T_INDUSTRY, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "industries", f"Created industry: {data.get('name')}", result.get("id"))
    return result


async def get_industry(industry_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_INDUSTRY, industry_id, tenant_id, "Industry")


async def update_industry(industry_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_INDUSTRY, industry_id, tenant_id, data, "Industry")
    await _log_activity(tenant_id, user, "update", "industries", "Updated industry", industry_id)
    return result


async def delete_industry(industry_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "industries", "Deleted industry", industry_id)
    return await _generic_delete(T_INDUSTRY, industry_id, tenant_id, "Industry")


# ════════════════════════════════════════════════════════════════════════════════
# Projects
# ════════════════════════════════════════════════════════════════════════════════


async def list_projects(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_PROJECT, tenant_id, params, search_fields=["title", "description", "client"], order="displayOrder.asc,createdAt.desc")


async def create_project(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("title", ""))
    result = await _generic_create(T_PROJECT, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "projects", f"Created project: {data.get('title')}", result.get("id"))
    return result


async def get_project(project_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_PROJECT, project_id, tenant_id, "Project")


async def update_project(project_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_PROJECT, project_id, tenant_id, data, "Project")
    await _log_activity(tenant_id, user, "update", "projects", "Updated project", project_id)
    return result


async def delete_project(project_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "projects", "Deleted project", project_id)
    return await _generic_delete(T_PROJECT, project_id, tenant_id, "Project")


# ════════════════════════════════════════════════════════════════════════════════
# Blogs
# ════════════════════════════════════════════════════════════════════════════════


async def list_blogs(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    page = params.get("page", 1)
    page_size = params.get("pageSize", 20)
    search = params.get("search", "")
    status = params.get("status", "")
    category_id = params.get("categoryId", "")

    where: dict[str, Any] = {}
    if search:
        where["OR"] = [{"title": {"contains": search}}, {"excerpt": {"contains": search}}, {"slug": {"contains": search}}]
    if status:
        where["status"] = status
    if category_id:
        where["categoryId"] = category_id

    offset = (page - 1) * page_size
    result = await query_table(
        T_BLOG,
        select="*",
        where=where if where else None,
        order="createdAt.desc",
        limit=page_size,
        offset=offset,
        count="exact",
        tenant_id=tenant_id,
    )
    items = result.get("data", [])
    total_str = result.get("count", "0")
    total = int(total_str) if total_str not in ("*", "") else len(items)

    return {
        "data": items,
        "total": total,
        "page": page,
        "pageSize": page_size,
        "pagination": {"page": page, "pageSize": page_size, "total": total, "totalPages": max(1, (total + page_size - 1) // page_size)},
    }


async def create_blog(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("title", ""))
    data["viewCount"] = 0
    result = await _generic_create(T_BLOG, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "blogs", f"Created blog: {data.get('title')}", result.get("id"))
    return result


async def get_blog(blog_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_BLOG, blog_id, tenant_id, "Blog")


async def update_blog(blog_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_BLOG, blog_id, tenant_id, data, "Blog")
    await _log_activity(tenant_id, user, "update", "blogs", "Updated blog", blog_id)
    return result


async def delete_blog(blog_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "blogs", "Deleted blog", blog_id)
    return await _generic_delete(T_BLOG, blog_id, tenant_id, "Blog")


# ── Blog Categories ───────────────────────────────────────────────────────────


async def list_blog_categories(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_BLOG_CATEGORY, select="*", order="name.asc", tenant_id=tenant_id)
    return {"data": result.get("data", [])}


async def create_blog_category(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("name"):
        raise ValidationException(message="Category name is required")
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("name", ""))
    result = await _generic_create(T_BLOG_CATEGORY, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "blog_categories", f"Created blog category: {data.get('name')}", result.get("id"))
    return result


async def update_blog_category(category_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_BLOG_CATEGORY, category_id, tenant_id, data, "BlogCategory")
    await _log_activity(tenant_id, user, "update", "blog_categories", "Updated blog category", category_id)
    return result


async def delete_blog_category(category_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "blog_categories", "Deleted blog category", category_id)
    return await _generic_delete(T_BLOG_CATEGORY, category_id, tenant_id, "BlogCategory")


# ════════════════════════════════════════════════════════════════════════════════
# Testimonials
# ════════════════════════════════════════════════════════════════════════════════


async def list_testimonials(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_TESTIMONIAL, tenant_id, params, search_fields=["customerName", "comment"], order="displayOrder.asc,createdAt.desc")


async def create_testimonial(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("customerName"):
        raise ValidationException(message="Customer name is required")
    if not data.get("comment"):
        raise ValidationException(message="Comment is required")
    result = await _generic_create(T_TESTIMONIAL, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "testimonials", f"Created testimonial by {data.get('customerName')}", result.get("id"))
    return result


async def get_testimonial(testimonial_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_TESTIMONIAL, testimonial_id, tenant_id, "Testimonial")


async def update_testimonial(testimonial_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_TESTIMONIAL, testimonial_id, tenant_id, data, "Testimonial")
    await _log_activity(tenant_id, user, "update", "testimonials", "Updated testimonial", testimonial_id)
    return result


async def delete_testimonial(testimonial_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "testimonials", "Deleted testimonial", testimonial_id)
    return await _generic_delete(T_TESTIMONIAL, testimonial_id, tenant_id, "Testimonial")


# ════════════════════════════════════════════════════════════════════════════════
# Careers
# ════════════════════════════════════════════════════════════════════════════════


async def list_careers(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_CAREER_JOB, tenant_id, params, search_fields=["title", "description"], order="createdAt.desc")


async def create_career(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("title"):
        raise ValidationException(message="Title is required")
    result = await _generic_create(T_CAREER_JOB, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "careers", f"Created career: {data.get('title')}", result.get("id"))
    return result


async def get_career(career_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_CAREER_JOB, career_id, tenant_id, "CareerJob")


async def update_career(career_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_CAREER_JOB, career_id, tenant_id, data, "CareerJob")
    await _log_activity(tenant_id, user, "update", "careers", "Updated career", career_id)
    return result


async def delete_career(career_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "careers", "Deleted career", career_id)
    return await _generic_delete(T_CAREER_JOB, career_id, tenant_id, "CareerJob")


# ── Career Applications ──────────────────────────────────────────────────────


async def list_career_applications(career_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(
        T_CAREER_APP,
        select="*",
        where={"careerJobId": career_id},
        order="createdAt.desc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_career_application(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    career_id = data.get("careerJobId")
    if not career_id:
        raise ValidationException(message="careerJobId is required")
    if not data.get("name"):
        raise ValidationException(message="Name is required")
    if not data.get("email"):
        raise ValidationException(message="Email is required")

    result = await _generic_create(T_CAREER_APP, tenant_id, data)
    return result


# ════════════════════════════════════════════════════════════════════════════════
# Contact Messages
# ════════════════════════════════════════════════════════════════════════════════


async def list_contact_messages(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_CONTACT, tenant_id, params, search_fields=["name", "email", "subject", "message"], order="createdAt.desc")


async def create_contact_message(tenant_id: str, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("name"):
        raise ValidationException(message="Name is required")
    if not data.get("email"):
        raise ValidationException(message="Email is required")
    if not data.get("message"):
        raise ValidationException(message="Message is required")
    data["status"] = "new"
    result = await _generic_create(T_CONTACT, tenant_id, data)
    return result


async def get_contact_message(message_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_CONTACT, message_id, tenant_id, "ContactMessage")


async def update_contact_message(message_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_CONTACT, message_id, tenant_id, data, "ContactMessage")
    await _log_activity(tenant_id, user, "update", "contact", "Updated contact message", message_id)
    return result


# ════════════════════════════════════════════════════════════════════════════════
# Announcements
# ════════════════════════════════════════════════════════════════════════════════


async def list_announcements(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_ANNOUNCEMENT, tenant_id, params, search_fields=["text"], order="displayOrder.asc,createdAt.desc")


async def create_announcement(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("text"):
        raise ValidationException(message="Text is required")
    result = await _generic_create(T_ANNOUNCEMENT, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "announcements", "Created announcement", result.get("id"))
    return result


async def get_announcement(announcement_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_ANNOUNCEMENT, announcement_id, tenant_id, "Announcement")


async def update_announcement(announcement_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_ANNOUNCEMENT, announcement_id, tenant_id, data, "Announcement")
    await _log_activity(tenant_id, user, "update", "announcements", "Updated announcement", announcement_id)
    return result


async def delete_announcement(announcement_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "announcements", "Deleted announcement", announcement_id)
    return await _generic_delete(T_ANNOUNCEMENT, announcement_id, tenant_id, "Announcement")


# ════════════════════════════════════════════════════════════════════════════════
# Popups
# ════════════════════════════════════════════════════════════════════════════════


async def list_popups(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    result = await query_table(T_POPUP, select="*", order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", [])}


async def create_popup(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("title"):
        raise ValidationException(message="Title is required")
    result = await _generic_create(T_POPUP, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "popups", "Created popup", result.get("id"))
    return result


async def get_popup(popup_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_POPUP, popup_id, tenant_id, "Popup")


async def update_popup(popup_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    result = await _generic_update(T_POPUP, popup_id, tenant_id, data, "Popup")
    await _log_activity(tenant_id, user, "update", "popups", "Updated popup", popup_id)
    return result


async def delete_popup(popup_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "popups", "Deleted popup", popup_id)
    return await _generic_delete(T_POPUP, popup_id, tenant_id, "Popup")


# ════════════════════════════════════════════════════════════════════════════════
# Forms
# ════════════════════════════════════════════════════════════════════════════════


async def list_forms(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    result = await query_table(T_FORM, select="*", order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", [])}


async def create_form(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("name"):
        raise ValidationException(message="Name is required")
    if not data.get("fields"):
        raise ValidationException(message="Fields are required")
    data = _serialize_json_fields(data, "fields")
    result = await _generic_create(T_FORM, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "forms", "Created form", result.get("id"))
    return result


async def get_form(form_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_FORM, form_id, tenant_id, "Form")


async def update_form(form_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    data = _serialize_json_fields(data, "fields")
    result = await _generic_update(T_FORM, form_id, tenant_id, data, "Form")
    await _log_activity(tenant_id, user, "update", "forms", "Updated form", form_id)
    return result


async def delete_form(form_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "forms", "Deleted form", form_id)
    return await _generic_delete(T_FORM, form_id, tenant_id, "Form")


# ════════════════════════════════════════════════════════════════════════════════
# Media
# ════════════════════════════════════════════════════════════════════════════════


async def list_media(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_MEDIA, tenant_id, params, search_fields=["fileName", "originalName", "alt"], order="createdAt.desc")


async def create_media(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("fileName"):
        raise ValidationException(message="File name is required")
    if not data.get("mimeType"):
        raise ValidationException(message="MIME type is required")
    data["uploadedById"] = user.userId
    result = await _generic_create(T_MEDIA, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "media", f"Uploaded media: {data.get('fileName')}", result.get("id"))
    return result


async def get_media(media_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_MEDIA, media_id, tenant_id, "Media")


async def delete_media(media_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "media", "Deleted media", media_id)
    return await _generic_delete(T_MEDIA, media_id, tenant_id, "Media")


# ════════════════════════════════════════════════════════════════════════════════
# SEO
# ════════════════════════════════════════════════════════════════════════════════


async def list_seo(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_SEO, select="*", order="pagePath.asc", tenant_id=tenant_id)
    return {"data": result.get("data", [])}


async def get_seo_by_path(page_path: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_SEO, select="*", where={"pagePath": page_path}, tenant_id=tenant_id)
    items = result.get("data", [])
    if not items:
        raise NotFoundException(resource="SEO")
    return items[0]


async def update_seo_bulk(tenant_id: str, user: AuthUser, settings: list[dict[str, Any]]) -> dict[str, Any]:
    """Bulk upsert SEO settings for multiple page paths."""
    results = []
    for item in settings:
        if not item.get("pagePath"):
            continue
        update_data = {k: v for k, v in item.items() if k != "pagePath"}

        # Check if exists
        existing = await query_table(T_SEO, select="id", where={"pagePath": item["pagePath"]}, tenant_id=tenant_id)
        if existing.get("data"):
            record_id = existing["data"][0]["id"]
            result = await update_record(T_SEO, record_id, update_data)
            results.append(result)
        else:
            record = dict(update_data)
            record["tenantId"] = tenant_id
            record["pagePath"] = item["pagePath"]
            result = await insert_record(T_SEO, record)
            results.append(result)

    await _log_activity(tenant_id, user, "update", "seo", f"Bulk updated SEO for {len(results)} pages")
    return {"data": results}


async def delete_seo(page_path: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_SEO, select="id", where={"pagePath": page_path}, tenant_id=tenant_id)
    if not result.get("data"):
        raise NotFoundException(resource="SEO")
    record_id = result["data"][0]["id"]
    await delete_record(T_SEO, record_id)
    await _log_activity(tenant_id, user, "delete", "seo", f"Deleted SEO for path: {page_path}")
    return {"message": "SEO settings deleted successfully"}


# ════════════════════════════════════════════════════════════════════════════════
# Pages
# ════════════════════════════════════════════════════════════════════════════════


async def list_pages(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_PAGE, tenant_id, params, search_fields=["title", "slug"], order="updatedAt.desc")


async def create_page(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("title"):
        raise ValidationException(message="Title is required")
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("title", ""))

    data = _serialize_json_fields(data, "pageData", "seoData")
    data["version"] = 1

    result = await _generic_create(T_PAGE, tenant_id, data)
    page_id = result.get("id")

    # Create initial revision
    await insert_record(T_REVISION, {
        "tenantId": tenant_id,
        "pageId": page_id,
        "pageData": result.get("pageData", "{}"),
        "version": 1,
        "label": "Initial version",
        "createdBy": user.userId,
    })

    await _log_activity(tenant_id, user, "create", "pages", f"Created page: {data.get('title')}", page_id)
    return result


async def get_page(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_PAGE, page_id, tenant_id, "Page")


async def update_page(page_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    data = _serialize_json_fields(data, "pageData", "seoData")
    result = await _generic_update(T_PAGE, page_id, tenant_id, data, "Page")
    await _log_activity(tenant_id, user, "update", "pages", "Updated page", page_id)
    return result


async def delete_page(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "pages", "Deleted page", page_id)
    return await _generic_delete(T_PAGE, page_id, tenant_id, "Page")


# ════════════════════════════════════════════════════════════════════════════════
# Page Builder
# ════════════════════════════════════════════════════════════════════════════════


async def list_builder_pages(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    result = await query_table(T_PAGE, select="*", order="createdAt.desc", tenant_id=tenant_id)
    return {"data": result.get("data", [])}


async def create_builder_page(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("title"):
        raise ValidationException(message="Title is required")
    if not data.get("slug"):
        data["slug"] = generate_slug(data.get("title", ""))

    # Ensure unique slug
    slug = data["slug"]
    existing = await query_table(T_PAGE, select="id", where={"slug": slug}, tenant_id=tenant_id)
    if existing.get("data"):
        counter = 1
        while True:
            new_slug = f"{slug}-{counter}"
            check = await query_table(T_PAGE, select="id", where={"slug": new_slug}, tenant_id=tenant_id)
            if not check.get("data"):
                slug = new_slug
                break
            counter += 1
        data["slug"] = slug

    data = _serialize_json_fields(data, "schema")
    result = await _generic_create(T_PAGE, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "builder", f"Created builder page: {data.get('title')}", result.get("id"))
    return result


async def get_builder_page(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_PAGE, page_id, tenant_id, "BuilderPage")


async def update_builder_page(page_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    data = _serialize_json_fields(data, "schema")
    result = await _generic_update(T_PAGE, page_id, tenant_id, data, "BuilderPage")
    await _log_activity(tenant_id, user, "update", "builder", "Updated builder page", page_id)
    return result


async def delete_builder_page(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "builder", "Deleted builder page", page_id)
    return await _generic_delete(T_PAGE, page_id, tenant_id, "BuilderPage")


async def publish_builder_page(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Publish a builder page (set status to published)."""
    page = await _generic_get(T_PAGE, page_id, tenant_id, "BuilderPage")

    # Create revision snapshot before publishing
    await insert_record(T_REVISION, {
        "tenantId": tenant_id,
        "pageId": page_id,
        "pageData": page.get("schema", page.get("pageData", "{}")),
        "version": page.get("version", 0) + 1,
        "label": f"Published v{page.get('version', 0) + 1}",
        "createdBy": user.userId,
    })

    # Increment version and set published
    new_version = page.get("version", 0) + 1
    update_data = {
        "status": "published",
        "version": new_version,
        "publishedAt": "now()",
        "publishedBy": user.userId,
    }
    result = await update_record(T_PAGE, page_id, update_data)
    await _log_activity(tenant_id, user, "publish", "builder", f"Published page v{new_version}", page_id)
    return result


async def duplicate_builder_page(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Duplicate a builder page with a new slug."""
    page = await _generic_get(T_PAGE, page_id, tenant_id, "BuilderPage")
    original_title = page.get("title", "")
    original_slug = page.get("slug", "")

    new_title = f"{original_title} (Copy)"
    new_slug = f"{original_slug}-copy"

    # Ensure unique slug
    existing = await query_table(T_PAGE, select="id", where={"slug": new_slug}, tenant_id=tenant_id)
    if existing.get("data"):
        counter = 1
        while True:
            candidate = f"{new_slug}-{counter}"
            check = await query_table(T_PAGE, select="id", where={"slug": candidate}, tenant_id=tenant_id)
            if not check.get("data"):
                new_slug = candidate
                break
            counter += 1

    new_data = {
        "tenantId": tenant_id,
        "title": new_title,
        "slug": new_slug,
        "status": "draft",
        "template": page.get("template"),
        "schema": page.get("schema"),
        "seoTitle": page.get("seoTitle"),
        "seoDesc": page.get("seoDesc"),
        "ogImage": page.get("ogImage"),
        "canonical": page.get("canonical"),
        "schemaMarkup": page.get("schemaMarkup"),
        "version": 1,
    }

    result = await insert_record(T_PAGE, new_data)
    await _log_activity(tenant_id, user, "duplicate", "builder", f"Duplicated page '{original_title}'", page_id)
    return result


async def list_builder_page_revisions(page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """List revisions for a builder page."""
    result = await query_table(
        T_REVISION,
        select="*",
        where={"pageId": page_id},
        order="version.desc",
        tenant_id=tenant_id,
    )
    return {"data": result.get("data", [])}


async def create_builder_page_revision(page_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    """Create a manual revision snapshot."""
    page = await _generic_get(T_PAGE, page_id, tenant_id, "BuilderPage")
    new_version = page.get("version", 0) + 1

    record = {
        "tenantId": tenant_id,
        "pageId": page_id,
        "pageData": data.get("pageData", page.get("schema", page.get("pageData", "{}"))),
        "version": new_version,
        "label": data.get("label", f"Revision v{new_version}"),
        "createdBy": user.userId,
    }
    result = await insert_record(T_REVISION, record)

    # Increment page version
    await update_record(T_PAGE, page_id, {"version": new_version})
    await _log_activity(tenant_id, user, "create_revision", "builder", f"Created revision v{new_version}", page_id)
    return result


async def restore_builder_revision(rev_id: str, page_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Restore a page to a specific revision."""
    revision = await query_table(T_REVISION, select="*", where={"id": rev_id}, tenant_id=tenant_id)
    if not revision.get("data"):
        raise NotFoundException(resource="Revision")

    rev_data = revision["data"][0]
    page_data = rev_data.get("pageData", "{}")

    result = await update_record(T_PAGE, page_id, {
        "schema": page_data,
        "pageData": page_data,
        "version": rev_data.get("version", 0),
    })
    await _log_activity(tenant_id, user, "restore", "builder", f"Restored revision v{rev_data.get('version')}", page_id)
    return result


async def list_all_revisions(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    """List all revisions across all pages."""
    return await _generic_list(T_REVISION, tenant_id, params, search_fields=["label"], order="createdAt.desc")


# ── Builder Templates ──────────────────────────────────────────────────────────


async def list_builder_templates(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_PAGE_TEMPLATE, select="*", order="name.asc", tenant_id=tenant_id)
    return {"data": result.get("data", [])}


async def create_builder_template(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    if not data.get("name"):
        raise ValidationException(message="Template name is required")
    data = _serialize_json_fields(data, "schema", "thumbnail")
    result = await _generic_create(T_PAGE_TEMPLATE, tenant_id, data)
    await _log_activity(tenant_id, user, "create", "builder_templates", f"Created template: {data.get('name')}", result.get("id"))
    return result


async def get_builder_template(template_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    return await _generic_get(T_PAGE_TEMPLATE, template_id, tenant_id, "PageTemplate")


async def update_builder_template(template_id: str, tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    data = _serialize_json_fields(data, "schema", "thumbnail")
    result = await _generic_update(T_PAGE_TEMPLATE, template_id, tenant_id, data, "PageTemplate")
    await _log_activity(tenant_id, user, "update", "builder_templates", "Updated template", template_id)
    return result


async def delete_builder_template(template_id: str, tenant_id: str, user: AuthUser) -> dict[str, Any]:
    await _log_activity(tenant_id, user, "delete", "builder_templates", "Deleted template", template_id)
    return await _generic_delete(T_PAGE_TEMPLATE, template_id, tenant_id, "PageTemplate")


# ── Builder Theme ──────────────────────────────────────────────────────────────


async def get_builder_theme(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_SETTING, select="*", where={"key": "builder_theme"}, tenant_id=tenant_id)
    items = result.get("data", [])
    if items:
        value = items[0].get("value", "{}")
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except Exception:
                return {"value": value}
        return value
    return {}


async def update_builder_theme(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    import json

    theme_value = data.get("theme", data)
    if not isinstance(theme_value, str):
        theme_value = json.dumps(theme_value)

    # Upsert theme setting
    existing = await query_table(T_SETTING, select="id", where={"key": "builder_theme"}, tenant_id=tenant_id)
    if existing.get("data"):
        record_id = existing["data"][0]["id"]
        result = await update_record(T_SETTING, record_id, {"value": theme_value})
    else:
        result = await insert_record(T_SETTING, {
            "tenantId": tenant_id,
            "key": "builder_theme",
            "value": theme_value,
            "category": "builder",
        })
    await _log_activity(tenant_id, user, "update", "builder_theme", "Updated builder theme")
    return result


# ════════════════════════════════════════════════════════════════════════════════
# Activity Log
# ════════════════════════════════════════════════════════════════════════════════


async def list_activity(tenant_id: str, user: AuthUser, params: dict[str, Any]) -> dict[str, Any]:
    return await _generic_list(T_ACTIVITY_LOG, tenant_id, params, search_fields=["action", "section", "details"], order="createdAt.desc")


async def create_activity_entry(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    data["userId"] = user.userId
    result = await _generic_create(T_ACTIVITY_LOG, tenant_id, data)
    return result


# ════════════════════════════════════════════════════════════════════════════════
# Analytics
# ════════════════════════════════════════════════════════════════════════════════


async def get_analytics(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    """Get CMS analytics summary."""
    total_blogs = await count_records(T_BLOG, tenant_id=tenant_id)
    published_blogs = await count_records(T_BLOG, {"status": "published"}, tenant_id=tenant_id)
    total_pages = await count_records(T_PAGE, tenant_id=tenant_id)
    published_pages = await count_records(T_PAGE, {"status": "published"}, tenant_id=tenant_id)
    total_services = await count_records(T_SERVICE, tenant_id=tenant_id)
    total_projects = await count_records(T_PROJECT, tenant_id=tenant_id)
    total_media = await count_records(T_MEDIA, tenant_id=tenant_id)
    total_career_apps = await count_records(T_CAREER_APP, tenant_id=tenant_id)
    total_contacts = await count_records(T_CONTACT, tenant_id=tenant_id)
    open_careers = await count_records(T_CAREER_JOB, {"status": "open"}, tenant_id=tenant_id)

    return {
        "blogs": {"total": total_blogs, "published": published_blogs},
        "pages": {"total": total_pages, "published": published_pages},
        "services": {"total": total_services},
        "projects": {"total": total_projects},
        "media": {"total": total_media},
        "careers": {"open": open_careers, "applications": total_career_apps},
        "contact": {"total": total_contacts},
    }


# ════════════════════════════════════════════════════════════════════════════════
# Settings
# ════════════════════════════════════════════════════════════════════════════════


async def get_settings(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_SETTING, select="*", order="key.asc", tenant_id=tenant_id)
    items = result.get("data", [])
    settings: dict[str, Any] = {}
    for item in items:
        val = item.get("value")
        if isinstance(val, str):
            try:
                import json
                val = json.loads(val)
            except Exception:
                pass
        settings[item.get("key", "")] = val
    return {"data": settings}


async def update_settings_bulk(tenant_id: str, user: AuthUser, settings: list[dict[str, Any]]) -> dict[str, Any]:
    """Bulk upsert CMS settings."""
    results = []
    for item in settings:
        if not item.get("key"):
            continue
        value = item.get("value")
        if not isinstance(value, str) and value is not None:
            import json
            value = json.dumps(value)
        update_data = {"value": value, "category": item.get("category"), "description": item.get("description")}

        existing = await query_table(T_SETTING, select="id", where={"key": item["key"]}, tenant_id=tenant_id)
        if existing.get("data"):
            record_id = existing["data"][0]["id"]
            result = await update_record(T_SETTING, record_id, update_data)
            results.append(result)
        else:
            record = dict(update_data)
            record["tenantId"] = tenant_id
            record["key"] = item["key"]
            result = await insert_record(T_SETTING, record)
            results.append(result)

    await _log_activity(tenant_id, user, "update", "settings", f"Updated {len(results)} settings")
    return {"data": results}


# ════════════════════════════════════════════════════════════════════════════════
# Footer
# ════════════════════════════════════════════════════════════════════════════════


async def get_footer(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_FOOTER, select="*", tenant_id=tenant_id)
    items = result.get("data", [])
    if items:
        return items[0]
    return {}


async def update_footer(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    import json

    data = _serialize_json_fields(data, "content", "columns", "socialLinks")

    # Upsert footer
    existing = await query_table(T_FOOTER, select="id", tenant_id=tenant_id)
    if existing.get("data"):
        record_id = existing["data"][0]["id"]
        result = await update_record(T_FOOTER, record_id, data)
    else:
        record = dict(data)
        record["tenantId"] = tenant_id
        result = await insert_record(T_FOOTER, record)

    await _log_activity(tenant_id, user, "update", "footer", "Updated footer")
    return result


# ════════════════════════════════════════════════════════════════════════════════
# About
# ════════════════════════════════════════════════════════════════════════════════


async def get_about(tenant_id: str, user: AuthUser) -> dict[str, Any]:
    result = await query_table(T_SETTING, select="*", where={"key": "about_page"}, tenant_id=tenant_id)
    items = result.get("data", [])
    if items:
        value = items[0].get("value", "{}")
        if isinstance(value, str):
            try:
                import json
                return json.loads(value)
            except Exception:
                return {"value": value}
        return value
    return {}


async def update_about(tenant_id: str, user: AuthUser, data: dict[str, Any]) -> dict[str, Any]:
    import json

    if not isinstance(data.get("content"), str) and data.get("content") is not None:
        data["content"] = json.dumps(data["content"])
    if not isinstance(data.get("values"), str) and data.get("values") is not None:
        data["values"] = json.dumps(data["values"])
    if not isinstance(data.get("teamSection"), str) and data.get("teamSection") is not None:
        data["teamSection"] = json.dumps(data["teamSection"])
    if not isinstance(data.get("historySection"), str) and data.get("historySection") is not None:
        data["historySection"] = json.dumps(data["historySection"])

    value = json.dumps({
        "content": data.get("content"),
        "mission": data.get("mission"),
        "vision": data.get("vision"),
        "values": data.get("values"),
        "teamSection": data.get("teamSection"),
        "historySection": data.get("historySection"),
    })

    existing = await query_table(T_SETTING, select="id", where={"key": "about_page"}, tenant_id=tenant_id)
    if existing.get("data"):
        record_id = existing["data"][0]["id"]
        result = await update_record(T_SETTING, record_id, {"value": value})
    else:
        result = await insert_record(T_SETTING, {
            "tenantId": tenant_id,
            "key": "about_page",
            "value": value,
            "category": "cms",
        })

    await _log_activity(tenant_id, user, "update", "about", "Updated about page")
    return result


# ════════════════════════════════════════════════════════════════════════════════
# Public Landing
# ════════════════════════════════════════════════════════════════════════════════


async def get_public_landing() -> dict[str, Any]:
    """Get public landing page data (no auth required)."""
    hero_result = await query_table(T_HERO, select="*", where={"isActive": True}, order="publishedAt.desc", limit=1)
    hero = hero_result.get("data", [])
    if not hero:
        hero_result = await query_table(T_HERO, select="*", order="createdAt.desc", limit=1)
        hero = hero_result.get("data", [])

    services_result = await query_table(T_SERVICE, select="*", where={"status": "published", "isEnabled": True}, order="displayOrder.asc")
    testimonials_result = await query_table(T_TESTIMONIAL, select="*", where={"status": "active", "isEnabled": True}, order="displayOrder.asc")

    return {
        "hero": hero[0] if hero else None,
        "services": services_result.get("data", []),
        "testimonials": testimonials_result.get("data", []),
    }
