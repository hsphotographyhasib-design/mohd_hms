-- ============================================================================
-- PostgreSQL DDL generated from Prisma schema (prisma/schema.prisma)
-- 89 tables | 171 indexes | All FKs with ON DELETE behavior
-- NOTE: @updatedAt fields are NOT auto-updated in this DDL.
--       Consider adding a trigger or application-level update logic.
-- NOTE: gen_random_uuid() is used as a stand-in for cuid().
--       If you need actual CUIDs, handle this at the application layer.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DROP TABLE IF EXISTS (reverse dependency order with CASCADE)
-- ============================================================================

DROP TABLE IF EXISTS "TermsAcceptance" CASCADE;
DROP TABLE IF EXISTS "WhatsAppDeliveryLog" CASCADE;
DROP TABLE IF EXISTS "PasswordResetOtp" CASCADE;
DROP TABLE IF EXISTS "PasswordResetToken" CASCADE;
DROP TABLE IF EXISTS "Device" CASCADE;
DROP TABLE IF EXISTS "LoginSession" CASCADE;
DROP TABLE IF EXISTS "OtpCode" CASCADE;
DROP TABLE IF EXISTS "AuthAuditLog" CASCADE;
DROP TABLE IF EXISTS "EmailLog" CASCADE;
DROP TABLE IF EXISTS "EmailTemplate" CASCADE;
DROP TABLE IF EXISTS "CmsActivityLog" CASCADE;
DROP TABLE IF EXISTS "CmsForm" CASCADE;
DROP TABLE IF EXISTS "CmsPopup" CASCADE;
DROP TABLE IF EXISTS "CmsAnnouncement" CASCADE;
DROP TABLE IF EXISTS "CmsFooter" CASCADE;
DROP TABLE IF EXISTS "CmsSeo" CASCADE;
DROP TABLE IF EXISTS "CmsMedia" CASCADE;
DROP TABLE IF EXISTS "CmsContactMessage" CASCADE;
DROP TABLE IF EXISTS "CmsCareerApplication" CASCADE;
DROP TABLE IF EXISTS "CmsCareerJob" CASCADE;
DROP TABLE IF EXISTS "CmsTestimonial" CASCADE;
DROP TABLE IF EXISTS "CmsBlog" CASCADE;
DROP TABLE IF EXISTS "CmsBlogCategory" CASCADE;
DROP TABLE IF EXISTS "CmsProject" CASCADE;
DROP TABLE IF EXISTS "CmsIndustry" CASCADE;
DROP TABLE IF EXISTS "CmsService" CASCADE;
DROP TABLE IF EXISTS "CmsHero" CASCADE;
DROP TABLE IF EXISTS "CmsSetting" CASCADE;
DROP TABLE IF EXISTS "HrAnnouncement" CASCADE;
DROP TABLE IF EXISTS "HrDisciplinaryAction" CASCADE;
DROP TABLE IF EXISTS "HrExpenseClaim" CASCADE;
DROP TABLE IF EXISTS "HrTravelRequest" CASCADE;
DROP TABLE IF EXISTS "HrMedicalRecord" CASCADE;
DROP TABLE IF EXISTS "HrVisitor" CASCADE;
DROP TABLE IF EXISTS "HrEmployeeDocument" CASCADE;
DROP TABLE IF EXISTS "HrAssetAssignment" CASCADE;
DROP TABLE IF EXISTS "HrTrainingRecord" CASCADE;
DROP TABLE IF EXISTS "HrTraining" CASCADE;
DROP TABLE IF EXISTS "HrPerformanceReview" CASCADE;
DROP TABLE IF EXISTS "HrCandidate" CASCADE;
DROP TABLE IF EXISTS "HrJobPosition" CASCADE;
DROP TABLE IF EXISTS "HrOvertimeRequest" CASCADE;
DROP TABLE IF EXISTS "HrPayroll" CASCADE;
DROP TABLE IF EXISTS "HrLeaveRequest" CASCADE;
DROP TABLE IF EXISTS "HrLeaveBalance" CASCADE;
DROP TABLE IF EXISTS "HrLeaveType" CASCADE;
DROP TABLE IF EXISTS "HrEmployee" CASCADE;
DROP TABLE IF EXISTS "HrHoliday" CASCADE;
DROP TABLE IF EXISTS "HrShiftSchedule" CASCADE;
DROP TABLE IF EXISTS "HrShift" CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "LeaveRequest" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "ComplaintTimeline" CASCADE;
DROP TABLE IF EXISTS "VehicleLog" CASCADE;
DROP TABLE IF EXISTS "Vehicle" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrder" CASCADE;
DROP TABLE IF EXISTS "PriceBookEntry" CASCADE;
DROP TABLE IF EXISTS "PriceBook" CASCADE;
DROP TABLE IF EXISTS "StockMovement" CASCADE;
DROP TABLE IF EXISTS "ItemSupplier" CASCADE;
DROP TABLE IF EXISTS "WarehouseStock" CASCADE;
DROP TABLE IF EXISTS "Warehouse" CASCADE;
DROP TABLE IF EXISTS "InventoryItem" CASCADE;
DROP TABLE IF EXISTS "InventorySubcategory" CASCADE;
DROP TABLE IF EXISTS "InventoryCategory" CASCADE;
DROP TABLE IF EXISTS "Quotation" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "PmSchedule" CASCADE;
DROP TABLE IF EXISTS "ChecklistTemplate" CASCADE;
DROP TABLE IF EXISTS "WorkOrderMaterial" CASCADE;
DROP TABLE IF EXISTS "WorkOrder" CASCADE;
DROP TABLE IF EXISTS "Complaint" CASCADE;
DROP TABLE IF EXISTS "ScanLog" CASCADE;
DROP TABLE IF EXISTS "EquipmentQrCode" CASCADE;
DROP TABLE IF EXISTS "Equipment" CASCADE;
DROP TABLE IF EXISTS "CustomerFeedback" CASCADE;
DROP TABLE IF EXISTS "CustomerReport" CASCADE;
DROP TABLE IF EXISTS "BroadcastLog" CASCADE;
DROP TABLE IF EXISTS "ConversationThread" CASCADE;
DROP TABLE IF EXISTS "WhatsAppMessage" CASCADE;
DROP TABLE IF EXISTS "WhatsAppSession" CASCADE;
DROP TABLE IF EXISTS "WhatsAppTemplate" CASCADE;
DROP TABLE IF EXISTS "WhatsAppConfig" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "Department" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Tenant" CASCADE;

-- ============================================================================
-- CREATE TABLE statements
-- ============================================================================

-- --------------- Tenant ---------------
CREATE TABLE "Tenant" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "domain"    TEXT NOT NULL,
  "logo"      TEXT,
  "address"   TEXT,
  "phone"     TEXT,
  "email"     TEXT,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "plan"      TEXT NOT NULL DEFAULT 'professional',
  "maxUsers"  INTEGER NOT NULL DEFAULT 50,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Tenant_domain_key" UNIQUE ("domain")
);

-- --------------- Department ---------------
CREATE TABLE "Department" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "headId"      TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- User ---------------
CREATE TABLE "User" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "email"           TEXT NOT NULL,
  "passwordHash"    TEXT,
  "name"            TEXT NOT NULL,
  "phone"           TEXT,
  "avatar"          TEXT,
  "role"            TEXT NOT NULL DEFAULT 'technician',
  "employeeNumber"  TEXT,
  "departmentId"    TEXT,
  "authProvider"    TEXT,
  "googleId"        TEXT,
  "isActive"        BOOLEAN NOT NULL DEFAULT true,
  "isOnline"        BOOLEAN NOT NULL DEFAULT false,
  "lastLogin"       TIMESTAMPTZ,
  "gpsLocation"     TEXT,
  "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "User_tenantId_email_key" UNIQUE ("tenantId", "email"),
  CONSTRAINT "User_googleId_key" UNIQUE ("googleId"),
  CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
);

-- --------------- Customer ---------------
CREATE TABLE "Customer" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "name"               TEXT NOT NULL,
  "email"              TEXT,
  "phone"              TEXT NOT NULL,
  "address"            TEXT,
  "gpsLocation"        TEXT,
  "companyName"        TEXT,
  "customerNumber"     TEXT NOT NULL,
  "photo"              TEXT,
  "paymentTerms"       TEXT,
  "pic"                TEXT,
  "country"            TEXT DEFAULT 'Brunei',
  "district"           TEXT,
  "taxRate"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "isWhatsappVerified" BOOLEAN NOT NULL DEFAULT false,
  "whatsappId"         TEXT,
  "whatsappPhone"      TEXT,
  "lastWhatsappActivity" TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Customer_customerNumber_key" UNIQUE ("customerNumber"),
  CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- Equipment ---------------
CREATE TABLE "Equipment" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "customerId"      TEXT,
  "name"            TEXT NOT NULL,
  "category"        TEXT NOT NULL,
  "assetNumber"     TEXT NOT NULL,
  "qrCode"          TEXT NOT NULL,
  "qrId"            TEXT,
  "brand"           TEXT,
  "model"           TEXT,
  "serialNumber"    TEXT,
  "location"        TEXT,
  "building"        TEXT,
  "room"            TEXT,
  "installDate"     TIMESTAMPTZ,
  "warrantyExpiry"  TIMESTAMPTZ,
  "warrantyInfo"    TEXT,
  "status"          TEXT NOT NULL DEFAULT 'active',
  "condition"       TEXT NOT NULL DEFAULT 'good',
  "photos"          TEXT,
  "documents"       TEXT,
  "specifications"  TEXT,
  "notes"           TEXT,
  "scanCount"       INTEGER NOT NULL DEFAULT 0,
  "lastScannedAt"   TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Equipment_assetNumber_key" UNIQUE ("assetNumber"),
  CONSTRAINT "Equipment_qrCode_key" UNIQUE ("qrCode"),
  CONSTRAINT "Equipment_qrId_key" UNIQUE ("qrId"),
  CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "Equipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
);

-- --------------- EquipmentQrCode ---------------
CREATE TABLE "EquipmentQrCode" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "equipmentId"       TEXT NOT NULL,
  "qrId"              TEXT NOT NULL,
  "qrUrl"             TEXT NOT NULL,
  "isActive"          BOOLEAN NOT NULL DEFAULT true,
  "generatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "lastRegeneratedAt" TIMESTAMPTZ,
  "version"           INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "EquipmentQrCode_equipmentId_key" UNIQUE ("equipmentId"),
  CONSTRAINT "EquipmentQrCode_qrId_key" UNIQUE ("qrId"),
  CONSTRAINT "EquipmentQrCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "EquipmentQrCode_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id")
);

