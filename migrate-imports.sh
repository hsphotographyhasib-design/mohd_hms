#!/bin/bash
# Comprehensive import migration script
# Updates all import paths from old structure to new modular structure
# Order matters: more specific paths MUST be replaced BEFORE less specific ones

cd /home/z/my-project

# Find all .ts and .tsx files (excluding node_modules, .next, etc.)
FILES=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/.next/*")

echo "Updating imports in $(echo $FILES | wc -w) files..."

# Helper function: replace import path in all files
replace() {
  local old="$1"
  local new="$2"
  # Use perl for more reliable replacement (handles word boundaries better)
  echo "  $old → $new"
  echo "$FILES" | xargs perl -pi -e "s|\Q$old\E|$new|g" 2>/dev/null
}

# ============================================================
# MOST SPECIFIC FIRST (longer paths before shorter ones)
# ============================================================

# --- Database (most specific first) ---
replace "@/lib/supabase-db.full" "@/core/database/supabase-db.full"
replace "@/lib/supabase-db" "@/core/database/supabase-db"
replace "@/lib/supabase-rest" "@/core/database/supabase-rest"
replace "@/lib/supabase-client" "@/core/database/supabase-client"
replace "@/lib/supabase" "@/core/database/supabase"
replace "@/lib/prisma" "@/core/database/prisma"
replace "@/lib/db-sync" "@/core/database/db-sync"
replace "@/lib/db-utils" "@/core/database/db-utils"
replace "@/lib/db" "@/core/database/db"

# --- Auth (specific first) ---
replace "@/lib/auth-schemas" "@/core/auth/auth-schemas"
replace "@/lib/nextauth" "@/core/auth/nextauth"
replace "@/lib/password-reset" "@/core/auth/password-reset"
replace "@/lib/auth" "@/core/auth/auth-lib"

# --- Email ---
replace "@/lib/email-service" "@/core/email/service"
replace "@/lib/email" "@/core/email/email"

# --- WhatsApp ---
replace "@/lib/whatsapp-service" "@/core/whatsapp/service"
replace "@/lib/whatsapp" "@/core/whatsapp/engine"

# --- Firebase ---
replace "@/lib/fcm-admin" "@/core/firebase/fcm-admin"
replace "@/lib/fcm" "@/core/firebase/fcm"
replace "@/lib/firebase" "@/core/firebase/firebase"

# --- RBAC ---
replace "@/lib/rbac" "@/core/permissions/rbac"

# --- Notifications services ---
replace "@/lib/notifications" "@/modules/notifications/services"

# --- AI ---
replace "@/lib/ai" "@/core/ai"

# --- Workflow ---
replace "@/lib/workflow" "@/core/workflow"

# --- Maps ---
replace "@/lib/maps" "@/core/maps"

# --- Storage ---
replace "@/lib/storage" "@/core/storage"

# --- Error utils ---
replace "@/lib/error-utils" "@/core/errors/error-utils"

# --- Config/Env ---
replace "@/lib/env" "@/core/config/env-lib"

# --- Rate limiter ---
replace "@/lib/rate-limiter" "@/core/middleware/rate-limiter"

# --- Utils (specific first) ---
replace "@/lib/number-to-words" "@/core/utils/number-to-words"
replace "@/lib/label-pdf" "@/core/utils/label-pdf"
replace "@/lib/qr-utils" "@/core/utils/qr-utils"
replace "@/lib/phone" "@/core/utils/phone"
replace "@/lib/api-response" "@/core/utils/api-response"
replace "@/lib/utils" "@/core/utils/utils"

# --- Constants ---
replace "@/lib/label-templates" "@/core/constants/label-templates"
replace "@/lib/quick-actions-config" "@/core/constants/quick-actions-config"
replace "@/lib/company" "@/core/constants/company"
replace "@/lib/countries" "@/core/constants/countries"

# --- Module-specific lib files ---
replace "@/lib/dashboard-scope" "@/modules/dashboard/services/dashboard-scope"
replace "@/lib/quotation-helpers" "@/modules/quotations/services/quotation-helpers"

# ============================================================
# COMPONENTS → NEW LOCATIONS
# ============================================================

# --- UI Components (shared) ---
replace "@/components/ui/" "@/shared/ui/"

# --- App Shell ---
replace "@/components/nav/" "@/app-shell/nav/"
replace "@/components/providers/" "@/app-shell/providers/"
replace "@/components/app/app-shell" "@/app-shell/app-shell"
replace "@/components/app/app-entry" "@/app-shell/app-entry"
replace "@/components/app/sidebar" "@/app-shell/sidebar"
replace "@/components/app/header" "@/app-shell/header"
replace "@/components/app/login-view" "@/app-shell/login-view"
replace "@/components/app/landing-page" "@/landing/components/landing-page"
replace "@/components/app/" "@/app-shell/"

# --- Session → Core Auth ---
replace "@/components/session/" "@/core/auth/session/"

# --- Auth shell → Core Auth ---
replace "@/components/auth/" "@/core/auth/components/"

# --- Error → Core Errors ---
replace "@/components/error/" "@/core/errors/components/"

# --- Setup → Core Config ---
replace "@/components/setup/" "@/core/config/setup/"

# --- Layout → Shared ---
replace "@/components/layout/" "@/shared/layouts/"

# --- Brand → Shared ---
replace "@/components/brand/" "@/shared/components/brand/"

# --- Shared components ---
replace "@/components/shared/" "@/shared/components/"

# --- Landing ---
replace "@/components/landing/" "@/landing/components/"
replace "@/components/website/" "@/landing/website/"

# --- Customer Portal ---
replace "@/components/customer-app/" "@/customer-portal/app/"
replace "@/components/customer/" "@/customer-portal/components/"

# --- Mobile ---
replace "@/components/mobile/" "@/mobile-app/components/"

# --- Admin → Settings ---
replace "@/components/admin/" "@/modules/settings/components/admin/"

# --- Notifications UI ---
replace "@/components/notifications/" "@/modules/notifications/components/ui/"

# --- Maps components ---
replace "@/components/maps/" "@/core/maps/components/"

# --- Module Components ---
replace "@/components/modules/complaints/" "@/modules/complaints/components/"
replace "@/components/modules/work-orders/" "@/modules/work-orders/components/"
replace "@/components/modules/equipment/" "@/modules/equipment/components/"
replace "@/components/modules/inventory/" "@/modules/inventory/components/"
replace "@/components/modules/customers/" "@/modules/customers/components/"
replace "@/components/modules/quotations/" "@/modules/quotations/components/"
replace "@/components/modules/invoices/" "@/modules/invoices/components/"
replace "@/components/modules/finance/" "@/modules/finance/components/"
replace "@/components/modules/hr/" "@/modules/hr/components/"
replace "@/components/modules/employees/" "@/modules/hr/components/"
replace "@/components/modules/cms/" "@/modules/cms/components/"
replace "@/components/modules/whatsapp/" "@/modules/whatsapp/components/"
replace "@/components/modules/email/" "@/modules/email/components/"
replace "@/components/modules/notifications/" "@/modules/notifications/components/"
replace "@/components/modules/settings/" "@/modules/settings/components/"
replace "@/components/modules/system/" "@/modules/settings/components/"
replace "@/components/modules/dashboard/" "@/modules/dashboard/components/"
replace "@/components/modules/sessions/" "@/modules/sessions/components/"
replace "@/components/modules/reports/" "@/modules/reports/components/"
replace "@/components/modules/pm/" "@/modules/pm/components/"
replace "@/components/modules/technicians/" "@/modules/technicians/components/"
replace "@/components/modules/vehicles/" "@/modules/vehicles/components/"
replace "@/components/modules/purchases/" "@/modules/purchases/components/"
replace "@/components/modules/documents/" "@/modules/documents/components/"
replace "@/components/modules/users/" "@/modules/users/components/"

# ============================================================
# HOOKS
# ============================================================
replace "@/hooks/use-fcm" "@/core/firebase/hooks/use-fcm"
replace "@/hooks/use-notification-polling" "@/modules/notifications/hooks/use-notification-polling"
replace "@/hooks/use-notification" "@/modules/notifications/hooks/use-notification"
replace "@/hooks/use-dashboard-queries" "@/modules/dashboard/hooks/use-dashboard-queries"
replace "@/hooks/use-error-handler" "@/core/errors/hooks/use-error-handler"
replace "@/hooks/use-drag-scroll" "@/shared/hooks/use-drag-scroll"
replace "@/hooks/use-menu-preferences" "@/shared/hooks/use-menu-preferences"
replace "@/hooks/use-mobile" "@/shared/hooks/use-mobile"
replace "@/hooks/use-toast" "@/shared/hooks/use-toast"
replace "@/hooks/use-secure-fetch" "@/shared/hooks/use-secure-fetch"

# ============================================================
# STORE
# ============================================================
replace "@/store/page-builder-store" "@/modules/cms/page-builder/store"
replace "@/store/customer-app" "@/customer-portal/store"
replace "@/store" "@/app-shell/store"

# ============================================================
# TYPES
# ============================================================
replace "@/types/page-builder" "@/modules/cms/page-builder/types"
replace "@/types" "@/core/types"

# ============================================================
# CORE (already in core/) - self-references should be fine
# ============================================================
# These were already in src/core/ so @/core/ paths should still work

echo ""
echo "=== Import migration complete ==="