# Task 4 - CMS API Routes Builder (Part 2)

## Work Record

### Task Description
Build 15 CMS API route files following existing patterns from /api/cms/services/route.ts.

### Files Created (15 total)

1. **`/src/app/api/cms/projects/route.ts`** - GET (paginated list with search, category, status, isFeatured filters) / POST (create with auto-slug)
2. **`/src/app/api/cms/projects/[id]/route.ts`** - GET / PUT / DELETE for single project
3. **`/src/app/api/cms/blogs/categories/route.ts`** - GET (all categories, no pagination) / POST (create with auto-slug)
4. **`/src/app/api/cms/blogs/categories/[id]/route.ts`** - PUT / DELETE for single category
5. **`/src/app/api/cms/blogs/route.ts`** - GET (paginated with search, status, categoryId, isFeatured filters; includes category relation) / POST (create with auto-slug)
6. **`/src/app/api/cms/blogs/[id]/route.ts`** - GET (increments viewCount by 1) / PUT / DELETE with category relation
7. **`/src/app/api/cms/testimonials/route.ts`** - GET (paginated, status/isEnabled filters, sortBy displayOrder) / POST
8. **`/src/app/api/cms/testimonials/[id]/route.ts`** - GET / PUT / DELETE
9. **`/src/app/api/cms/careers/route.ts`** - GET (paginated with search, department, status filters) / POST
10. **`/src/app/api/cms/careers/[id]/route.ts`** - GET / PUT / DELETE
11. **`/src/app/api/cms/careers/[id]/applications/route.ts`** - GET (list applications for a job, verifies tenant) / POST (create application)
12. **`/src/app/api/cms/contact/route.ts`** - GET (admin auth, paginated with search, status, source filters) / **POST (PUBLIC - no auth required, auto-detects tenant)**
13. **`/src/app/api/cms/contact/[id]/route.ts`** - GET / PUT (update status, reply, assignedToId; auto-sets replyAt)
14. **`/src/app/api/cms/media/route.ts`** - GET (paginated with search, folder, category filters) / POST (stores metadata with placeholder URL)
15. **`/src/app/api/cms/media/[id]/route.ts`** - GET / DELETE

### Patterns Followed
- `getAuthUser()` helper with `headers()` + `verifyToken(auth.slice(7))`
- `isAdmin()` type guard checking `role === 'super_admin' || role === 'admin'`
- `generateSlug()` for auto-slug from title/name
- `format*()` functions for consistent JSON serialization (Date → ISO string)
- `params: Promise<{ id: string }>` for Next.js 16 dynamic routes
- All queries filtered by `tenantId` from JWT
- List endpoints return `{ data, total, page, pageSize, pagination: { page, pageSize, total, totalPages } }`
- DELETE endpoints return `{ success: true }`
- Proper Prisma types (`Prisma.CmsProjectWhereInput`, etc.)

### Key Design Decisions
- Contact POST is public (no auth) — falls back to first active tenant if no tenantId provided
- Blog GET by ID increments viewCount by 1 before returning
- Contact PUT auto-sets `replyAt: new Date()` when a reply is provided
- Media POST stores `user.userId` as `uploadedById` and uses placeholder URL if none provided
- Career applications verify the parent job belongs to the tenant before operations

### Verification
- `bun run lint` passes with zero errors/warnings
- Dev server running with no errors