-- --------------- ScanLog ---------------
CREATE TABLE "ScanLog" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "equipmentId"   TEXT NOT NULL,
  "qrId"          TEXT NOT NULL,
  "scannedBy"     TEXT,
  "scannedByName" TEXT,
  "ipAddress"     TEXT,
  "userAgent"     TEXT,
  "device"        TEXT,
  "browser"       TEXT,
  "location"      TEXT,
  "referer"       TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ScanLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "ScanLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id")
);

-- --------------- Complaint ---------------
CREATE TABLE "Complaint" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "customerId"         TEXT NOT NULL,
  "equipmentId"        TEXT,
  "title"              TEXT NOT NULL,
  "description"        TEXT NOT NULL,
  "priority"           TEXT NOT NULL DEFAULT 'medium',
  "status"             TEXT NOT NULL DEFAULT 'NEW',
  "source"             TEXT NOT NULL DEFAULT 'admin',
  "category"           TEXT,
  "photos"             TEXT,
  "gpsLocation"        TEXT,
  "assignedToId"       TEXT,
  "supervisorId"       TEXT,
  "assignedBy"         TEXT,
  "assignedByRole"     TEXT,
  "assignedAt"         TIMESTAMPTZ,
  "lastReassignedAt"   TIMESTAMPTZ,
  "assignmentReason"   TEXT,
  "assignmentStatus"   TEXT NOT NULL DEFAULT 'UNASSIGNED',
  "reassignmentCount"  INTEGER NOT NULL DEFAULT 0,
  "slaResponseDeadline" TIMESTAMPTZ,
  "workOrderId"        TEXT,
  "invoiceId"          TEXT,
  "eta"                TEXT,
  "rejectionReason"    TEXT,
  "reworkReason"       TEXT,
  "customerSnapshot"   TEXT,
  "locationInfo"       TEXT,
  "resolutionNotes"    TEXT,
  "customerRating"     INTEGER,
  "customerFeedback"   TEXT,
  "acceptedAt"         TIMESTAMPTZ,
  "startedAt"          TIMESTAMPTZ,
  "completedAt"        TIMESTAMPTZ,
  "clientConfirmedAt"  TIMESTAMPTZ,
  "resolvedAt"         TIMESTAMPTZ,
  "closedAt"           TIMESTAMPTZ,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Complaint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "Complaint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id"),
  CONSTRAINT "Complaint_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id"),
  CONSTRAINT "Complaint_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id"),
  CONSTRAINT "Complaint_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id")
);

-- --------------- WorkOrder ---------------
CREATE TABLE "WorkOrder" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"            TEXT NOT NULL,
  "workOrderNumber"     TEXT,
  "complaintId"         TEXT,
  "customerId"          TEXT,
  "equipmentId"         TEXT,
  "assetId"             TEXT,
  "title"               TEXT NOT NULL,
  "description"         TEXT NOT NULL,
  "source"              TEXT NOT NULL DEFAULT 'manual',
  "reference"           TEXT,
  "status"              TEXT NOT NULL DEFAULT 'DRAFT',
  "priority"            TEXT NOT NULL DEFAULT 'medium',
  "type"                TEXT NOT NULL DEFAULT 'corrective',
  "category"            TEXT,
  "subCategory"         TEXT,
  "sla"                 TEXT,
  "estimatedHours"      DOUBLE PRECISION,
  "assignedToId"        TEXT,
  "supervisorId"        TEXT,
  "teamId"              TEXT,
  "createdBy"           TEXT,
  "scheduledDate"       TIMESTAMPTZ,
  "startTime"           TEXT,
  "dueDate"             TIMESTAMPTZ,
  "dueTime"             TEXT,
  "siteId"              TEXT,
  "building"            TEXT,
  "floor"               TEXT,
  "internalNotes"       TEXT,
  "checklistId"         TEXT,
  "permitRequired"      BOOLEAN NOT NULL DEFAULT false,
  "lockoutTagoutRequired" BOOLEAN NOT NULL DEFAULT false,
  "highRiskWork"        BOOLEAN NOT NULL DEFAULT false,
  "safetyEquipmentReq"  BOOLEAN NOT NULL DEFAULT false,
  "safetyNotes"         TEXT,
  "startedAt"           TIMESTAMPTZ,
  "completedAt"         TIMESTAMPTZ,
  "checkInGps"          TEXT,
  "checkOutGps"         TEXT,
  "laborHours"          DOUBLE PRECISION,
  "laborCost"           DOUBLE PRECISION,
  "materialCost"        DOUBLE PRECISION,
  "totalCost"           DOUBLE PRECISION,
  "notes"               TEXT,
  "photos"              TEXT,
  "beforePhotos"        TEXT,
  "afterPhotos"         TEXT,
  "videoUrl"            TEXT,
  "materialsUsed"       TEXT,
  "checklistData"       TEXT,
  "remarks"             TEXT,
  "technicianSignature" TEXT,
  "customerSignature"   TEXT,
  "serviceReportPdf"    TEXT,
  "attachments"         TEXT,
  "isLocked"            BOOLEAN NOT NULL DEFAULT false,
  "isDraft"             BOOLEAN NOT NULL DEFAULT false,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL,
  CONSTRAINT "WorkOrder_workOrderNumber_key" UNIQUE ("workOrderNumber"),
  CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "WorkOrder_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id"),
  CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id"),
  CONSTRAINT "WorkOrder_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id"),
  CONSTRAINT "WorkOrder_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id"),
  CONSTRAINT "WorkOrder_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id"),
  CONSTRAINT "WorkOrder_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id")
);

-- --------------- WorkOrderMaterial ---------------
CREATE TABLE "WorkOrderMaterial" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "workOrderId"     TEXT NOT NULL,
  "inventoryItemId" TEXT NOT NULL,
  "quantity"        INTEGER NOT NULL,
  "unitCost"        DOUBLE PRECISION NOT NULL,
  "totalCost"       DOUBLE PRECISION NOT NULL,
  CONSTRAINT "WorkOrderMaterial_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE,
  CONSTRAINT "WorkOrderMaterial_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id")
);

-- --------------- ChecklistTemplate ---------------
CREATE TABLE "ChecklistTemplate" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "description" TEXT,
  "items"       TEXT NOT NULL,
  "isDefault"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "ChecklistTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- PmSchedule ---------------
CREATE TABLE "PmSchedule" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "equipmentId"        TEXT NOT NULL,
  "title"              TEXT NOT NULL,
  "description"        TEXT,
  "frequency"          TEXT NOT NULL,
  "customDays"         INTEGER,
  "lastExecuted"       TIMESTAMPTZ,
  "nextDueDate"        TIMESTAMPTZ NOT NULL,
  "assignedToId"       TEXT,
  "status"             TEXT NOT NULL DEFAULT 'active',
  "checklistTemplateId" TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PmSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "PmSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id"),
  CONSTRAINT "PmSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
);

-- --------------- Quotation ---------------
CREATE TABLE "Quotation" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "customerId"    TEXT NOT NULL,
  "complaintId"   TEXT,
  "quotationNo"   TEXT,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "referenceNo"   TEXT,
  "projectName"   TEXT,
  "site"          TEXT,
  "preparedBy"    TEXT,
  "items"         TEXT NOT NULL,
  "terms"         TEXT,
  "currency"      TEXT NOT NULL DEFAULT 'BND',
  "subtotal"      DOUBLE PRECISION NOT NULL,
  "taxRate"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shipping"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"         DOUBLE PRECISION NOT NULL,
  "status"        TEXT NOT NULL DEFAULT 'DRAFT',
  "validUntil"    TIMESTAMPTZ,
  "approvedBy"    TEXT,
  "approvedAt"    TIMESTAMPTZ,
  "sentAt"        TIMESTAMPTZ,
  "acceptedAt"    TIMESTAMPTZ,
  "pdfUrl"        TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Quotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id"),
  CONSTRAINT "Quotation_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "User"("id")
);

-- --------------- Invoice ---------------
CREATE TABLE "Invoice" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "customerId"      TEXT NOT NULL,
  "workOrderId"     TEXT,
  "quotationId"     TEXT,
  "invoiceNumber"   TEXT NOT NULL,
  "title"           TEXT NOT NULL,
  "description"     TEXT,
  "items"           TEXT NOT NULL,
  "subtotal"        DOUBLE PRECISION NOT NULL,
  "taxRate"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax"             DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "shipping"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"           DOUBLE PRECISION NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'DRAFT',
  "currency"        TEXT NOT NULL DEFAULT 'BND',
  "referenceNo"     TEXT,
  "poReference"     TEXT,
  "paymentTerms"    TEXT,
  "dueDate"         TIMESTAMPTZ,
  "paidAt"          TIMESTAMPTZ,
  "paymentMethod"   TEXT,
  "paymentRef"      TEXT,
  "transactionId"   TEXT,
  "bankName"        TEXT,
  "bankAccountName" TEXT,
  "bankAccountNo"   TEXT,
  "sentVia"         TEXT,
  "pdfUrl"          TEXT,
  "notes"           TEXT,
  "terms"           TEXT,
  "shipToName"      TEXT,
  "shipToAddress"   TEXT,
  "shipToPhone"     TEXT,
  "shipToContact"   TEXT,
  "preparedBy"      TEXT,
  "createdBy"       TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Invoice_invoiceNumber_key" UNIQUE ("invoiceNumber"),
  CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id"),
  CONSTRAINT "Invoice_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id"),
  CONSTRAINT "Invoice_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id"),
  CONSTRAINT "Invoice_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id"),
  CONSTRAINT "Invoice_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "User"("id")
);

-- --------------- InventoryCategory ---------------
CREATE TABLE "InventoryCategory" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "code"         TEXT,
  "description"  TEXT,
  "icon"         TEXT,
  "color"        TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "InventoryCategory_tenantId_name_key" UNIQUE ("tenantId", "name"),
  CONSTRAINT "InventoryCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- InventorySubcategory ---------------
CREATE TABLE "InventorySubcategory" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "categoryId"   TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "code"         TEXT,
  "description"  TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "InventorySubcategory_tenantId_categoryId_name_key" UNIQUE ("tenantId", "categoryId", "name"),
  CONSTRAINT "InventorySubcategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "InventorySubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id") ON DELETE CASCADE
);

-- --------------- InventoryItem ---------------
CREATE TABLE "InventoryItem" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "itemCode"           TEXT,
  "sku"                TEXT,
  "barcode"            TEXT,
  "qrCode"             TEXT,
  "name"               TEXT NOT NULL,
  "shortName"          TEXT,
  "itemType"           TEXT NOT NULL DEFAULT 'inventory',
  "categoryId"         TEXT,
  "subcategoryId"      TEXT,
  "description"        TEXT,
  "shortDescription"   TEXT,
  "brand"              TEXT,
  "manufacturer"       TEXT,
  "model"              TEXT,
  "partNumber"         TEXT,
  "serialNumber"       TEXT,
  "unit"               TEXT NOT NULL DEFAULT 'pcs',
  "unitWeight"         DOUBLE PRECISION,
  "dimensions"         TEXT,
  "purchaseCost"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "averageCost"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "standardCost"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastPurchaseCost"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sellingPrice"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dealerPrice"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "contractorPrice"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "customerPrice"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vipPrice"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "internalCost"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "labourCost"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "installationCost"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "serviceCost"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "transportationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mobilizationCost"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "equipmentRental"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "emergencyCallOut"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "afterHoursCharge"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "weekendCharge"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "publicHolidayCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"           TEXT NOT NULL DEFAULT 'BND',
  "quantity"           INTEGER NOT NULL DEFAULT 0,
  "minStock"           INTEGER NOT NULL DEFAULT 0,
  "maxStock"           INTEGER,
  "reorderLevel"       INTEGER NOT NULL DEFAULT 0,
  "safetyStock"        INTEGER NOT NULL DEFAULT 0,
  "unitCost"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "supplier"           TEXT,
  "location"           TEXT,
  "photos"             TEXT,
  "attachments"        TEXT,
  "technicalDatasheet" TEXT,
  "msds"               TEXT,
  "warranty"           TEXT,
  "warrantyExpiry"     TIMESTAMPTZ,
  "countryOfOrigin"    TEXT,
  "hsCode"             TEXT,
  "tags"               TEXT,
  "status"             TEXT NOT NULL DEFAULT 'draft',
  "approvalStatus"     TEXT NOT NULL DEFAULT 'pending',
  "approvedBy"         TEXT,
  "approvedAt"         TIMESTAMPTZ,
  "version"            INTEGER NOT NULL DEFAULT 1,
  "hourlyRate"         DOUBLE PRECISION,
  "dailyRate"          DOUBLE PRECISION,
  "overtimeRate"       DOUBLE PRECISION,
  "weekendRate"        DOUBLE PRECISION,
  "publicHolidayRate"  DOUBLE PRECISION,
  "dailyRentalRate"    DOUBLE PRECISION,
  "monthlyRentalRate"  DOUBLE PRECISION,
  "estimatedHours"     DOUBLE PRECISION,
  "requiredSkills"     TEXT,
  "sop"                TEXT,
  "remarks"            TEXT,
  "isActive"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "InventoryItem_itemCode_key" UNIQUE ("itemCode"),
  CONSTRAINT "InventoryItem_sku_key" UNIQUE ("sku"),
  CONSTRAINT "InventoryItem_barcode_key" UNIQUE ("barcode"),
  CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "InventoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InventoryCategory"("id"),
  CONSTRAINT "InventoryItem_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "InventorySubcategory"("id")
);

-- --------------- Warehouse ---------------
CREATE TABLE "Warehouse" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "code"        TEXT,
  "type"        TEXT NOT NULL DEFAULT 'main',
  "address"     TEXT,
  "manager"     TEXT,
  "phone"       TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Warehouse_tenantId_name_key" UNIQUE ("tenantId", "name"),
  CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- WarehouseStock ---------------
CREATE TABLE "WarehouseStock" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "itemId"      TEXT NOT NULL,
  "quantity"    INTEGER NOT NULL DEFAULT 0,
  "reserved"    INTEGER NOT NULL DEFAULT 0,
  "damaged"     INTEGER NOT NULL DEFAULT 0,
  "returned"    INTEGER NOT NULL DEFAULT 0,
  "batchNo"     TEXT,
  "lotNumber"   TEXT,
  "expiryDate"  TIMESTAMPTZ,
  "costMethod"  TEXT NOT NULL DEFAULT 'fifo',
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "WarehouseStock_warehouseId_itemId_key" UNIQUE ("warehouseId", "itemId"),
  CONSTRAINT "WarehouseStock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "WarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE,
  CONSTRAINT "WarehouseStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
);

-- --------------- ItemSupplier ---------------
CREATE TABLE "ItemSupplier" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "itemId"        TEXT NOT NULL,
  "supplierName"  TEXT NOT NULL,
  "supplierCode"  TEXT,
  "contactPerson" TEXT,
  "phone"         TEXT,
  "email"         TEXT,
  "address"       TEXT,
  "leadTimeDays"  INTEGER NOT NULL DEFAULT 0,
  "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "moq"           INTEGER NOT NULL DEFAULT 1,
  "warranty"      TEXT,
  "paymentTerms"  TEXT,
  "rating"        INTEGER,
  "isPrimary"     BOOLEAN NOT NULL DEFAULT false,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "ItemSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "ItemSupplier_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
);

-- --------------- StockMovement ---------------
CREATE TABLE "StockMovement" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "itemId"          TEXT NOT NULL,
  "warehouseId"     TEXT,
  "type"            TEXT NOT NULL,
  "quantity"        INTEGER NOT NULL,
  "previousQty"     INTEGER NOT NULL DEFAULT 0,
  "newQty"          INTEGER NOT NULL DEFAULT 0,
  "reason"          TEXT,
  "referenceNo"     TEXT,
  "referenceType"   TEXT,
  "fromWarehouseId" TEXT,
  "batchNo"         TEXT,
  "lotNumber"       TEXT,
  "expiryDate"      TIMESTAMPTZ,
  "unitCost"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "notes"           TEXT,
  "performedBy"     TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE,
  CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id")
);

-- --------------- PriceBook ---------------
CREATE TABLE "PriceBook" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "code"        TEXT,
  "description" TEXT,
  "isDefault"   BOOLEAN NOT NULL DEFAULT false,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PriceBook_tenantId_name_key" UNIQUE ("tenantId", "name"),
  CONSTRAINT "PriceBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- PriceBookEntry ---------------
CREATE TABLE "PriceBookEntry" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "priceBookId"   TEXT NOT NULL,
  "itemId"        TEXT NOT NULL,
  "price"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency"      TEXT NOT NULL DEFAULT 'BND',
  "effectiveFrom" TIMESTAMPTZ,
  "effectiveTo"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PriceBookEntry_priceBookId_itemId_key" UNIQUE ("priceBookId", "itemId"),
  CONSTRAINT "PriceBookEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "PriceBookEntry_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE,
  CONSTRAINT "PriceBookEntry_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE
);

-- --------------- PurchaseOrder ---------------
CREATE TABLE "PurchaseOrder" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "poNumber"         TEXT NOT NULL,
  "supplier"         TEXT NOT NULL,
  "supplierContact"  TEXT,
  "items"            TEXT NOT NULL,
  "subtotal"         DOUBLE PRECISION NOT NULL,
  "tax"              DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total"            DOUBLE PRECISION NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'DRAFT',
  "expectedDate"     TIMESTAMPTZ,
  "receivedAt"       TIMESTAMPTZ,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,
  CONSTRAINT "PurchaseOrder_poNumber_key" UNIQUE ("poNumber"),
  CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- Vehicle ---------------
CREATE TABLE "Vehicle" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "plateNumber"     TEXT NOT NULL,
  "make"            TEXT NOT NULL,
  "model"           TEXT NOT NULL,
  "year"            INTEGER,
  "vin"             TEXT,
  "fuelType"        TEXT,
  "status"          TEXT NOT NULL DEFAULT 'active',
  "currentMileage"  DOUBLE PRECISION,
  "nextServiceDate" TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- VehicleLog ---------------
CREATE TABLE "VehicleLog" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleId"   TEXT NOT NULL,
  "userId"      TEXT,
  "type"        TEXT NOT NULL,
  "date"        TIMESTAMPTZ NOT NULL,
  "odometer"    DOUBLE PRECISION,
  "quantity"    DOUBLE PRECISION,
  "cost"        DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "location"    TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "VehicleLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE,
  CONSTRAINT "VehicleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- --------------- ComplaintTimeline ---------------
CREATE TABLE "ComplaintTimeline" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "complaintId"     TEXT NOT NULL,
  "action"          TEXT NOT NULL,
  "fromStatus"      TEXT,
  "toStatus"        TEXT,
  "description"     TEXT NOT NULL,
  "performedBy"     TEXT,
  "performedByRole" TEXT,
  "metadata"        TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "ComplaintTimeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "ComplaintTimeline_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE
);

-- --------------- Notification ---------------
CREATE TABLE "Notification" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "userId"            TEXT,
  "type"              TEXT NOT NULL,
  "title"             TEXT NOT NULL,
  "message"           TEXT NOT NULL,
  "data"              TEXT,
  "priority"          TEXT NOT NULL DEFAULT 'normal',
  "isRead"            BOOLEAN NOT NULL DEFAULT false,
  "readAt"            TIMESTAMPTZ,
  "archivedAt"        TIMESTAMPTZ,
  "relatedEntityType" TEXT,
  "relatedEntityId"   TEXT,
  "actionUrl"         TEXT,
  "actionLabel"       TEXT,
  "createdBy"         TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- AuditLog ---------------
CREATE TABLE "AuditLog" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "entity"     TEXT NOT NULL,
  "entityId"   TEXT,
  "oldValue"   TEXT,
  "newValue"   TEXT,
  "details"    TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "device"     TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- --------------- LeaveRequest ---------------
CREATE TABLE "LeaveRequest" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "type"        TEXT NOT NULL,
  "startDate"   TIMESTAMPTZ NOT NULL,
  "endDate"     TIMESTAMPTZ NOT NULL,
  "days"        DOUBLE PRECISION NOT NULL,
  "reason"      TEXT,
  "status"      TEXT NOT NULL DEFAULT 'PENDING',
  "approvedBy"  TEXT,
  "approvedAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL
);

-- --------------- Attendance ---------------
CREATE TABLE "Attendance" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "date"        TIMESTAMPTZ NOT NULL,
  "checkIn"     TIMESTAMPTZ,
  "checkOut"    TIMESTAMPTZ,
  "checkInGps"  TEXT,
  "checkOutGps" TEXT,
  "hoursWorked" DOUBLE PRECISION,
  "status"      TEXT NOT NULL DEFAULT 'present',
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "Attendance_tenantId_userId_date_key" UNIQUE ("tenantId", "userId", "date")
);

-- --------------- HrShift ---------------
CREATE TABLE "HrShift" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "startTime"    TEXT NOT NULL,
  "endTime"      TEXT NOT NULL,
  "breakMinutes" INTEGER NOT NULL DEFAULT 60,
  "color"        TEXT NOT NULL DEFAULT '#3b82f6',
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrShift_tenantId_name_key" UNIQUE ("tenantId", "name"),
  CONSTRAINT "HrShift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- HrShiftSchedule ---------------
CREATE TABLE "HrShiftSchedule" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "employeeId"    TEXT NOT NULL,
  "shiftId"       TEXT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ NOT NULL,
  "effectiveTo"   TIMESTAMPTZ,
  "weeklyOffDays" TEXT NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrShiftSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrShiftSchedule_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id")
);

-- --------------- HrHoliday ---------------
CREATE TABLE "HrHoliday" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "date"        TIMESTAMPTZ NOT NULL,
  "type"        TEXT NOT NULL DEFAULT 'public',
  "recurring"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrHoliday_tenantId_date_key" UNIQUE ("tenantId", "date"),
  CONSTRAINT "HrHoliday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- HrEmployee ---------------
CREATE TABLE "HrEmployee" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"             TEXT NOT NULL,
  "userId"               TEXT NOT NULL,
  "employeeId"           TEXT NOT NULL,
  "departmentId"         TEXT,
  "designation"          TEXT,
  "employmentType"       TEXT NOT NULL DEFAULT 'full_time',
  "reportingToId"        TEXT,
  "basicSalary"          DOUBLE PRECISION,
  "nationality"          TEXT,
  "passportNumber"       TEXT,
  "passportExpiry"       TIMESTAMPTZ,
  "visaNumber"           TEXT,
  "visaExpiry"           TIMESTAMPTZ,
  "drivingLicense"       TEXT,
  "drivingLicenseExpiry" TIMESTAMPTZ,
  "joiningDate"          TIMESTAMPTZ,
  "probationEnds"        TIMESTAMPTZ,
  "contractEnd"          TIMESTAMPTZ,
  "bankName"             TEXT,
  "bankAccount"          TEXT,
  "bankBranch"           TEXT,
  "emergencyName"        TEXT,
  "emergencyPhone"       TEXT,
  "emergencyRelation"    TEXT,
  "dateOfBirth"          TIMESTAMPTZ,
  "gender"               TEXT,
  "maritalStatus"        TEXT,
  "bloodGroup"           TEXT,
  "photo"                TEXT,
  "status"               TEXT NOT NULL DEFAULT 'active',
  "shiftId"              TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrEmployee_userId_key" UNIQUE ("userId"),
  CONSTRAINT "HrEmployee_tenantId_employeeId_key" UNIQUE ("tenantId", "employeeId"),
  CONSTRAINT "HrEmployee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrEmployee_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "HrShift"("id"),
  CONSTRAINT "HrEmployee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id")
);

-- --------------- HrLeaveType ---------------
CREATE TABLE "HrLeaveType" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "code"         TEXT NOT NULL,
  "daysAllowed"  DOUBLE PRECISION NOT NULL,
  "isPaid"       BOOLEAN NOT NULL DEFAULT true,
  "carryForward" BOOLEAN NOT NULL DEFAULT false,
  "maxCarryDays" DOUBLE PRECISION,
  "requiresDoc"  BOOLEAN NOT NULL DEFAULT false,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrLeaveType_code_key" UNIQUE ("code"),
  CONSTRAINT "HrLeaveType_tenantId_code_key" UNIQUE ("tenantId", "code"),
  CONSTRAINT "HrLeaveType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- HrLeaveBalance ---------------
CREATE TABLE "HrLeaveBalance" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "leaveTypeId" TEXT NOT NULL,
  "totalDays"   DOUBLE PRECISION NOT NULL,
  "usedDays"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "carriedDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "year"        INTEGER NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrLeaveBalance_tenantId_employeeId_leaveTypeId_year_key" UNIQUE ("tenantId", "employeeId", "leaveTypeId", "year"),
  CONSTRAINT "HrLeaveBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrLeaveBalance_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "HrLeaveType"("id")
);

-- --------------- HrLeaveRequest ---------------
CREATE TABLE "HrLeaveRequest" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "employeeId"         TEXT NOT NULL,
  "leaveTypeId"        TEXT NOT NULL,
  "startDate"          TIMESTAMPTZ NOT NULL,
  "endDate"            TIMESTAMPTZ NOT NULL,
  "days"               DOUBLE PRECISION NOT NULL,
  "reason"             TEXT,
  "status"             TEXT NOT NULL DEFAULT 'PENDING',
  "supervisorId"       TEXT,
  "supervisorApprovedAt" TIMESTAMPTZ,
  "hrOfficerId"        TEXT,
  "hrApprovedAt"       TIMESTAMPTZ,
  "rejectedBy"         TEXT,
  "rejectedAt"         TIMESTAMPTZ,
  "rejectionReason"    TEXT,
  "attachmentUrl"      TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrLeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrLeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrPayroll ---------------
CREATE TABLE "HrPayroll" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "employeeId"     TEXT NOT NULL,
  "month"          INTEGER NOT NULL,
  "year"           INTEGER NOT NULL,
  "basicSalary"    DOUBLE PRECISION NOT NULL,
  "allowances"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deductions"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "overtimePay"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bonus"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "loanDeduction"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tax"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "netPay"         DOUBLE PRECISION NOT NULL,
  "status"         TEXT NOT NULL DEFAULT 'DRAFT',
  "payslipUrl"     TEXT,
  "processedBy"    TEXT,
  "processedAt"    TIMESTAMPTZ,
  "paidAt"         TIMESTAMPTZ,
  "notes"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrPayroll_tenantId_employeeId_month_year_key" UNIQUE ("tenantId", "employeeId", "month", "year"),
  CONSTRAINT "HrPayroll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrPayroll_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrOvertimeRequest ---------------
CREATE TABLE "HrOvertimeRequest" (
  "id"                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"             TEXT NOT NULL,
  "employeeId"           TEXT NOT NULL,
  "date"                 TIMESTAMPTZ NOT NULL,
  "hours"                DOUBLE PRECISION NOT NULL,
  "reason"               TEXT,
  "status"               TEXT NOT NULL DEFAULT 'PENDING',
  "supervisorId"         TEXT,
  "supervisorApprovedAt" TIMESTAMPTZ,
  "hrOfficerId"          TEXT,
  "hrApprovedAt"         TIMESTAMPTZ,
  "rate"                 DOUBLE PRECISION,
  "totalPay"             DOUBLE PRECISION,
  "payrollId"            TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"            TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrOvertimeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrOvertimeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrJobPosition ---------------
CREATE TABLE "HrJobPosition" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "departmentId"  TEXT,
  "type"          TEXT NOT NULL DEFAULT 'full_time',
  "vacancies"     INTEGER NOT NULL DEFAULT 1,
  "location"      TEXT,
  "salaryMin"     DOUBLE PRECISION,
  "salaryMax"     DOUBLE PRECISION,
  "description"   TEXT,
  "requirements"  TEXT,
  "status"        TEXT NOT NULL DEFAULT 'open',
  "postedDate"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "closingDate"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrJobPosition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- HrCandidate ---------------
CREATE TABLE "HrCandidate" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "jobId"          TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "phone"          TEXT,
  "resumeUrl"      TEXT,
  "coverLetterUrl" TEXT,
  "source"         TEXT,
  "status"         TEXT NOT NULL DEFAULT 'applied',
  "appliedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "interviewDate"  TIMESTAMPTZ,
  "interviewerId"  TEXT,
  "offerSalary"    DOUBLE PRECISION,
  "offerDate"      TIMESTAMPTZ,
  "notes"          TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrCandidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrCandidate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "HrJobPosition"("id")
);

-- --------------- HrPerformanceReview ---------------
CREATE TABLE "HrPerformanceReview" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "employeeId"        TEXT NOT NULL,
  "period"            TEXT NOT NULL,
  "type"              TEXT NOT NULL DEFAULT 'quarterly',
  "kpiScore"          DOUBLE PRECISION,
  "goalsScore"        DOUBLE PRECISION,
  "overallScore"      DOUBLE PRECISION,
  "rating"            TEXT,
  "employeeComments"  TEXT,
  "managerComments"   TEXT,
  "reviewerId"        TEXT,
  "status"            TEXT NOT NULL DEFAULT 'draft',
  "completedAt"       TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrPerformanceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrPerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrTraining ---------------
CREATE TABLE "HrTraining" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"           TEXT NOT NULL,
  "title"              TEXT NOT NULL,
  "description"        TEXT,
  "provider"           TEXT,
  "location"           TEXT,
  "startDate"          TIMESTAMPTZ NOT NULL,
  "endDate"            TIMESTAMPTZ NOT NULL,
  "cost"               DOUBLE PRECISION,
  "maxParticipants"    INTEGER,
  "status"             TEXT NOT NULL DEFAULT 'planned',
  "certificateTemplate" TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"          TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrTraining_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- HrTrainingRecord ---------------
CREATE TABLE "HrTrainingRecord" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "employeeId"        TEXT NOT NULL,
  "trainingId"        TEXT NOT NULL,
  "status"            TEXT NOT NULL DEFAULT 'enrolled',
  "score"             DOUBLE PRECISION,
  "certificateUrl"    TEXT,
  "certificateExpiry" TIMESTAMPTZ,
  "completedAt"       TIMESTAMPTZ,
  "notes"             TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrTrainingRecord_tenantId_employeeId_trainingId_key" UNIQUE ("tenantId", "employeeId", "trainingId"),
  CONSTRAINT "HrTrainingRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrTrainingRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id"),
  CONSTRAINT "HrTrainingRecord_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "HrTraining"("id")
);

-- --------------- HrAssetAssignment ---------------
CREATE TABLE "HrAssetAssignment" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "employeeId"    TEXT NOT NULL,
  "assetType"     TEXT NOT NULL,
  "assetName"     TEXT NOT NULL,
  "assetId"       TEXT,
  "serialNumber"  TEXT,
  "assignedDate"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "returnDate"    TIMESTAMPTZ,
  "status"        TEXT NOT NULL DEFAULT 'assigned',
  "condition"     TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrAssetAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrAssetAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrEmployeeDocument ---------------
CREATE TABLE "HrEmployeeDocument" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "employeeId"    TEXT NOT NULL,
  "documentType"  TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "fileUrl"       TEXT NOT NULL,
  "expiryDate"    TIMESTAMPTZ,
  "reminderDays"  INTEGER NOT NULL DEFAULT 30,
  "status"        TEXT NOT NULL DEFAULT 'active',
  "uploadedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrEmployeeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrEmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrVisitor ---------------
CREATE TABLE "HrVisitor" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "company"        TEXT,
  "purpose"        TEXT,
  "hostEmployeeId" TEXT,
  "checkIn"        TIMESTAMPTZ,
  "checkOut"       TIMESTAMPTZ,
  "photoUrl"       TEXT,
  "idNumber"       TEXT,
  "badgeNumber"    TEXT,
  "status"         TEXT NOT NULL DEFAULT 'expected',
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrVisitor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- HrMedicalRecord ---------------
CREATE TABLE "HrMedicalRecord" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "employeeId"   TEXT NOT NULL,
  "recordType"   TEXT NOT NULL,
  "provider"     TEXT,
  "date"         TIMESTAMPTZ NOT NULL,
  "expiryDate"   TIMESTAMPTZ,
  "details"      TEXT,
  "fileUrl"      TEXT,
  "cost"         DOUBLE PRECISION,
  "status"       TEXT NOT NULL DEFAULT 'active',
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrMedicalRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrMedicalRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrTravelRequest ---------------
CREATE TABLE "HrTravelRequest" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "employeeId"       TEXT NOT NULL,
  "destination"      TEXT NOT NULL,
  "purpose"          TEXT NOT NULL,
  "startDate"        TIMESTAMPTZ NOT NULL,
  "endDate"          TIMESTAMPTZ NOT NULL,
  "budget"           DOUBLE PRECISION,
  "actualCost"       DOUBLE PRECISION,
  "status"           TEXT NOT NULL DEFAULT 'PENDING',
  "approvedBy"       TEXT,
  "approvedAt"       TIMESTAMPTZ,
  "rejectionReason"  TEXT,
  "notes"            TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrTravelRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrTravelRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrExpenseClaim ---------------
CREATE TABLE "HrExpenseClaim" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "employeeId"       TEXT NOT NULL,
  "category"         TEXT NOT NULL,
  "amount"           DOUBLE PRECISION NOT NULL,
  "description"      TEXT NOT NULL,
  "receiptUrl"       TEXT,
  "expenseDate"      TIMESTAMPTZ NOT NULL,
  "status"           TEXT NOT NULL DEFAULT 'PENDING',
  "approvedBy"       TEXT,
  "approvedAt"       TIMESTAMPTZ,
  "paidAt"           TIMESTAMPTZ,
  "rejectionReason"  TEXT,
  "payrollId"        TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrExpenseClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrExpenseClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrDisciplinaryAction ---------------
CREATE TABLE "HrDisciplinaryAction" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"        TEXT NOT NULL,
  "employeeId"      TEXT NOT NULL,
  "type"            TEXT NOT NULL,
  "severity"        TEXT NOT NULL DEFAULT 'minor',
  "description"     TEXT NOT NULL,
  "incidentDate"    TIMESTAMPTZ NOT NULL,
  "actionTaken"     TEXT,
  "documentUrl"     TEXT,
  "issuedBy"        TEXT,
  "status"          TEXT NOT NULL DEFAULT 'active',
  "resolvedAt"      TIMESTAMPTZ,
  "resolution"      TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrDisciplinaryAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "HrDisciplinaryAction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "HrEmployee"("id")
);

-- --------------- HrAnnouncement ---------------
CREATE TABLE "HrAnnouncement" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "title"             TEXT NOT NULL,
  "content"           TEXT NOT NULL,
  "type"              TEXT NOT NULL DEFAULT 'info',
  "priority"          TEXT NOT NULL DEFAULT 'normal',
  "targetRoles"       TEXT,
  "targetDepartments" TEXT,
  "isPopup"           BOOLEAN NOT NULL DEFAULT false,
  "popupExpiry"       TIMESTAMPTZ,
  "status"            TEXT NOT NULL DEFAULT 'published',
  "publishedBy"       TEXT,
  "publishedAt"       TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "HrAnnouncement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- CmsSetting ---------------
CREATE TABLE "CmsSetting" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "key"       TEXT NOT NULL,
  "value"     TEXT NOT NULL,
  "category"  TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsSetting_tenantId_key_key" UNIQUE ("tenantId", "key")
);

-- --------------- CmsHero ---------------
CREATE TABLE "CmsHero" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "headline"         TEXT,
  "subheadline"      TEXT,
  "backgroundImage"  TEXT,
  "backgroundVideo"  TEXT,
  "cta1Text"         TEXT,
  "cta1Link"         TEXT,
  "cta2Text"         TEXT,
  "cta2Link"         TEXT,
  "stat1Value"       TEXT,
  "stat1Label"       TEXT,
  "stat2Value"       TEXT,
  "stat2Label"       TEXT,
  "stat3Value"       TEXT,
  "stat3Label"       TEXT,
  "chipText"         TEXT,
  "chipSubtext"      TEXT,
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "publishedAt"      TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL
);

-- --------------- CmsService ---------------
CREATE TABLE "CmsService" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "description"   TEXT,
  "image"         TEXT,
  "icon"          TEXT,
  "category"      TEXT,
  "status"        TEXT NOT NULL DEFAULT 'draft',
  "seoTitle"      TEXT,
  "seoDescription" TEXT,
  "displayOrder"  INTEGER NOT NULL DEFAULT 0,
  "isEnabled"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsService_tenantId_slug_key" UNIQUE ("tenantId", "slug")
);

-- --------------- CmsIndustry ---------------
CREATE TABLE "CmsIndustry" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "image"        TEXT,
  "icon"         TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isEnabled"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL
);

-- --------------- CmsProject ---------------
CREATE TABLE "CmsProject" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "title"             TEXT NOT NULL,
  "slug"              TEXT NOT NULL,
  "description"       TEXT,
  "category"          TEXT,
  "featuredImage"     TEXT,
  "images"            TEXT,
  "beforeAfterImages" TEXT,
  "completionStatus"  TEXT NOT NULL DEFAULT 'planned',
  "isFeatured"        BOOLEAN NOT NULL DEFAULT false,
  "galleryImages"     TEXT,
  "seoTitle"          TEXT,
  "seoDescription"    TEXT,
  "displayOrder"      INTEGER NOT NULL DEFAULT 0,
  "status"            TEXT NOT NULL DEFAULT 'draft',
  "publishedAt"       TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsProject_tenantId_slug_key" UNIQUE ("tenantId", "slug")
);

-- --------------- CmsBlogCategory ---------------
CREATE TABLE "CmsBlogCategory" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "description" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsBlogCategory_tenantId_slug_key" UNIQUE ("tenantId", "slug")
);

-- --------------- CmsBlog ---------------
CREATE TABLE "CmsBlog" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "slug"          TEXT NOT NULL,
  "excerpt"       TEXT,
  "content"       TEXT,
  "featuredImage" TEXT,
  "categoryId"    TEXT,
  "authorId"      TEXT,
  "status"        TEXT NOT NULL DEFAULT 'draft',
  "seoTitle"      TEXT,
  "seoDescription" TEXT,
  "seoKeywords"   TEXT,
  "isFeatured"    BOOLEAN NOT NULL DEFAULT false,
  "publishedAt"   TIMESTAMPTZ,
  "scheduledAt"   TIMESTAMPTZ,
  "viewCount"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsBlog_tenantId_slug_key" UNIQUE ("tenantId", "slug"),
  CONSTRAINT "CmsBlog_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CmsBlogCategory"("id")
);

-- --------------- CmsTestimonial ---------------
CREATE TABLE "CmsTestimonial" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "company"      TEXT,
  "photo"        TEXT,
  "rating"       INTEGER NOT NULL,
  "comment"      TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'draft',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isEnabled"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL
);

-- --------------- CmsCareerJob ---------------
CREATE TABLE "CmsCareerJob" (
  "id"                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"            TEXT NOT NULL,
  "title"               TEXT NOT NULL,
  "department"          TEXT,
  "description"         TEXT,
  "requirements"        TEXT,
  "salary"              TEXT,
  "status"              TEXT NOT NULL DEFAULT 'open',
  "applicationDeadline" TIMESTAMPTZ,
  "location"            TEXT,
  "type"                TEXT NOT NULL DEFAULT 'fulltime',
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL
);

-- --------------- CmsCareerApplication ---------------
CREATE TABLE "CmsCareerApplication" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "jobId"       TEXT NOT NULL,
  "fullName"    TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "phone"       TEXT,
  "resumeUrl"   TEXT,
  "coverLetter" TEXT,
  "status"      TEXT NOT NULL DEFAULT 'new',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsCareerApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CmsCareerJob"("id") ON DELETE CASCADE
);

-- --------------- CmsContactMessage ---------------
CREATE TABLE "CmsContactMessage" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "email"        TEXT NOT NULL,
  "phone"        TEXT,
  "subject"      TEXT,
  "message"      TEXT NOT NULL,
  "source"       TEXT NOT NULL DEFAULT 'website',
  "status"       TEXT NOT NULL DEFAULT 'new',
  "assignedToId" TEXT,
  "reply"        TEXT,
  "replyAt"      TIMESTAMPTZ,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL
);

-- --------------- CmsMedia ---------------
CREATE TABLE "CmsMedia" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "fileName"     TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType"     TEXT NOT NULL,
  "size"         INTEGER NOT NULL,
  "url"          TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "folder"       TEXT,
  "category"     TEXT,
  "alt"          TEXT,
  "width"        INTEGER,
  "height"       INTEGER,
  "uploadedById" TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL
);

-- --------------- CmsSeo ---------------
CREATE TABLE "CmsSeo" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "pagePath"      TEXT NOT NULL,
  "title"         TEXT,
  "description"   TEXT,
  "keywords"      TEXT,
  "ogTitle"       TEXT,
  "ogDescription" TEXT,
  "ogImage"       TEXT,
  "schemaMarkup"  TEXT,
  "canonicalUrl"  TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CmsSeo_tenantId_pagePath_key" UNIQUE ("tenantId", "pagePath")
);

-- --------------- CmsFooter ---------------
CREATE TABLE "CmsFooter" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "companyDescription" TEXT,
  "address"           TEXT,
  "phone"             TEXT,
  "email"             TEXT,
  "whatsapp"          TEXT,
  "facebook"          TEXT,
  "instagram"         TEXT,
  "linkedin"          TEXT,
  "twitter"           TEXT,
  "youtube"           TEXT,
  "copyrightText"     TEXT,
  "privacyPolicyLink" TEXT,
  "termsLink"         TEXT,
  "menuLinks"         TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL
);

-- --------------- CmsAnnouncement ---------------
CREATE TABLE "CmsAnnouncement" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "text"          TEXT NOT NULL,
  "type"          TEXT NOT NULL DEFAULT 'info',
  "link"          TEXT,
  "isEnabled"     BOOLEAN NOT NULL DEFAULT true,
  "scheduledFrom" TIMESTAMPTZ,
  "scheduledTo"   TIMESTAMPTZ,
  "displayOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL
);

-- --------------- CmsPopup ---------------
CREATE TABLE "CmsPopup" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "content"       TEXT,
  "type"          TEXT NOT NULL DEFAULT 'welcome',
  "imageUrl"      TEXT,
  "frequency"     TEXT NOT NULL DEFAULT 'once',
  "isEnabled"     BOOLEAN NOT NULL DEFAULT true,
  "scheduledFrom" TIMESTAMPTZ,
  "scheduledTo"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL
);

-- --------------- CmsForm ---------------
CREATE TABLE "CmsForm" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "formType"  TEXT NOT NULL DEFAULT 'contact',
  "fields"    TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL
);

-- --------------- CmsActivityLog ---------------
CREATE TABLE "CmsActivityLog" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT,
  "action"     TEXT NOT NULL,
  "section"    TEXT,
  "details"    TEXT,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- --------------- WhatsAppConfig ---------------
CREATE TABLE "WhatsAppConfig" (
  "id"                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"              TEXT NOT NULL,
  "provider"              TEXT NOT NULL DEFAULT 'openwa',
  "isEnabled"             BOOLEAN NOT NULL DEFAULT false,
  "phoneNumber"           TEXT,
  "businessName"          TEXT,
  "openwaBaseUrl"         TEXT,
  "openwaSession"         TEXT,
  "openwaApiKey"          TEXT,
  "openwaQrCode"          TEXT,
  "openwaStatus"          TEXT NOT NULL DEFAULT 'disconnected',
  "metaAccessToken"       TEXT,
  "metaPhoneNumberId"     TEXT,
  "metaVerifyToken"       TEXT,
  "metaWebhookSecret"     TEXT,
  "metaBusinessAccountId" TEXT,
  "twilioAccountSid"      TEXT,
  "twilioAuthToken"       TEXT,
  "twilioPhoneNumber"     TEXT,
  "autoReplyEnabled"      BOOLEAN NOT NULL DEFAULT true,
  "welcomeMessage"        TEXT NOT NULL DEFAULT 'Welcome to MOHD.HMS ENTERPRISE!

Please choose:
1️⃣ New Complaint
2️⃣ Service Request
3️⃣ Complaint Status
4️⃣ My Equipment
5️⃣ Work Order Status
6️⃣ Invoices
7️⃣ Emergency Service
8️⃣ Speak to Customer Support',
  "emergencyNumbers"      TEXT,
  "defaultPriority"       TEXT NOT NULL DEFAULT 'medium',
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"             TIMESTAMPTZ NOT NULL,
  CONSTRAINT "WhatsAppConfig_tenantId_key" UNIQUE ("tenantId"),
  CONSTRAINT "WhatsAppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- WhatsAppSession ---------------
CREATE TABLE "WhatsAppSession" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "configId"      TEXT NOT NULL,
  "phoneNumber"   TEXT NOT NULL,
  "customerId"    TEXT,
  "sessionId"     TEXT,
  "state"         TEXT NOT NULL DEFAULT 'menu',
  "stateData"     TEXT,
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "messageCount"  INTEGER NOT NULL DEFAULT 0,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "isBlocked"     BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "WhatsAppSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "WhatsAppSession_configId_fkey" FOREIGN KEY ("configId") REFERENCES "WhatsAppConfig"("id"),
  CONSTRAINT "WhatsAppSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
);

-- --------------- WhatsAppMessage ---------------
CREATE TABLE "WhatsAppMessage" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "sessionId"         TEXT NOT NULL,
  "threadId"          TEXT,
  "direction"         TEXT NOT NULL,
  "messageType"       TEXT NOT NULL DEFAULT 'text',
  "content"           TEXT,
  "mediaUrl"          TEXT,
  "mediaType"         TEXT,
  "thumbnailUrl"      TEXT,
  "caption"           TEXT,
  "location"          TEXT,
  "fromNumber"        TEXT,
  "toNumber"          TEXT,
  "providerMessageId" TEXT,
  "status"            TEXT NOT NULL DEFAULT 'sent',
  "errorMessage"      TEXT,
  "isFromBot"         BOOLEAN NOT NULL DEFAULT false,
  "isTemplate"        BOOLEAN NOT NULL DEFAULT false,
  "metadata"          TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  CONSTRAINT "WhatsAppMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "WhatsAppMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id"),
  CONSTRAINT "WhatsAppMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ConversationThread"("id")
);

-- --------------- ConversationThread ---------------
CREATE TABLE "ConversationThread" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "sessionId"     TEXT NOT NULL,
  "subject"       TEXT,
  "status"        TEXT NOT NULL DEFAULT 'active',
  "assignedToId"  TEXT,
  "customerId"    TEXT,
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "messageCount"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL,
  CONSTRAINT "ConversationThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "ConversationThread_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsAppSession"("id"),
  CONSTRAINT "ConversationThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
);

-- --------------- WhatsAppTemplate ---------------
CREATE TABLE "WhatsAppTemplate" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "category"    TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "variables"   TEXT,
  "mediaType"   TEXT,
  "mediaUrl"    TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "WhatsAppTemplate_tenantId_name_key" UNIQUE ("tenantId", "name"),
  CONSTRAINT "WhatsAppTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- CustomerFeedback ---------------
CREATE TABLE "CustomerFeedback" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"      TEXT NOT NULL,
  "customerId"    TEXT NOT NULL,
  "complaintId"   TEXT,
  "workOrderId"   TEXT,
  "rating"        INTEGER NOT NULL,
  "comment"       TEXT,
  "source"        TEXT NOT NULL DEFAULT 'whatsapp',
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CustomerFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "CustomerFeedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
);

-- --------------- CustomerReport ---------------
CREATE TABLE "CustomerReport" (
  "id"               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "customerId"       TEXT NOT NULL,
  "sessionId"        TEXT,
  "type"             TEXT NOT NULL DEFAULT 'escalation',
  "subject"          TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "priority"         TEXT NOT NULL DEFAULT 'medium',
  "status"           TEXT NOT NULL DEFAULT 'OPEN',
  "resolvedById"     TEXT,
  "resolvedAt"       TIMESTAMPTZ,
  "resolutionNotes"  TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL,
  CONSTRAINT "CustomerReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "CustomerReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
);

-- --------------- BroadcastLog ---------------
CREATE TABLE "BroadcastLog" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "content"        TEXT NOT NULL,
  "templateId"     TEXT,
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount"      INTEGER NOT NULL DEFAULT 0,
  "deliveredCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount"    INTEGER NOT NULL DEFAULT 0,
  "readCount"      INTEGER NOT NULL DEFAULT 0,
  "status"         TEXT NOT NULL DEFAULT 'draft',
  "scheduledAt"    TIMESTAMPTZ,
  "sentAt"         TIMESTAMPTZ,
  "completedAt"    TIMESTAMPTZ,
  "createdBy"      TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL,
  CONSTRAINT "BroadcastLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- WhatsAppDeliveryLog ---------------
CREATE TABLE "WhatsAppDeliveryLog" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"       TEXT NOT NULL,
  "messageId"      TEXT NOT NULL,
  "direction"      TEXT NOT NULL,
  "status"         TEXT NOT NULL,
  "providerStatus" TEXT,
  "timestamp"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "errorMessage"   TEXT,
  CONSTRAINT "WhatsAppDeliveryLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "WhatsAppDeliveryLog_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE CASCADE
);

-- --------------- OtpCode ---------------
CREATE TABLE "OtpCode" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "phoneNumber" TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "purpose"     TEXT NOT NULL DEFAULT 'login',
  "attempts"    INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "verifiedAt"  TIMESTAMPTZ,
  "ipAddress"   TEXT,
  "userAgent"   TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "OtpCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- LoginSession ---------------
CREATE TABLE "LoginSession" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"     TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "deviceName"   TEXT,
  "deviceType"   TEXT,
  "browser"      TEXT,
  "os"           TEXT,
  "ipAddress"    TEXT,
  "userAgent"    TEXT,
  "isRevoked"    BOOLEAN NOT NULL DEFAULT false,
  "lastActivity" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"    TIMESTAMPTZ NOT NULL,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "LoginSession_refreshToken_key" UNIQUE ("refreshToken"),
  CONSTRAINT "LoginSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "LoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- --------------- Device ---------------
CREATE TABLE "Device" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "name"       TEXT,
  "type"       TEXT,
  "browser"    TEXT,
  "os"         TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "lastSeen"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "isTrusted"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
);

-- --------------- PasswordResetToken ---------------
CREATE TABLE "PasswordResetToken" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "usedAt"     TIMESTAMPTZ,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PasswordResetToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "PasswordResetToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- --------------- PasswordResetOtp ---------------
CREATE TABLE "PasswordResetOtp" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "otpHash"     TEXT NOT NULL,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "attempts"    INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "resendCount" INTEGER NOT NULL DEFAULT 0,
  "maxResends"  INTEGER NOT NULL DEFAULT 5,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "usedAt"      TIMESTAMPTZ,
  "ipAddress"   TEXT,
  "device"      TEXT,
  "browser"     TEXT,
  "userAgent"   TEXT,
  "status"      TEXT NOT NULL DEFAULT 'active',
  CONSTRAINT "PasswordResetOtp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- --------------- AuthAuditLog ---------------
CREATE TABLE "AuthAuditLog" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"   TEXT,
  "userId"     TEXT,
  "email"      TEXT,
  "event"      TEXT NOT NULL,
  "success"    BOOLEAN NOT NULL DEFAULT true,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "device"     TEXT,
  "browser"    TEXT,
  "metadata"   TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AuthAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id"),
  CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
);

-- --------------- TermsAcceptance ---------------
CREATE TABLE "TermsAcceptance" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"         TEXT NOT NULL,
  "tcVersion"      TEXT NOT NULL,
  "privacyVersion" TEXT NOT NULL,
  "ip"             TEXT,
  "userAgent"      TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- --------------- EmailLog ---------------
CREATE TABLE "EmailLog" (
  "id"                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"          TEXT NOT NULL,
  "recipient"         TEXT NOT NULL,
  "cc"                TEXT,
  "bcc"               TEXT,
  "subject"           TEXT NOT NULL,
  "templateId"        TEXT,
  "templateName"      TEXT,
  "module"            TEXT,
  "status"            TEXT NOT NULL DEFAULT 'queued',
  "provider"          TEXT NOT NULL DEFAULT 'brevo',
  "providerMessageId" TEXT,
  "errorCode"         TEXT,
  "errorMessage"      TEXT,
  "retryCount"        INTEGER NOT NULL DEFAULT 0,
  "maxRetries"        INTEGER NOT NULL DEFAULT 5,
  "nextRetryAt"       TIMESTAMPTZ,
  "scheduledFor"      TIMESTAMPTZ,
  "ip"                TEXT,
  "userAgent"         TEXT,
  "metadata"          TEXT,
  "attachmentCount"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ NOT NULL,
  "sentAt"            TIMESTAMPTZ,
  "deliveredAt"       TIMESTAMPTZ,
  "openedAt"          TIMESTAMPTZ,
  "bouncedAt"         TIMESTAMPTZ,
  CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id"),
  CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- --------------- EmailTemplate ---------------
CREATE TABLE "EmailTemplate" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"    TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "identifier"  TEXT NOT NULL,
  "subject"     TEXT NOT NULL,
  "module"      TEXT NOT NULL,
  "description" TEXT,
  "bodyHtml"    TEXT NOT NULL,
  "bodyText"    TEXT,
  "variables"   TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL,
  CONSTRAINT "EmailTemplate_tenantId_identifier_key" UNIQUE ("tenantId", "identifier"),
  CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
);

-- ============================================================================
-- CREATE INDEX statements
-- ============================================================================

-- User indexes
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");
CREATE INDEX "User_tenantId_phone_idx" ON "User"("tenantId", "phone");
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");
CREATE INDEX "User_tenantId_isActive_idx" ON "User"("tenantId", "isActive");
CREATE INDEX "User_tenantId_departmentId_idx" ON "User"("tenantId", "departmentId");
CREATE INDEX "User_tenantId_employeeNumber_idx" ON "User"("tenantId", "employeeNumber");
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- Department indexes
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");

-- Customer indexes
CREATE INDEX "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX "Customer_tenantId_phone_idx" ON "Customer"("tenantId", "phone");
CREATE INDEX "Customer_tenantId_isActive_idx" ON "Customer"("tenantId", "isActive");

-- Equipment indexes
CREATE INDEX "Equipment_tenantId_idx" ON "Equipment"("tenantId");
CREATE INDEX "Equipment_tenantId_status_idx" ON "Equipment"("tenantId", "status");
CREATE INDEX "Equipment_tenantId_customerId_idx" ON "Equipment"("tenantId", "customerId");

-- ScanLog indexes
CREATE INDEX "ScanLog_tenantId_equipmentId_idx" ON "ScanLog"("tenantId", "equipmentId");
CREATE INDEX "ScanLog_qrId_idx" ON "ScanLog"("qrId");
CREATE INDEX "ScanLog_createdAt_idx" ON "ScanLog"("createdAt");

-- Complaint indexes
CREATE INDEX "Complaint_tenantId_status_idx" ON "Complaint"("tenantId", "status");
CREATE INDEX "Complaint_tenantId_assignedToId_idx" ON "Complaint"("tenantId", "assignedToId");
CREATE INDEX "Complaint_tenantId_assignedBy_idx" ON "Complaint"("tenantId", "assignedBy");
CREATE INDEX "Complaint_tenantId_customerId_idx" ON "Complaint"("tenantId", "customerId");
CREATE INDEX "Complaint_tenantId_category_idx" ON "Complaint"("tenantId", "category");
CREATE INDEX "Complaint_tenantId_createdAt_idx" ON "Complaint"("tenantId", "createdAt");

-- WorkOrder indexes
CREATE INDEX "WorkOrder_tenantId_status_idx" ON "WorkOrder"("tenantId", "status");
CREATE INDEX "WorkOrder_tenantId_assignedToId_idx" ON "WorkOrder"("tenantId", "assignedToId");
CREATE INDEX "WorkOrder_tenantId_workOrderNumber_idx" ON "WorkOrder"("tenantId", "workOrderNumber");

-- Invoice indexes
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- InventoryCategory indexes
CREATE INDEX "InventoryCategory_tenantId_idx" ON "InventoryCategory"("tenantId");

-- InventorySubcategory indexes
CREATE INDEX "InventorySubcategory_tenantId_idx" ON "InventorySubcategory"("tenantId");
CREATE INDEX "InventorySubcategory_categoryId_idx" ON "InventorySubcategory"("categoryId");

-- InventoryItem indexes
CREATE INDEX "InventoryItem_tenantId_idx" ON "InventoryItem"("tenantId");
CREATE INDEX "InventoryItem_tenantId_itemType_idx" ON "InventoryItem"("tenantId", "itemType");
CREATE INDEX "InventoryItem_tenantId_categoryId_idx" ON "InventoryItem"("tenantId", "categoryId");
CREATE INDEX "InventoryItem_tenantId_status_idx" ON "InventoryItem"("tenantId", "status");
CREATE INDEX "InventoryItem_tenantId_isActive_idx" ON "InventoryItem"("tenantId", "isActive");
CREATE INDEX "InventoryItem_sku_idx" ON "InventoryItem"("sku");
CREATE INDEX "InventoryItem_barcode_idx" ON "InventoryItem"("barcode");
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- Warehouse indexes
CREATE INDEX "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");

-- WarehouseStock indexes
CREATE INDEX "WarehouseStock_tenantId_idx" ON "WarehouseStock"("tenantId");
CREATE INDEX "WarehouseStock_warehouseId_idx" ON "WarehouseStock"("warehouseId");
CREATE INDEX "WarehouseStock_itemId_idx" ON "WarehouseStock"("itemId");

-- ItemSupplier indexes
CREATE INDEX "ItemSupplier_tenantId_idx" ON "ItemSupplier"("tenantId");
CREATE INDEX "ItemSupplier_itemId_idx" ON "ItemSupplier"("itemId");
CREATE INDEX "ItemSupplier_supplierName_idx" ON "ItemSupplier"("supplierName");

-- StockMovement indexes
CREATE INDEX "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");
CREATE INDEX "StockMovement_tenantId_itemId_idx" ON "StockMovement"("tenantId", "itemId");
CREATE INDEX "StockMovement_tenantId_type_idx" ON "StockMovement"("tenantId", "type");
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");

-- PriceBook indexes
CREATE INDEX "PriceBook_tenantId_idx" ON "PriceBook"("tenantId");

-- PriceBookEntry indexes
CREATE INDEX "PriceBookEntry_tenantId_idx" ON "PriceBookEntry"("tenantId");
CREATE INDEX "PriceBookEntry_priceBookId_idx" ON "PriceBookEntry"("priceBookId");
CREATE INDEX "PriceBookEntry_itemId_idx" ON "PriceBookEntry"("itemId");

-- ComplaintTimeline indexes
CREATE INDEX "ComplaintTimeline_tenantId_complaintId_idx" ON "ComplaintTimeline"("tenantId", "complaintId");
CREATE INDEX "ComplaintTimeline_complaintId_createdAt_idx" ON "ComplaintTimeline"("complaintId", "createdAt");

-- Notification indexes
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");
CREATE INDEX "Notification_tenantId_isRead_idx" ON "Notification"("tenantId", "isRead");
CREATE INDEX "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");
CREATE INDEX "Notification_tenantId_userId_createdAt_idx" ON "Notification"("tenantId", "userId", "createdAt");
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");

-- AuditLog indexes
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_tenantId_entity_idx" ON "AuditLog"("tenantId", "entity");
CREATE INDEX "AuditLog_tenantId_entityId_idx" ON "AuditLog"("tenantId", "entityId");

-- Attendance indexes
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");
CREATE INDEX "Attendance_tenantId_userId_idx" ON "Attendance"("tenantId", "userId");

-- HrShift indexes
CREATE INDEX "HrShift_tenantId_idx" ON "HrShift"("tenantId");

-- HrShiftSchedule indexes
CREATE INDEX "HrShiftSchedule_tenantId_employeeId_idx" ON "HrShiftSchedule"("tenantId", "employeeId");
CREATE INDEX "HrShiftSchedule_tenantId_shiftId_idx" ON "HrShiftSchedule"("tenantId", "shiftId");

-- HrHoliday indexes
CREATE INDEX "HrHoliday_tenantId_idx" ON "HrHoliday"("tenantId");

-- HrEmployee indexes
CREATE INDEX "HrEmployee_tenantId_idx" ON "HrEmployee"("tenantId");
CREATE INDEX "HrEmployee_tenantId_departmentId_idx" ON "HrEmployee"("tenantId", "departmentId");
CREATE INDEX "HrEmployee_tenantId_status_idx" ON "HrEmployee"("tenantId", "status");

-- HrLeaveType indexes
CREATE INDEX "HrLeaveType_tenantId_idx" ON "HrLeaveType"("tenantId");

-- HrLeaveBalance indexes
CREATE INDEX "HrLeaveBalance_tenantId_employeeId_idx" ON "HrLeaveBalance"("tenantId", "employeeId");

-- HrLeaveRequest indexes
CREATE INDEX "HrLeaveRequest_tenantId_employeeId_idx" ON "HrLeaveRequest"("tenantId", "employeeId");
CREATE INDEX "HrLeaveRequest_tenantId_status_idx" ON "HrLeaveRequest"("tenantId", "status");
CREATE INDEX "HrLeaveRequest_tenantId_leaveTypeId_idx" ON "HrLeaveRequest"("tenantId", "leaveTypeId");

-- HrPayroll indexes
CREATE INDEX "HrPayroll_tenantId_month_year_idx" ON "HrPayroll"("tenantId", "month", "year");
CREATE INDEX "HrPayroll_tenantId_status_idx" ON "HrPayroll"("tenantId", "status");

-- HrOvertimeRequest indexes
CREATE INDEX "HrOvertimeRequest_tenantId_employeeId_idx" ON "HrOvertimeRequest"("tenantId", "employeeId");
CREATE INDEX "HrOvertimeRequest_tenantId_status_idx" ON "HrOvertimeRequest"("tenantId", "status");

-- HrJobPosition indexes
CREATE INDEX "HrJobPosition_tenantId_status_idx" ON "HrJobPosition"("tenantId", "status");

-- HrCandidate indexes
CREATE INDEX "HrCandidate_tenantId_jobId_idx" ON "HrCandidate"("tenantId", "jobId");
CREATE INDEX "HrCandidate_tenantId_status_idx" ON "HrCandidate"("tenantId", "status");

-- HrPerformanceReview indexes
CREATE INDEX "HrPerformanceReview_tenantId_employeeId_idx" ON "HrPerformanceReview"("tenantId", "employeeId");
CREATE INDEX "HrPerformanceReview_tenantId_period_idx" ON "HrPerformanceReview"("tenantId", "period");

-- HrTraining indexes
CREATE INDEX "HrTraining_tenantId_status_idx" ON "HrTraining"("tenantId", "status");

-- HrTrainingRecord indexes
CREATE INDEX "HrTrainingRecord_tenantId_employeeId_idx" ON "HrTrainingRecord"("tenantId", "employeeId");

-- HrAssetAssignment indexes
CREATE INDEX "HrAssetAssignment_tenantId_employeeId_idx" ON "HrAssetAssignment"("tenantId", "employeeId");
CREATE INDEX "HrAssetAssignment_tenantId_assetType_idx" ON "HrAssetAssignment"("tenantId", "assetType");

-- HrEmployeeDocument indexes
CREATE INDEX "HrEmployeeDocument_tenantId_employeeId_idx" ON "HrEmployeeDocument"("tenantId", "employeeId");
CREATE INDEX "HrEmployeeDocument_tenantId_documentType_idx" ON "HrEmployeeDocument"("tenantId", "documentType");
CREATE INDEX "HrEmployeeDocument_tenantId_expiryDate_idx" ON "HrEmployeeDocument"("tenantId", "expiryDate");

-- HrVisitor indexes
CREATE INDEX "HrVisitor_tenantId_status_idx" ON "HrVisitor"("tenantId", "status");
CREATE INDEX "HrVisitor_tenantId_checkIn_idx" ON "HrVisitor"("tenantId", "checkIn");

-- HrMedicalRecord indexes
CREATE INDEX "HrMedicalRecord_tenantId_employeeId_idx" ON "HrMedicalRecord"("tenantId", "employeeId");
CREATE INDEX "HrMedicalRecord_tenantId_expiryDate_idx" ON "HrMedicalRecord"("tenantId", "expiryDate");

-- HrTravelRequest indexes
CREATE INDEX "HrTravelRequest_tenantId_employeeId_idx" ON "HrTravelRequest"("tenantId", "employeeId");
CREATE INDEX "HrTravelRequest_tenantId_status_idx" ON "HrTravelRequest"("tenantId", "status");

-- HrExpenseClaim indexes
CREATE INDEX "HrExpenseClaim_tenantId_employeeId_idx" ON "HrExpenseClaim"("tenantId", "employeeId");
CREATE INDEX "HrExpenseClaim_tenantId_status_idx" ON "HrExpenseClaim"("tenantId", "status");
CREATE INDEX "HrExpenseClaim_tenantId_category_idx" ON "HrExpenseClaim"("tenantId", "category");

-- HrDisciplinaryAction indexes
CREATE INDEX "HrDisciplinaryAction_tenantId_employeeId_idx" ON "HrDisciplinaryAction"("tenantId", "employeeId");
CREATE INDEX "HrDisciplinaryAction_tenantId_type_idx" ON "HrDisciplinaryAction"("tenantId", "type");

-- HrAnnouncement indexes
CREATE INDEX "HrAnnouncement_tenantId_type_idx" ON "HrAnnouncement"("tenantId", "type");
CREATE INDEX "HrAnnouncement_tenantId_status_idx" ON "HrAnnouncement"("tenantId", "status");

-- CmsSetting indexes
CREATE INDEX "CmsSetting_tenantId_idx" ON "CmsSetting"("tenantId");

-- CmsHero indexes
CREATE INDEX "CmsHero_tenantId_idx" ON "CmsHero"("tenantId");

-- CmsService indexes
CREATE INDEX "CmsService_tenantId_idx" ON "CmsService"("tenantId");

-- CmsIndustry indexes
CREATE INDEX "CmsIndustry_tenantId_idx" ON "CmsIndustry"("tenantId");

-- CmsProject indexes
CREATE INDEX "CmsProject_tenantId_idx" ON "CmsProject"("tenantId");

-- CmsBlogCategory indexes
CREATE INDEX "CmsBlogCategory_tenantId_idx" ON "CmsBlogCategory"("tenantId");

-- CmsBlog indexes
CREATE INDEX "CmsBlog_tenantId_idx" ON "CmsBlog"("tenantId");

-- CmsTestimonial indexes
CREATE INDEX "CmsTestimonial_tenantId_idx" ON "CmsTestimonial"("tenantId");

-- CmsCareerJob indexes
CREATE INDEX "CmsCareerJob_tenantId_idx" ON "CmsCareerJob"("tenantId");

-- CmsCareerApplication indexes
CREATE INDEX "CmsCareerApplication_tenantId_idx" ON "CmsCareerApplication"("tenantId");

-- CmsContactMessage indexes
CREATE INDEX "CmsContactMessage_tenantId_idx" ON "CmsContactMessage"("tenantId");

-- CmsMedia indexes
CREATE INDEX "CmsMedia_tenantId_idx" ON "CmsMedia"("tenantId");

-- CmsSeo indexes
CREATE INDEX "CmsSeo_tenantId_idx" ON "CmsSeo"("tenantId");

-- CmsFooter indexes
CREATE INDEX "CmsFooter_tenantId_idx" ON "CmsFooter"("tenantId");

-- CmsAnnouncement indexes
CREATE INDEX "CmsAnnouncement_tenantId_idx" ON "CmsAnnouncement"("tenantId");

-- CmsPopup indexes
CREATE INDEX "CmsPopup_tenantId_idx" ON "CmsPopup"("tenantId");

-- CmsForm indexes
CREATE INDEX "CmsForm_tenantId_idx" ON "CmsForm"("tenantId");

-- CmsActivityLog indexes
CREATE INDEX "CmsActivityLog_tenantId_idx" ON "CmsActivityLog"("tenantId");

-- WhatsAppSession indexes
CREATE INDEX "WhatsAppSession_tenantId_phoneNumber_idx" ON "WhatsAppSession"("tenantId", "phoneNumber");
CREATE INDEX "WhatsAppSession_phoneNumber_idx" ON "WhatsAppSession"("phoneNumber");
CREATE INDEX "WhatsAppSession_state_idx" ON "WhatsAppSession"("state");

-- WhatsAppMessage indexes
CREATE INDEX "WhatsAppMessage_tenantId_sessionId_idx" ON "WhatsAppMessage"("tenantId", "sessionId");
CREATE INDEX "WhatsAppMessage_sessionId_idx" ON "WhatsAppMessage"("sessionId");
CREATE INDEX "WhatsAppMessage_providerMessageId_idx" ON "WhatsAppMessage"("providerMessageId");
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "WhatsAppMessage"("createdAt");

-- ConversationThread indexes
CREATE INDEX "ConversationThread_tenantId_status_idx" ON "ConversationThread"("tenantId", "status");
CREATE INDEX "ConversationThread_sessionId_idx" ON "ConversationThread"("sessionId");
CREATE INDEX "ConversationThread_assignedToId_idx" ON "ConversationThread"("assignedToId");

-- WhatsAppTemplate indexes
CREATE INDEX "WhatsAppTemplate_tenantId_category_idx" ON "WhatsAppTemplate"("tenantId", "category");

-- CustomerFeedback indexes
CREATE INDEX "CustomerFeedback_tenantId_customerId_idx" ON "CustomerFeedback"("tenantId", "customerId");

-- CustomerReport indexes
CREATE INDEX "CustomerReport_tenantId_status_idx" ON "CustomerReport"("tenantId", "status");

-- BroadcastLog indexes
CREATE INDEX "BroadcastLog_tenantId_status_idx" ON "BroadcastLog"("tenantId", "status");

-- WhatsAppDeliveryLog indexes
CREATE INDEX "WhatsAppDeliveryLog_tenantId_messageId_idx" ON "WhatsAppDeliveryLog"("tenantId", "messageId");
CREATE INDEX "WhatsAppDeliveryLog_messageId_idx" ON "WhatsAppDeliveryLog"("messageId");

-- OtpCode indexes
CREATE INDEX "OtpCode_tenantId_phoneNumber_idx" ON "OtpCode"("tenantId", "phoneNumber");
CREATE INDEX "OtpCode_phoneNumber_expiresAt_idx" ON "OtpCode"("phoneNumber", "expiresAt");
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");

-- LoginSession indexes
CREATE INDEX "LoginSession_userId_idx" ON "LoginSession"("userId");
CREATE INDEX "LoginSession_refreshToken_idx" ON "LoginSession"("refreshToken");
CREATE INDEX "LoginSession_tenantId_userId_idx" ON "LoginSession"("tenantId", "userId");

-- Device indexes
CREATE INDEX "Device_userId_idx" ON "Device"("userId");
CREATE INDEX "Device_tenantId_userId_idx" ON "Device"("tenantId", "userId");

-- PasswordResetToken indexes
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_tenantId_userId_idx" ON "PasswordResetToken"("tenantId", "userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- PasswordResetOtp indexes
CREATE INDEX "PasswordResetOtp_userId_idx" ON "PasswordResetOtp"("userId");
CREATE INDEX "PasswordResetOtp_email_idx" ON "PasswordResetOtp"("email");
CREATE INDEX "PasswordResetOtp_tenantId_userId_idx" ON "PasswordResetOtp"("tenantId", "userId");
CREATE INDEX "PasswordResetOtp_expiresAt_idx" ON "PasswordResetOtp"("expiresAt");
CREATE INDEX "PasswordResetOtp_status_idx" ON "PasswordResetOtp"("status");

-- AuthAuditLog indexes
CREATE INDEX "AuthAuditLog_tenantId_createdAt_idx" ON "AuthAuditLog"("tenantId", "createdAt");
CREATE INDEX "AuthAuditLog_email_idx" ON "AuthAuditLog"("email");
CREATE INDEX "AuthAuditLog_ipAddress_idx" ON "AuthAuditLog"("ipAddress");
CREATE INDEX "AuthAuditLog_event_idx" ON "AuthAuditLog"("event");

-- TermsAcceptance indexes
CREATE INDEX "TermsAcceptance_userId_createdAt_idx" ON "TermsAcceptance"("userId", "createdAt");
CREATE INDEX "TermsAcceptance_tcVersion_idx" ON "TermsAcceptance"("tcVersion");

-- EmailLog indexes
CREATE INDEX "EmailLog_tenantId_createdAt_idx" ON "EmailLog"("tenantId", "createdAt");
CREATE INDEX "EmailLog_tenantId_status_idx" ON "EmailLog"("tenantId", "status");
CREATE INDEX "EmailLog_tenantId_module_idx" ON "EmailLog"("tenantId", "module");
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_scheduledFor_idx" ON "EmailLog"("scheduledFor");
CREATE INDEX "EmailLog_nextRetryAt_idx" ON "EmailLog"("nextRetryAt");
CREATE INDEX "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- EmailTemplate indexes
CREATE INDEX "EmailTemplate_tenantId_module_idx" ON "EmailTemplate"("tenantId", "module");

COMMIT;