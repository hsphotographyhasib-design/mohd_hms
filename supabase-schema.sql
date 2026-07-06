BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- DROP TABLE statements
DROP TABLE IF EXISTS "WorkOrderMaterial" CASCADE;
DROP TABLE IF EXISTS "WorkOrder" CASCADE;
DROP TABLE IF EXISTS "WhatsAppTemplate" CASCADE;
DROP TABLE IF EXISTS "WhatsAppSession" CASCADE;
DROP TABLE IF EXISTS "WhatsAppMessage" CASCADE;
DROP TABLE IF EXISTS "WhatsAppDeliveryLog" CASCADE;
DROP TABLE IF EXISTS "WhatsAppConfig" CASCADE;
DROP TABLE IF EXISTS "WarehouseStock" CASCADE;
DROP TABLE IF EXISTS "Warehouse" CASCADE;
DROP TABLE IF EXISTS "VehicleLog" CASCADE;
DROP TABLE IF EXISTS "Vehicle" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "TermsAcceptance" CASCADE;
DROP TABLE IF EXISTS "Tenant" CASCADE;
DROP TABLE IF EXISTS "StockMovement" CASCADE;
DROP TABLE IF EXISTS "ScanLog" CASCADE;
DROP TABLE IF EXISTS "Quotation" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrder" CASCADE;
DROP TABLE IF EXISTS "PriceBookEntry" CASCADE;
DROP TABLE IF EXISTS "PriceBook" CASCADE;
DROP TABLE IF EXISTS "PmSchedule" CASCADE;
DROP TABLE IF EXISTS "PasswordResetToken" CASCADE;
DROP TABLE IF EXISTS "PasswordResetOtp" CASCADE;
DROP TABLE IF EXISTS "OtpCode" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "LoginSession" CASCADE;
DROP TABLE IF EXISTS "LeaveRequest" CASCADE;
DROP TABLE IF EXISTS "ItemSupplier" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "InventorySubcategory" CASCADE;
DROP TABLE IF EXISTS "InventoryItem" CASCADE;
DROP TABLE IF EXISTS "InventoryCategory" CASCADE;
DROP TABLE IF EXISTS "HrVisitor" CASCADE;
DROP TABLE IF EXISTS "HrTravelRequest" CASCADE;
DROP TABLE IF EXISTS "HrTrainingRecord" CASCADE;
DROP TABLE IF EXISTS "HrTraining" CASCADE;
DROP TABLE IF EXISTS "HrShiftSchedule" CASCADE;
DROP TABLE IF EXISTS "HrShift" CASCADE;
DROP TABLE IF EXISTS "HrPerformanceReview" CASCADE;
DROP TABLE IF EXISTS "HrPayroll" CASCADE;
DROP TABLE IF EXISTS "HrOvertimeRequest" CASCADE;
DROP TABLE IF EXISTS "HrMedicalRecord" CASCADE;
DROP TABLE IF EXISTS "HrLeaveType" CASCADE;
DROP TABLE IF EXISTS "HrLeaveRequest" CASCADE;
DROP TABLE IF EXISTS "HrLeaveBalance" CASCADE;
DROP TABLE IF EXISTS "HrJobPosition" CASCADE;
DROP TABLE IF EXISTS "HrHoliday" CASCADE;
DROP TABLE IF EXISTS "HrExpenseClaim" CASCADE;
DROP TABLE IF EXISTS "HrEmployeeDocument" CASCADE;
DROP TABLE IF EXISTS "HrEmployee" CASCADE;
DROP TABLE IF EXISTS "HrDisciplinaryAction" CASCADE;
DROP TABLE IF EXISTS "HrCandidate" CASCADE;
DROP TABLE IF EXISTS "HrAssetAssignment" CASCADE;
DROP TABLE IF EXISTS "HrAnnouncement" CASCADE;
DROP TABLE IF EXISTS "EquipmentQrCode" CASCADE;
DROP TABLE IF EXISTS "Equipment" CASCADE;
DROP TABLE IF EXISTS "EmailTemplate" CASCADE;
DROP TABLE IF EXISTS "EmailLog" CASCADE;
DROP TABLE IF EXISTS "Device" CASCADE;
DROP TABLE IF EXISTS "Department" CASCADE;
DROP TABLE IF EXISTS "CustomerReport" CASCADE;
DROP TABLE IF EXISTS "CustomerFeedback" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "ConversationThread" CASCADE;
DROP TABLE IF EXISTS "ComplaintTimeline" CASCADE;
DROP TABLE IF EXISTS "Complaint" CASCADE;
DROP TABLE IF EXISTS "CmsTestimonial" CASCADE;
DROP TABLE IF EXISTS "CmsSetting" CASCADE;
DROP TABLE IF EXISTS "CmsService" CASCADE;
DROP TABLE IF EXISTS "CmsSeo" CASCADE;
DROP TABLE IF EXISTS "CmsProject" CASCADE;
DROP TABLE IF EXISTS "CmsPopup" CASCADE;
DROP TABLE IF EXISTS "CmsMedia" CASCADE;
DROP TABLE IF EXISTS "CmsIndustry" CASCADE;
DROP TABLE IF EXISTS "CmsHero" CASCADE;
DROP TABLE IF EXISTS "CmsForm" CASCADE;
DROP TABLE IF EXISTS "CmsFooter" CASCADE;
DROP TABLE IF EXISTS "CmsContactMessage" CASCADE;
DROP TABLE IF EXISTS "CmsCareerJob" CASCADE;
DROP TABLE IF EXISTS "CmsCareerApplication" CASCADE;
DROP TABLE IF EXISTS "CmsBlogCategory" CASCADE;
DROP TABLE IF EXISTS "CmsBlog" CASCADE;
DROP TABLE IF EXISTS "CmsAnnouncement" CASCADE;
DROP TABLE IF EXISTS "CmsActivityLog" CASCADE;
DROP TABLE IF EXISTS "ChecklistTemplate" CASCADE;
DROP TABLE IF EXISTS "BroadcastLog" CASCADE;
DROP TABLE IF EXISTS "AuthAuditLog" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;

-- CREATE TABLE statements
CREATE TABLE "Tenant" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"  TEXT NOT NULL,
  "domain"  TEXT NOT NULL UNIQUE,
  "logo"  TEXT,
  "address"  TEXT,
  "phone"  TEXT,
  "email"  TEXT,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "plan"  TEXT DEFAULT 'professional' NOT NULL,
  "maxUsers"  INTEGER DEFAULT 50 NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "User" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "email"  TEXT NOT NULL,
  "passwordHash"  TEXT,
  "name"  TEXT NOT NULL,
  "phone"  TEXT,
  "avatar"  TEXT,
  "role"  TEXT DEFAULT 'technician' NOT NULL,
  "employeeNumber"  TEXT,
  "departmentId"  TEXT,
  "authProvider"  TEXT,
  "googleId"  TEXT,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "isOnline"  BOOLEAN DEFAULT false NOT NULL,
  "lastLogin"  TIMESTAMPTZ,
  "gpsLocation"  TEXT
);

CREATE TABLE "Department" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "description"  TEXT,
  "headId"  TEXT,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "Customer" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "email"  TEXT,
  "phone"  TEXT NOT NULL,
  "address"  TEXT,
  "gpsLocation"  TEXT
);

CREATE TABLE "Equipment" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerId"  TEXT,
  "name"  TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "assetNumber"  TEXT NOT NULL UNIQUE,
  "qrCode"  TEXT NOT NULL UNIQUE,
  "qrId"  TEXT UNIQUE,
  "brand"  TEXT,
  "model"  TEXT,
  "serialNumber"  TEXT,
  "location"  TEXT,
  "building"  TEXT,
  "room"  TEXT,
  "installDate"  TIMESTAMPTZ,
  "warrantyExpiry"  TIMESTAMPTZ,
  "warrantyInfo"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "condition"  TEXT DEFAULT 'good' NOT NULL,
  "photos"  TEXT,
  "documents"  TEXT,
  "specifications"  TEXT,
  "notes"  TEXT,
  "scanCount"  INTEGER DEFAULT 0 NOT NULL,
  "lastScannedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "customer"  TEXT,
  "qrCodeRecord"  TEXT
);

CREATE TABLE "EquipmentQrCode" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "equipmentId"  TEXT NOT NULL UNIQUE,
  "qrId"  TEXT NOT NULL UNIQUE,
  "qrUrl"  TEXT NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "generatedAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "lastRegeneratedAt"  TIMESTAMPTZ,
  "version"  INTEGER DEFAULT 1 NOT NULL
);

CREATE TABLE "ScanLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "equipmentId"  TEXT NOT NULL,
  "qrId"  TEXT NOT NULL,
  "scannedBy"  TEXT,
  "scannedByName"  TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "device"  TEXT,
  "browser"  TEXT,
  "location"  TEXT,
  "referer"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "Complaint" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerId"  TEXT NOT NULL,
  "equipmentId"  TEXT,
  "title"  TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "priority"  TEXT DEFAULT 'medium' NOT NULL,
  "status"  TEXT DEFAULT 'NEW' NOT NULL,
  "source"  TEXT DEFAULT 'admin' NOT NULL,
  "category"  TEXT,
  "photos"  TEXT,
  "gpsLocation"  TEXT
);

CREATE TABLE "WorkOrder" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "workOrderNumber"  TEXT UNIQUE,
  "complaintId"  TEXT,
  "customerId"  TEXT,
  "equipmentId"  TEXT,
  "assetId"  TEXT,
  "title"  TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "source"  TEXT DEFAULT 'manual' NOT NULL,
  "reference"  TEXT,
  "status"  TEXT DEFAULT 'DRAFT' NOT NULL,
  "priority"  TEXT DEFAULT 'medium' NOT NULL,
  "type"  TEXT DEFAULT 'corrective' NOT NULL,
  "category"  TEXT,
  "subCategory"  TEXT,
  "sla"  TEXT,
  "estimatedHours"  DOUBLE PRECISION,
  "assignedToId"  TEXT,
  "supervisorId"  TEXT,
  "teamId"  TEXT,
  "createdBy"  TEXT,
  "scheduledDate"  TIMESTAMPTZ,
  "startTime"  TEXT,
  "dueDate"  TIMESTAMPTZ,
  "dueTime"  TEXT,
  "siteId"  TEXT,
  "building"  TEXT,
  "floor"  TEXT,
  "internalNotes"  TEXT,
  "checklistId"  TEXT,
  "permitRequired"  BOOLEAN DEFAULT false NOT NULL,
  "lockoutTagoutRequired"  BOOLEAN DEFAULT false NOT NULL,
  "highRiskWork"  BOOLEAN DEFAULT false NOT NULL,
  "safetyEquipmentReq"  BOOLEAN DEFAULT false NOT NULL,
  "safetyNotes"  TEXT,
  "startedAt"  TIMESTAMPTZ,
  "completedAt"  TIMESTAMPTZ,
  "checkInGps"  TEXT
);

CREATE TABLE "WorkOrderMaterial" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "workOrderId"  TEXT NOT NULL,
  "inventoryItemId"  TEXT NOT NULL,
  "quantity"  INTEGER NOT NULL,
  "unitCost"  DOUBLE PRECISION NOT NULL,
  "totalCost"  DOUBLE PRECISION NOT NULL
);

CREATE TABLE "ChecklistTemplate" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "description"  TEXT,
  "items"  TEXT NOT NULL,
  "isDefault"  BOOLEAN DEFAULT false NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "PmSchedule" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "equipmentId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "description"  TEXT,
  "frequency"  TEXT NOT NULL,
  "customDays"  INTEGER,
  "lastExecuted"  TIMESTAMPTZ,
  "nextDueDate"  TIMESTAMPTZ NOT NULL,
  "assignedToId"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "checklistTemplateId"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "assignedTo"  TEXT
);

CREATE TABLE "Quotation" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerId"  TEXT NOT NULL,
  "complaintId"  TEXT,
  "quotationNo"  TEXT,
  "title"  TEXT NOT NULL,
  "description"  TEXT,
  "referenceNo"  TEXT,
  "projectName"  TEXT,
  "site"  TEXT,
  "preparedBy"  TEXT,
  "items"  TEXT NOT NULL,
  "terms"  TEXT,
  "currency"  TEXT DEFAULT 'BND' NOT NULL,
  "subtotal"  DOUBLE PRECISION NOT NULL,
  "taxRate"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "tax"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "discount"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "shipping"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "total"  DOUBLE PRECISION NOT NULL,
  "status"  TEXT DEFAULT 'DRAFT' NOT NULL,
  "validUntil"  TIMESTAMPTZ,
  "approvedBy"  TEXT,
  "approvedAt"  TIMESTAMPTZ,
  "sentAt"  TIMESTAMPTZ,
  "acceptedAt"  TIMESTAMPTZ,
  "pdfUrl"  TEXT,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "preparedByUser"  TEXT
);

CREATE TABLE "Invoice" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerId"  TEXT NOT NULL,
  "workOrderId"  TEXT,
  "quotationId"  TEXT,
  "invoiceNumber"  TEXT NOT NULL UNIQUE,
  "title"  TEXT NOT NULL,
  "description"  TEXT,
  "items"  TEXT NOT NULL
);

CREATE TABLE "InventoryCategory" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "code"  TEXT,
  "description"  TEXT,
  "icon"  TEXT,
  "color"  TEXT,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "name")
);

CREATE TABLE "InventorySubcategory" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "categoryId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "code"  TEXT,
  "description"  TEXT,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "categoryId", "name")
);

CREATE TABLE "InventoryItem" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "itemCode"  TEXT UNIQUE,
  "sku"  TEXT UNIQUE,
  "barcode"  TEXT UNIQUE,
  "qrCode"  TEXT,
  "name"  TEXT NOT NULL,
  "shortName"  TEXT,
  "itemType"  TEXT DEFAULT 'inventory' NOT NULL,
  "categoryId"  TEXT,
  "subcategoryId"  TEXT,
  "description"  TEXT,
  "shortDescription"  TEXT,
  "brand"  TEXT,
  "manufacturer"  TEXT,
  "model"  TEXT,
  "partNumber"  TEXT,
  "serialNumber"  TEXT,
  "unit"  TEXT DEFAULT 'pcs' NOT NULL,
  "unitWeight"  DOUBLE PRECISION,
  "dimensions"  TEXT
);

CREATE TABLE "Warehouse" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "code"  TEXT,
  "type"  TEXT DEFAULT 'main' NOT NULL,
  "address"  TEXT,
  "manager"  TEXT,
  "phone"  TEXT,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "name")
);

CREATE TABLE "WarehouseStock" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "warehouseId"  TEXT NOT NULL,
  "itemId"  TEXT NOT NULL,
  "quantity"  INTEGER DEFAULT 0 NOT NULL,
  "reserved"  INTEGER DEFAULT 0 NOT NULL,
  "damaged"  INTEGER DEFAULT 0 NOT NULL,
  "returned"  INTEGER DEFAULT 0 NOT NULL,
  "batchNo"  TEXT,
  "lotNumber"  TEXT,
  "expiryDate"  TIMESTAMPTZ,
  "costMethod"  TEXT DEFAULT 'fifo' NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE ("warehouseId", "itemId")
);

CREATE TABLE "ItemSupplier" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "itemId"  TEXT NOT NULL,
  "supplierName"  TEXT NOT NULL,
  "supplierCode"  TEXT,
  "contactPerson"  TEXT,
  "phone"  TEXT,
  "email"  TEXT,
  "address"  TEXT,
  "leadTimeDays"  INTEGER DEFAULT 0 NOT NULL,
  "purchasePrice"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "moq"  INTEGER DEFAULT 1 NOT NULL,
  "warranty"  TEXT,
  "paymentTerms"  TEXT,
  "rating"  INTEGER,
  "isPrimary"  BOOLEAN DEFAULT false NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "StockMovement" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "itemId"  TEXT NOT NULL,
  "warehouseId"  TEXT,
  "type"  TEXT NOT NULL,
  "quantity"  INTEGER NOT NULL,
  "previousQty"  INTEGER DEFAULT 0 NOT NULL,
  "newQty"  INTEGER DEFAULT 0 NOT NULL,
  "reason"  TEXT,
  "referenceNo"  TEXT,
  "referenceType"  TEXT,
  "fromWarehouseId"  TEXT,
  "batchNo"  TEXT,
  "lotNumber"  TEXT,
  "expiryDate"  TIMESTAMPTZ,
  "unitCost"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "notes"  TEXT,
  "performedBy"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "warehouse"  TEXT
);

CREATE TABLE "PriceBook" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "code"  TEXT,
  "description"  TEXT,
  "isDefault"  BOOLEAN DEFAULT false NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "name")
);

CREATE TABLE "PriceBookEntry" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "priceBookId"  TEXT NOT NULL,
  "itemId"  TEXT NOT NULL,
  "price"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "discount"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "currency"  TEXT DEFAULT 'BND' NOT NULL,
  "effectiveFrom"  TIMESTAMPTZ,
  "effectiveTo"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("priceBookId", "itemId")
);

CREATE TABLE "PurchaseOrder" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "poNumber"  TEXT NOT NULL UNIQUE,
  "supplier"  TEXT NOT NULL,
  "supplierContact"  TEXT,
  "items"  TEXT NOT NULL,
  "subtotal"  DOUBLE PRECISION NOT NULL,
  "tax"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "total"  DOUBLE PRECISION NOT NULL,
  "status"  TEXT DEFAULT 'DRAFT' NOT NULL,
  "expectedDate"  TIMESTAMPTZ,
  "receivedAt"  TIMESTAMPTZ,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "Vehicle" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "plateNumber"  TEXT NOT NULL,
  "make"  TEXT NOT NULL,
  "model"  TEXT NOT NULL,
  "year"  INTEGER,
  "vin"  TEXT,
  "fuelType"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "currentMileage"  DOUBLE PRECISION,
  "nextServiceDate"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "VehicleLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleId"  TEXT NOT NULL,
  "userId"  TEXT,
  "type"  TEXT NOT NULL,
  "date"  TIMESTAMPTZ NOT NULL,
  "odometer"  DOUBLE PRECISION,
  "quantity"  DOUBLE PRECISION,
  "cost"  DOUBLE PRECISION NOT NULL,
  "description"  TEXT,
  "location"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "user"  TEXT
);

CREATE TABLE "ComplaintTimeline" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "complaintId"  TEXT NOT NULL,
  "action"  TEXT NOT NULL,
  "fromStatus"  TEXT,
  "toStatus"  TEXT,
  "description"  TEXT NOT NULL,
  "performedBy"  TEXT,
  "performedByRole"  TEXT,
  "metadata"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "Notification" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT,
  "type"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "message"  TEXT NOT NULL,
  "data"  TEXT,
  "priority"  TEXT DEFAULT 'normal' NOT NULL,
  "isRead"  BOOLEAN DEFAULT false NOT NULL,
  "readAt"  TIMESTAMPTZ,
  "archivedAt"  TIMESTAMPTZ,
  "relatedEntityType"  TEXT,
  "relatedEntityId"  TEXT,
  "actionUrl"  TEXT,
  "actionLabel"  TEXT,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "AuditLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "action"  TEXT NOT NULL,
  "entity"  TEXT NOT NULL,
  "entityId"  TEXT,
  "oldValue"  TEXT,
  "newValue"  TEXT,
  "details"  TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "device"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "LeaveRequest" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "type"  TEXT NOT NULL,
  "startDate"  TIMESTAMPTZ NOT NULL,
  "endDate"  TIMESTAMPTZ NOT NULL,
  "days"  DOUBLE PRECISION NOT NULL,
  "reason"  TEXT,
  "status"  TEXT DEFAULT 'PENDING' NOT NULL,
  "approvedBy"  TEXT,
  "approvedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "Attendance" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "date"  TIMESTAMPTZ NOT NULL,
  "checkIn"  TIMESTAMPTZ,
  "checkOut"  TIMESTAMPTZ,
  "checkInGps"  TEXT,
  "checkOutGps"  TEXT,
  "hoursWorked"  DOUBLE PRECISION,
  "status"  TEXT DEFAULT 'present' NOT NULL,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "userId", "date")
);

CREATE TABLE "HrShift" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "startTime"  TEXT NOT NULL,
  "endTime"  TEXT NOT NULL,
  "breakMinutes"  INTEGER DEFAULT 60 NOT NULL,
  "color"  TEXT DEFAULT '#3b82f6' NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "name")
);

CREATE TABLE "HrShiftSchedule" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "shiftId"  TEXT NOT NULL,
  "effectiveFrom"  TIMESTAMPTZ NOT NULL,
  "effectiveTo"  TIMESTAMPTZ,
  "weeklyOffDays"  TEXT NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrHoliday" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "date"  TIMESTAMPTZ NOT NULL,
  "type"  TEXT DEFAULT 'public' NOT NULL,
  "recurring"  BOOLEAN DEFAULT false NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "date")
);

CREATE TABLE "HrEmployee" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL UNIQUE,
  "employeeId"  TEXT NOT NULL,
  "departmentId"  TEXT,
  "designation"  TEXT,
  "employmentType"  TEXT DEFAULT 'full_time' NOT NULL,
  "reportingToId"  TEXT,
  "basicSalary"  DOUBLE PRECISION,
  "nationality"  TEXT,
  "passportNumber"  TEXT,
  "passportExpiry"  TIMESTAMPTZ,
  "visaNumber"  TEXT,
  "visaExpiry"  TIMESTAMPTZ,
  "drivingLicense"  TEXT,
  "drivingLicenseExpiry"  TIMESTAMPTZ,
  "joiningDate"  TIMESTAMPTZ,
  "probationEnds"  TIMESTAMPTZ,
  "contractEnd"  TIMESTAMPTZ,
  "bankName"  TEXT,
  "bankAccount"  TEXT,
  "bankBranch"  TEXT,
  "emergencyName"  TEXT,
  "emergencyPhone"  TEXT,
  "emergencyRelation"  TEXT,
  "dateOfBirth"  TIMESTAMPTZ,
  "gender"  TEXT,
  "maritalStatus"  TEXT,
  "bloodGroup"  TEXT,
  "photo"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "shift"  TEXT,
  "shiftId"  TEXT,
  "department"  TEXT,
  UNIQUE ("tenantId", "employeeId")
);

CREATE TABLE "HrLeaveType" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "code"  TEXT NOT NULL UNIQUE,
  "daysAllowed"  DOUBLE PRECISION NOT NULL,
  "isPaid"  BOOLEAN DEFAULT true NOT NULL,
  "carryForward"  BOOLEAN DEFAULT false NOT NULL,
  "maxCarryDays"  DOUBLE PRECISION,
  "requiresDoc"  BOOLEAN DEFAULT false NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "code")
);

CREATE TABLE "HrLeaveBalance" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "leaveTypeId"  TEXT NOT NULL,
  "totalDays"  DOUBLE PRECISION NOT NULL,
  "usedDays"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "carriedDays"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "year"  INTEGER NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "employeeId", "leaveTypeId", "year")
);

CREATE TABLE "HrLeaveRequest" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "leaveTypeId"  TEXT NOT NULL,
  "startDate"  TIMESTAMPTZ NOT NULL,
  "endDate"  TIMESTAMPTZ NOT NULL,
  "days"  DOUBLE PRECISION NOT NULL,
  "reason"  TEXT,
  "status"  TEXT DEFAULT 'PENDING' NOT NULL,
  "supervisorId"  TEXT,
  "supervisorApprovedAt"  TIMESTAMPTZ,
  "hrOfficerId"  TEXT,
  "hrApprovedAt"  TIMESTAMPTZ,
  "rejectedBy"  TEXT,
  "rejectedAt"  TIMESTAMPTZ,
  "rejectionReason"  TEXT,
  "attachmentUrl"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrPayroll" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "month"  INTEGER NOT NULL,
  "year"  INTEGER NOT NULL,
  "basicSalary"  DOUBLE PRECISION NOT NULL,
  "allowances"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "deductions"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "overtimePay"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "bonus"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "loanDeduction"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "tax"  DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "netPay"  DOUBLE PRECISION NOT NULL,
  "status"  TEXT DEFAULT 'DRAFT' NOT NULL,
  "payslipUrl"  TEXT,
  "processedBy"  TEXT,
  "processedAt"  TIMESTAMPTZ,
  "paidAt"  TIMESTAMPTZ,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "employeeId", "month", "year")
);

CREATE TABLE "HrOvertimeRequest" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "date"  TIMESTAMPTZ NOT NULL,
  "hours"  DOUBLE PRECISION NOT NULL,
  "reason"  TEXT,
  "status"  TEXT DEFAULT 'PENDING' NOT NULL,
  "supervisorId"  TEXT,
  "supervisorApprovedAt"  TIMESTAMPTZ,
  "hrOfficerId"  TEXT,
  "hrApprovedAt"  TIMESTAMPTZ,
  "rate"  DOUBLE PRECISION,
  "totalPay"  DOUBLE PRECISION,
  "payrollId"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrJobPosition" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "departmentId"  TEXT,
  "type"  TEXT DEFAULT 'full_time' NOT NULL,
  "vacancies"  INTEGER DEFAULT 1 NOT NULL,
  "location"  TEXT,
  "salaryMin"  DOUBLE PRECISION,
  "salaryMax"  DOUBLE PRECISION,
  "description"  TEXT,
  "requirements"  TEXT,
  "status"  TEXT DEFAULT 'open' NOT NULL,
  "postedDate"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "closingDate"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrCandidate" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "jobId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "email"  TEXT NOT NULL,
  "phone"  TEXT,
  "resumeUrl"  TEXT,
  "coverLetterUrl"  TEXT,
  "source"  TEXT,
  "status"  TEXT DEFAULT 'applied' NOT NULL,
  "appliedAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "interviewDate"  TIMESTAMPTZ,
  "interviewerId"  TEXT,
  "offerSalary"  DOUBLE PRECISION,
  "offerDate"  TIMESTAMPTZ,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrPerformanceReview" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "period"  TEXT NOT NULL,
  "type"  TEXT DEFAULT 'quarterly' NOT NULL,
  "kpiScore"  DOUBLE PRECISION,
  "goalsScore"  DOUBLE PRECISION,
  "overallScore"  DOUBLE PRECISION,
  "rating"  TEXT,
  "employeeComments"  TEXT,
  "managerComments"  TEXT,
  "reviewerId"  TEXT,
  "status"  TEXT DEFAULT 'draft' NOT NULL,
  "completedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrTraining" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "description"  TEXT,
  "provider"  TEXT,
  "location"  TEXT,
  "startDate"  TIMESTAMPTZ NOT NULL,
  "endDate"  TIMESTAMPTZ NOT NULL,
  "cost"  DOUBLE PRECISION,
  "maxParticipants"  INTEGER,
  "status"  TEXT DEFAULT 'planned' NOT NULL,
  "certificateTemplate"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrTrainingRecord" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "trainingId"  TEXT NOT NULL,
  "status"  TEXT DEFAULT 'enrolled' NOT NULL,
  "score"  DOUBLE PRECISION,
  "certificateUrl"  TEXT,
  "certificateExpiry"  TIMESTAMPTZ,
  "completedAt"  TIMESTAMPTZ,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "employeeId", "trainingId")
);

CREATE TABLE "HrAssetAssignment" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "assetType"  TEXT NOT NULL,
  "assetName"  TEXT NOT NULL,
  "assetId"  TEXT,
  "serialNumber"  TEXT,
  "assignedDate"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "returnDate"  TIMESTAMPTZ,
  "status"  TEXT DEFAULT 'assigned' NOT NULL,
  "condition"  TEXT,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrEmployeeDocument" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "documentType"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "fileUrl"  TEXT NOT NULL,
  "expiryDate"  TIMESTAMPTZ,
  "reminderDays"  INTEGER DEFAULT 30 NOT NULL,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "uploadedAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrVisitor" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "email"  TEXT,
  "phone"  TEXT,
  "company"  TEXT,
  "purpose"  TEXT,
  "hostEmployeeId"  TEXT,
  "checkIn"  TIMESTAMPTZ,
  "checkOut"  TIMESTAMPTZ,
  "photoUrl"  TEXT,
  "idNumber"  TEXT,
  "badgeNumber"  TEXT,
  "status"  TEXT DEFAULT 'expected' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrMedicalRecord" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "recordType"  TEXT NOT NULL,
  "provider"  TEXT,
  "date"  TIMESTAMPTZ NOT NULL,
  "expiryDate"  TIMESTAMPTZ,
  "details"  TEXT,
  "fileUrl"  TEXT,
  "cost"  DOUBLE PRECISION,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrTravelRequest" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "destination"  TEXT NOT NULL,
  "purpose"  TEXT NOT NULL,
  "startDate"  TIMESTAMPTZ NOT NULL,
  "endDate"  TIMESTAMPTZ NOT NULL,
  "budget"  DOUBLE PRECISION,
  "actualCost"  DOUBLE PRECISION,
  "status"  TEXT DEFAULT 'PENDING' NOT NULL,
  "approvedBy"  TEXT,
  "approvedAt"  TIMESTAMPTZ,
  "rejectionReason"  TEXT,
  "notes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrExpenseClaim" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "amount"  DOUBLE PRECISION NOT NULL,
  "description"  TEXT NOT NULL,
  "receiptUrl"  TEXT,
  "expenseDate"  TIMESTAMPTZ NOT NULL,
  "status"  TEXT DEFAULT 'PENDING' NOT NULL,
  "approvedBy"  TEXT,
  "approvedAt"  TIMESTAMPTZ,
  "paidAt"  TIMESTAMPTZ,
  "rejectionReason"  TEXT,
  "payrollId"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrDisciplinaryAction" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "type"  TEXT NOT NULL,
  "severity"  TEXT DEFAULT 'minor' NOT NULL,
  "description"  TEXT NOT NULL,
  "incidentDate"  TIMESTAMPTZ NOT NULL,
  "actionTaken"  TEXT,
  "documentUrl"  TEXT,
  "issuedBy"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "resolvedAt"  TIMESTAMPTZ,
  "resolution"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "HrAnnouncement" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "content"  TEXT NOT NULL,
  "type"  TEXT DEFAULT 'info' NOT NULL,
  "priority"  TEXT DEFAULT 'normal' NOT NULL,
  "targetRoles"  TEXT,
  "targetDepartments"  TEXT,
  "isPopup"  BOOLEAN DEFAULT false NOT NULL,
  "popupExpiry"  TIMESTAMPTZ,
  "status"  TEXT DEFAULT 'published' NOT NULL,
  "publishedBy"  TEXT,
  "publishedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsSetting" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "key"  TEXT NOT NULL,
  "value"  TEXT NOT NULL,
  "category"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "key")
);

CREATE TABLE "CmsHero" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "headline"  TEXT,
  "subheadline"  TEXT,
  "backgroundImage"  TEXT,
  "backgroundVideo"  TEXT,
  "cta1Text"  TEXT,
  "cta1Link"  TEXT,
  "cta2Text"  TEXT,
  "cta2Link"  TEXT,
  "stat1Value"  TEXT,
  "stat1Label"  TEXT,
  "stat2Value"  TEXT,
  "stat2Label"  TEXT,
  "stat3Value"  TEXT,
  "stat3Label"  TEXT,
  "chipText"  TEXT,
  "chipSubtext"  TEXT,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "publishedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsService" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "slug"  TEXT NOT NULL,
  "description"  TEXT,
  "image"  TEXT,
  "icon"  TEXT,
  "category"  TEXT,
  "status"  TEXT DEFAULT 'draft' NOT NULL,
  "seoTitle"  TEXT,
  "seoDescription"  TEXT,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "isEnabled"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "slug")
);

CREATE TABLE "CmsIndustry" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "description"  TEXT,
  "image"  TEXT,
  "icon"  TEXT,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "isEnabled"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsProject" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "slug"  TEXT NOT NULL,
  "description"  TEXT,
  "category"  TEXT,
  "featuredImage"  TEXT,
  "images"  TEXT,
  "beforeAfterImages"  TEXT,
  "completionStatus"  TEXT DEFAULT 'planned' NOT NULL,
  "isFeatured"  BOOLEAN DEFAULT false NOT NULL,
  "galleryImages"  TEXT,
  "seoTitle"  TEXT,
  "seoDescription"  TEXT,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "status"  TEXT DEFAULT 'draft' NOT NULL,
  "publishedAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "slug")
);

CREATE TABLE "CmsBlogCategory" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "slug"  TEXT NOT NULL,
  "description"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "slug")
);

CREATE TABLE "CmsBlog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "slug"  TEXT NOT NULL,
  "excerpt"  TEXT,
  "content"  TEXT,
  "featuredImage"  TEXT,
  "categoryId"  TEXT,
  "authorId"  TEXT,
  "status"  TEXT DEFAULT 'draft' NOT NULL,
  "seoTitle"  TEXT,
  "seoDescription"  TEXT,
  "seoKeywords"  TEXT,
  "isFeatured"  BOOLEAN DEFAULT false NOT NULL,
  "publishedAt"  TIMESTAMPTZ,
  "scheduledAt"  TIMESTAMPTZ,
  "viewCount"  INTEGER DEFAULT 0 NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "category"  TEXT,
  UNIQUE ("tenantId", "slug")
);

CREATE TABLE "CmsTestimonial" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerName"  TEXT NOT NULL,
  "company"  TEXT,
  "photo"  TEXT,
  "rating"  INTEGER NOT NULL,
  "comment"  TEXT NOT NULL,
  "status"  TEXT DEFAULT 'draft' NOT NULL,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "isEnabled"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsCareerJob" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "department"  TEXT,
  "description"  TEXT,
  "requirements"  TEXT,
  "salary"  TEXT,
  "status"  TEXT DEFAULT 'open' NOT NULL,
  "applicationDeadline"  TIMESTAMPTZ,
  "location"  TEXT,
  "type"  TEXT DEFAULT 'fulltime' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsCareerApplication" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "jobId"  TEXT NOT NULL,
  "fullName"  TEXT NOT NULL,
  "email"  TEXT NOT NULL,
  "phone"  TEXT,
  "resumeUrl"  TEXT,
  "coverLetter"  TEXT,
  "status"  TEXT DEFAULT 'new' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsContactMessage" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "email"  TEXT NOT NULL,
  "phone"  TEXT,
  "subject"  TEXT,
  "message"  TEXT NOT NULL,
  "source"  TEXT DEFAULT 'website' NOT NULL,
  "status"  TEXT DEFAULT 'new' NOT NULL,
  "assignedToId"  TEXT,
  "reply"  TEXT,
  "replyAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsMedia" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "fileName"  TEXT NOT NULL,
  "originalName"  TEXT NOT NULL,
  "mimeType"  TEXT NOT NULL,
  "size"  INTEGER NOT NULL,
  "url"  TEXT NOT NULL,
  "thumbnailUrl"  TEXT,
  "folder"  TEXT,
  "category"  TEXT,
  "alt"  TEXT,
  "width"  INTEGER,
  "height"  INTEGER,
  "uploadedById"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsSeo" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "pagePath"  TEXT NOT NULL,
  "title"  TEXT,
  "description"  TEXT,
  "keywords"  TEXT,
  "ogTitle"  TEXT,
  "ogDescription"  TEXT,
  "ogImage"  TEXT,
  "schemaMarkup"  TEXT,
  "canonicalUrl"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId", "pagePath")
);

CREATE TABLE "CmsFooter" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "companyDescription"  TEXT,
  "address"  TEXT,
  "phone"  TEXT,
  "email"  TEXT,
  "whatsapp"  TEXT,
  "facebook"  TEXT,
  "instagram"  TEXT,
  "linkedin"  TEXT,
  "twitter"  TEXT,
  "youtube"  TEXT,
  "copyrightText"  TEXT,
  "privacyPolicyLink"  TEXT,
  "termsLink"  TEXT,
  "menuLinks"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsAnnouncement" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "text"  TEXT NOT NULL,
  "type"  TEXT DEFAULT 'info' NOT NULL,
  "link"  TEXT,
  "isEnabled"  BOOLEAN DEFAULT true NOT NULL,
  "scheduledFrom"  TIMESTAMPTZ,
  "scheduledTo"  TIMESTAMPTZ,
  "displayOrder"  INTEGER DEFAULT 0 NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsPopup" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "content"  TEXT,
  "type"  TEXT DEFAULT 'welcome' NOT NULL,
  "imageUrl"  TEXT,
  "frequency"  TEXT DEFAULT 'once' NOT NULL,
  "isEnabled"  BOOLEAN DEFAULT true NOT NULL,
  "scheduledFrom"  TIMESTAMPTZ,
  "scheduledTo"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsForm" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "formType"  TEXT DEFAULT 'contact' NOT NULL,
  "fields"  TEXT NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "CmsActivityLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT,
  "action"  TEXT NOT NULL,
  "section"  TEXT,
  "details"  TEXT,
  "ipAddress"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "WhatsAppConfig" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "provider"  TEXT DEFAULT 'openwa' NOT NULL,
  "isEnabled"  BOOLEAN DEFAULT false NOT NULL,
  "phoneNumber"  TEXT,
  "businessName"  TEXT,
  "openwaBaseUrl"  TEXT,
  "openwaSession"  TEXT,
  "openwaApiKey"  TEXT,
  "openwaQrCode"  TEXT,
  "openwaStatus"  TEXT DEFAULT 'disconnected' NOT NULL,
  "metaAccessToken"  TEXT,
  "metaPhoneNumberId"  TEXT,
  "metaVerifyToken"  TEXT,
  "metaWebhookSecret"  TEXT,
  "metaBusinessAccountId"  TEXT,
  "twilioAccountSid"  TEXT,
  "twilioAuthToken"  TEXT,
  "twilioPhoneNumber"  TEXT,
  "autoReplyEnabled"  BOOLEAN DEFAULT true NOT NULL,
  "welcomeMessage"  TEXT DEFAULT 'Welcome to MOHD.HMS ENTERPRISE!\n\nPlease choose:\n1️⃣ New Complaint\n2️⃣ Service Request\n3️⃣ Complaint Status\n4️⃣ My Equipment\n5️⃣ Work Order Status\n6️⃣ Invoices\n7️⃣ Emergency Service\n8️⃣ Speak to Customer Support' NOT NULL,
  "emergencyNumbers"  TEXT,
  "defaultPriority"  TEXT DEFAULT 'medium' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  UNIQUE ("tenantId")
);

CREATE TABLE "WhatsAppSession" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "configId"  TEXT NOT NULL,
  "phoneNumber"  TEXT NOT NULL,
  "customerId"  TEXT,
  "sessionId"  TEXT,
  "state"  TEXT DEFAULT 'menu' NOT NULL,
  "stateData"  TEXT,
  "lastMessageAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "messageCount"  INTEGER DEFAULT 0 NOT NULL,
  "isActive"  BOOLEAN DEFAULT true NOT NULL,
  "isBlocked"  BOOLEAN DEFAULT false NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "customer"  TEXT
);

CREATE TABLE "WhatsAppMessage" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "sessionId"  TEXT NOT NULL,
  "threadId"  TEXT,
  "direction"  TEXT NOT NULL,
  "messageType"  TEXT DEFAULT 'text' NOT NULL,
  "content"  TEXT,
  "mediaUrl"  TEXT,
  "mediaType"  TEXT,
  "thumbnailUrl"  TEXT,
  "caption"  TEXT,
  "location"  TEXT
);

CREATE TABLE "ConversationThread" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "sessionId"  TEXT NOT NULL,
  "subject"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL,
  "assignedToId"  TEXT,
  "lastMessageAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "messageCount"  INTEGER DEFAULT 0 NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "customer"  TEXT,
  "customerId"  TEXT
);

CREATE TABLE "WhatsAppTemplate" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "category"  TEXT NOT NULL,
  "content"  TEXT NOT NULL
);

CREATE TABLE "CustomerFeedback" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerId"  TEXT NOT NULL,
  "complaintId"  TEXT,
  "workOrderId"  TEXT,
  "rating"  INTEGER NOT NULL,
  "comment"  TEXT,
  "source"  TEXT DEFAULT 'whatsapp' NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "CustomerReport" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "customerId"  TEXT NOT NULL,
  "sessionId"  TEXT,
  "type"  TEXT DEFAULT 'escalation' NOT NULL,
  "subject"  TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "priority"  TEXT DEFAULT 'medium' NOT NULL,
  "status"  TEXT DEFAULT 'OPEN' NOT NULL,
  "resolvedById"  TEXT,
  "resolvedAt"  TIMESTAMPTZ,
  "resolutionNotes"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "BroadcastLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "title"  TEXT NOT NULL,
  "content"  TEXT NOT NULL,
  "templateId"  TEXT,
  "recipientCount"  INTEGER DEFAULT 0 NOT NULL,
  "sentCount"  INTEGER DEFAULT 0 NOT NULL,
  "deliveredCount"  INTEGER DEFAULT 0 NOT NULL,
  "failedCount"  INTEGER DEFAULT 0 NOT NULL,
  "readCount"  INTEGER DEFAULT 0 NOT NULL,
  "status"  TEXT DEFAULT 'draft' NOT NULL,
  "scheduledAt"  TIMESTAMPTZ,
  "sentAt"  TIMESTAMPTZ,
  "completedAt"  TIMESTAMPTZ,
  "createdBy"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL
);

CREATE TABLE "WhatsAppDeliveryLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "messageId"  TEXT NOT NULL,
  "direction"  TEXT NOT NULL,
  "status"  TEXT NOT NULL,
  "providerStatus"  TEXT,
  "timestamp"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "errorMessage"  TEXT
);

CREATE TABLE "OtpCode" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "phoneNumber"  TEXT NOT NULL,
  "code"  TEXT NOT NULL,
  "purpose"  TEXT DEFAULT 'login' NOT NULL,
  "attempts"  INTEGER DEFAULT 0 NOT NULL,
  "maxAttempts"  INTEGER DEFAULT 5 NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "verifiedAt"  TIMESTAMPTZ,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "LoginSession" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "refreshToken"  TEXT NOT NULL UNIQUE,
  "deviceName"  TEXT,
  "deviceType"  TEXT,
  "browser"  TEXT,
  "os"  TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "isRevoked"  BOOLEAN DEFAULT false NOT NULL,
  "lastActivity"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "Device" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "name"  TEXT,
  "type"  TEXT,
  "browser"  TEXT,
  "os"  TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "lastSeen"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "isTrusted"  BOOLEAN DEFAULT false NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "PasswordResetToken" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL UNIQUE,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "usedAt"  TIMESTAMPTZ,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "PasswordResetOtp" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "userId"  TEXT NOT NULL,
  "email"  TEXT NOT NULL,
  "otpHash"  TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "attempts"  INTEGER DEFAULT 0 NOT NULL,
  "maxAttempts"  INTEGER DEFAULT 5 NOT NULL,
  "resendCount"  INTEGER DEFAULT 0 NOT NULL,
  "maxResends"  INTEGER DEFAULT 5 NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "usedAt"  TIMESTAMPTZ,
  "ipAddress"  TEXT,
  "device"  TEXT,
  "browser"  TEXT,
  "userAgent"  TEXT,
  "status"  TEXT DEFAULT 'active' NOT NULL
);

CREATE TABLE "AuthAuditLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT,
  "userId"  TEXT,
  "email"  TEXT,
  "event"  TEXT NOT NULL,
  "success"  BOOLEAN DEFAULT true NOT NULL,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "device"  TEXT,
  "browser"  TEXT,
  "metadata"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "tenant"  TEXT,
  "user"  TEXT
);

CREATE TABLE "TermsAcceptance" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"  TEXT NOT NULL,
  "tcVersion"  TEXT NOT NULL,
  "privacyVersion"  TEXT NOT NULL,
  "ip"  TEXT,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE "EmailLog" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "recipient"  TEXT NOT NULL,
  "cc"  TEXT,
  "bcc"  TEXT,
  "subject"  TEXT NOT NULL,
  "templateId"  TEXT,
  "templateName"  TEXT,
  "module"  TEXT,
  "status"  TEXT DEFAULT 'queued' NOT NULL,
  "provider"  TEXT DEFAULT 'brevo' NOT NULL,
  "providerMessageId"  TEXT,
  "errorCode"  TEXT,
  "errorMessage"  TEXT,
  "retryCount"  INTEGER DEFAULT 0 NOT NULL,
  "maxRetries"  INTEGER DEFAULT 5 NOT NULL,
  "nextRetryAt"  TIMESTAMPTZ,
  "scheduledFor"  TIMESTAMPTZ,
  "ip"  TEXT,
  "userAgent"  TEXT,
  "metadata"  TEXT,
  "attachmentCount"  INTEGER DEFAULT 0 NOT NULL,
  "createdAt"  TIMESTAMPTZ DEFAULT now() NOT NULL,
  "updatedAt"  TIMESTAMPTZ NOT NULL,
  "sentAt"  TIMESTAMPTZ,
  "deliveredAt"  TIMESTAMPTZ,
  "openedAt"  TIMESTAMPTZ,
  "bouncedAt"  TIMESTAMPTZ,
  "template"  TEXT
);

CREATE TABLE "EmailTemplate" (
  "id"  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tenantId"  TEXT NOT NULL,
  "name"  TEXT NOT NULL,
  "identifier"  TEXT NOT NULL,
  "subject"  TEXT NOT NULL,
  "module"  TEXT NOT NULL,
  "description"  TEXT,
  "bodyHtml"  TEXT NOT NULL
);

-- FOREIGN KEY CONSTRAINTS
ALTER TABLE "Department" ADD CONSTRAINT "Department_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION;
ALTER TABLE "EquipmentQrCode" ADD CONSTRAINT "EquipmentQrCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "EquipmentQrCode" ADD CONSTRAINT "EquipmentQrCode_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE NO ACTION;
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "ScanLog" ADD CONSTRAINT "ScanLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE NO ACTION;
ALTER TABLE "WorkOrderMaterial" ADD CONSTRAINT "WorkOrderMaterial_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "WorkOrder"("id") ON DELETE CASCADE;
ALTER TABLE "WorkOrderMaterial" ADD CONSTRAINT "WorkOrderMaterial_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE NO ACTION;
ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "PmSchedule" ADD CONSTRAINT "PmSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "PmSchedule" ADD CONSTRAINT "PmSchedule_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE NO ACTION;
ALTER TABLE "PmSchedule" ADD CONSTRAINT "PmSchedule_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "PmSchedule"("id") ON DELETE NO ACTION;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION;
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "Quotation"("id") ON DELETE NO ACTION;
ALTER TABLE "InventoryCategory" ADD CONSTRAINT "InventoryCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "InventorySubcategory" ADD CONSTRAINT "InventorySubcategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE;
ALTER TABLE "ItemSupplier" ADD CONSTRAINT "ItemSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE NO ACTION;
ALTER TABLE "PriceBook" ADD CONSTRAINT "PriceBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_priceBookId_fkey" FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE;
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "VehicleLog" ADD CONSTRAINT "VehicleLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE;
ALTER TABLE "VehicleLog" ADD CONSTRAINT "VehicleLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION;
ALTER TABLE "ComplaintTimeline" ADD CONSTRAINT "ComplaintTimeline_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "ComplaintTimeline" ADD CONSTRAINT "ComplaintTimeline_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION;
ALTER TABLE "HrShift" ADD CONSTRAINT "HrShift_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrShiftSchedule" ADD CONSTRAINT "HrShiftSchedule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrHoliday" ADD CONSTRAINT "HrHoliday_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrEmployee" ADD CONSTRAINT "HrEmployee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE NO ACTION;
ALTER TABLE "HrLeaveType" ADD CONSTRAINT "HrLeaveType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrLeaveBalance" ADD CONSTRAINT "HrLeaveBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrLeaveRequest" ADD CONSTRAINT "HrLeaveRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrPayroll" ADD CONSTRAINT "HrPayroll_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrOvertimeRequest" ADD CONSTRAINT "HrOvertimeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrJobPosition" ADD CONSTRAINT "HrJobPosition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrCandidate" ADD CONSTRAINT "HrCandidate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrPerformanceReview" ADD CONSTRAINT "HrPerformanceReview_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrTraining" ADD CONSTRAINT "HrTraining_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrTrainingRecord" ADD CONSTRAINT "HrTrainingRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrAssetAssignment" ADD CONSTRAINT "HrAssetAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrEmployeeDocument" ADD CONSTRAINT "HrEmployeeDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrVisitor" ADD CONSTRAINT "HrVisitor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrMedicalRecord" ADD CONSTRAINT "HrMedicalRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrTravelRequest" ADD CONSTRAINT "HrTravelRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrExpenseClaim" ADD CONSTRAINT "HrExpenseClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrDisciplinaryAction" ADD CONSTRAINT "HrDisciplinaryAction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "HrAnnouncement" ADD CONSTRAINT "HrAnnouncement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "WhatsAppConfig" ADD CONSTRAINT "WhatsAppConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "WhatsAppSession" ADD CONSTRAINT "WhatsAppSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION;
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "ConversationThread" ADD CONSTRAINT "ConversationThread_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "CustomerFeedback" ADD CONSTRAINT "CustomerFeedback_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION;
ALTER TABLE "CustomerReport" ADD CONSTRAINT "CustomerReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "CustomerReport" ADD CONSTRAINT "CustomerReport_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION;
ALTER TABLE "BroadcastLog" ADD CONSTRAINT "BroadcastLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "WhatsAppDeliveryLog" ADD CONSTRAINT "WhatsAppDeliveryLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "OtpCode" ADD CONSTRAINT "OtpCode_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "LoginSession" ADD CONSTRAINT "LoginSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION;
ALTER TABLE "Device" ADD CONSTRAINT "Device_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "PasswordResetOtp" ADD CONSTRAINT "PasswordResetOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "TermsAcceptance" ADD CONSTRAINT "TermsAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE NO ACTION;

-- INDEXES
CREATE INDEX "Department_tenantId_idx" ON "Department"("tenantId");
CREATE INDEX "Equipment_tenantId_idx" ON "Equipment"("tenantId");
CREATE INDEX "Equipment_tenantId_status_idx" ON "Equipment"("tenantId", "status");
CREATE INDEX "Equipment_tenantId_customerId_idx" ON "Equipment"("tenantId", "customerId");
CREATE INDEX "ScanLog_tenantId_equipmentId_idx" ON "ScanLog"("tenantId", "equipmentId");
CREATE INDEX "ScanLog_qrId_idx" ON "ScanLog"("qrId");
CREATE INDEX "ScanLog_createdAt_idx" ON "ScanLog"("createdAt");
CREATE INDEX "PmSchedule_tenantId_idx" ON "PmSchedule"("tenantId");
CREATE INDEX "PmSchedule_tenantId_status_idx" ON "PmSchedule"("tenantId", "status");
CREATE INDEX "PmSchedule_tenantId_nextDueDate_idx" ON "PmSchedule"("tenantId", "nextDueDate");
CREATE INDEX "InventoryCategory_tenantId_idx" ON "InventoryCategory"("tenantId");
CREATE INDEX "InventorySubcategory_tenantId_idx" ON "InventorySubcategory"("tenantId");
CREATE INDEX "InventorySubcategory_categoryId_idx" ON "InventorySubcategory"("categoryId");
CREATE INDEX "Warehouse_tenantId_idx" ON "Warehouse"("tenantId");
CREATE INDEX "WarehouseStock_tenantId_idx" ON "WarehouseStock"("tenantId");
CREATE INDEX "WarehouseStock_warehouseId_idx" ON "WarehouseStock"("warehouseId");
CREATE INDEX "WarehouseStock_itemId_idx" ON "WarehouseStock"("itemId");
CREATE INDEX "ItemSupplier_tenantId_idx" ON "ItemSupplier"("tenantId");
CREATE INDEX "ItemSupplier_itemId_idx" ON "ItemSupplier"("itemId");
CREATE INDEX "ItemSupplier_supplierName_idx" ON "ItemSupplier"("supplierName");
CREATE INDEX "StockMovement_tenantId_createdAt_idx" ON "StockMovement"("tenantId", "createdAt");
CREATE INDEX "StockMovement_tenantId_itemId_idx" ON "StockMovement"("tenantId", "itemId");
CREATE INDEX "StockMovement_tenantId_type_idx" ON "StockMovement"("tenantId", "type");
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");
CREATE INDEX "PriceBook_tenantId_idx" ON "PriceBook"("tenantId");
CREATE INDEX "PriceBookEntry_tenantId_idx" ON "PriceBookEntry"("tenantId");
CREATE INDEX "PriceBookEntry_priceBookId_idx" ON "PriceBookEntry"("priceBookId");
CREATE INDEX "PriceBookEntry_itemId_idx" ON "PriceBookEntry"("itemId");
CREATE INDEX "ComplaintTimeline_tenantId_complaintId_idx" ON "ComplaintTimeline"("tenantId", "complaintId");
CREATE INDEX "ComplaintTimeline_complaintId_createdAt_idx" ON "ComplaintTimeline"("complaintId", "createdAt");
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");
CREATE INDEX "Notification_tenantId_isRead_idx" ON "Notification"("tenantId", "isRead");
CREATE INDEX "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");
CREATE INDEX "Notification_tenantId_userId_createdAt_idx" ON "Notification"("tenantId", "userId", "createdAt");
CREATE INDEX "Notification_relatedEntityType_relatedEntityId_idx" ON "Notification"("relatedEntityType", "relatedEntityId");
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX "AuditLog_tenantId_entity_idx" ON "AuditLog"("tenantId", "entity");
CREATE INDEX "AuditLog_tenantId_entityId_idx" ON "AuditLog"("tenantId", "entityId");
CREATE INDEX "Attendance_tenantId_idx" ON "Attendance"("tenantId");
CREATE INDEX "Attendance_tenantId_userId_idx" ON "Attendance"("tenantId", "userId");
CREATE INDEX "HrShift_tenantId_idx" ON "HrShift"("tenantId");
CREATE INDEX "HrShiftSchedule_tenantId_employeeId_idx" ON "HrShiftSchedule"("tenantId", "employeeId");
CREATE INDEX "HrShiftSchedule_tenantId_shiftId_idx" ON "HrShiftSchedule"("tenantId", "shiftId");
CREATE INDEX "HrHoliday_tenantId_idx" ON "HrHoliday"("tenantId");
CREATE INDEX "HrEmployee_tenantId_idx" ON "HrEmployee"("tenantId");
CREATE INDEX "HrEmployee_tenantId_departmentId_idx" ON "HrEmployee"("tenantId", "departmentId");
CREATE INDEX "HrEmployee_tenantId_status_idx" ON "HrEmployee"("tenantId", "status");
CREATE INDEX "HrLeaveType_tenantId_idx" ON "HrLeaveType"("tenantId");
CREATE INDEX "HrLeaveBalance_tenantId_employeeId_idx" ON "HrLeaveBalance"("tenantId", "employeeId");
CREATE INDEX "HrLeaveRequest_tenantId_employeeId_idx" ON "HrLeaveRequest"("tenantId", "employeeId");
CREATE INDEX "HrLeaveRequest_tenantId_status_idx" ON "HrLeaveRequest"("tenantId", "status");
CREATE INDEX "HrLeaveRequest_tenantId_leaveTypeId_idx" ON "HrLeaveRequest"("tenantId", "leaveTypeId");
CREATE INDEX "HrPayroll_tenantId_month_year_idx" ON "HrPayroll"("tenantId", "month", "year");
CREATE INDEX "HrPayroll_tenantId_status_idx" ON "HrPayroll"("tenantId", "status");
CREATE INDEX "HrOvertimeRequest_tenantId_employeeId_idx" ON "HrOvertimeRequest"("tenantId", "employeeId");
CREATE INDEX "HrOvertimeRequest_tenantId_status_idx" ON "HrOvertimeRequest"("tenantId", "status");
CREATE INDEX "HrJobPosition_tenantId_status_idx" ON "HrJobPosition"("tenantId", "status");
CREATE INDEX "HrCandidate_tenantId_jobId_idx" ON "HrCandidate"("tenantId", "jobId");
CREATE INDEX "HrCandidate_tenantId_status_idx" ON "HrCandidate"("tenantId", "status");
CREATE INDEX "HrPerformanceReview_tenantId_employeeId_idx" ON "HrPerformanceReview"("tenantId", "employeeId");
CREATE INDEX "HrPerformanceReview_tenantId_period_idx" ON "HrPerformanceReview"("tenantId", "period");
CREATE INDEX "HrTraining_tenantId_status_idx" ON "HrTraining"("tenantId", "status");
CREATE INDEX "HrTrainingRecord_tenantId_employeeId_idx" ON "HrTrainingRecord"("tenantId", "employeeId");
CREATE INDEX "HrAssetAssignment_tenantId_employeeId_idx" ON "HrAssetAssignment"("tenantId", "employeeId");
CREATE INDEX "HrAssetAssignment_tenantId_assetType_idx" ON "HrAssetAssignment"("tenantId", "assetType");
CREATE INDEX "HrEmployeeDocument_tenantId_employeeId_idx" ON "HrEmployeeDocument"("tenantId", "employeeId");
CREATE INDEX "HrEmployeeDocument_tenantId_documentType_idx" ON "HrEmployeeDocument"("tenantId", "documentType");
CREATE INDEX "HrEmployeeDocument_tenantId_expiryDate_idx" ON "HrEmployeeDocument"("tenantId", "expiryDate");
CREATE INDEX "HrVisitor_tenantId_status_idx" ON "HrVisitor"("tenantId", "status");
CREATE INDEX "HrVisitor_tenantId_checkIn_idx" ON "HrVisitor"("tenantId", "checkIn");
CREATE INDEX "HrMedicalRecord_tenantId_employeeId_idx" ON "HrMedicalRecord"("tenantId", "employeeId");
CREATE INDEX "HrMedicalRecord_tenantId_expiryDate_idx" ON "HrMedicalRecord"("tenantId", "expiryDate");
CREATE INDEX "HrTravelRequest_tenantId_employeeId_idx" ON "HrTravelRequest"("tenantId", "employeeId");
CREATE INDEX "HrTravelRequest_tenantId_status_idx" ON "HrTravelRequest"("tenantId", "status");
CREATE INDEX "HrExpenseClaim_tenantId_employeeId_idx" ON "HrExpenseClaim"("tenantId", "employeeId");
CREATE INDEX "HrExpenseClaim_tenantId_status_idx" ON "HrExpenseClaim"("tenantId", "status");
CREATE INDEX "HrExpenseClaim_tenantId_category_idx" ON "HrExpenseClaim"("tenantId", "category");
CREATE INDEX "HrDisciplinaryAction_tenantId_employeeId_idx" ON "HrDisciplinaryAction"("tenantId", "employeeId");
CREATE INDEX "HrDisciplinaryAction_tenantId_type_idx" ON "HrDisciplinaryAction"("tenantId", "type");
CREATE INDEX "HrAnnouncement_tenantId_type_idx" ON "HrAnnouncement"("tenantId", "type");
CREATE INDEX "HrAnnouncement_tenantId_status_idx" ON "HrAnnouncement"("tenantId", "status");
CREATE INDEX "CmsSetting_tenantId_idx" ON "CmsSetting"("tenantId");
CREATE INDEX "CmsHero_tenantId_idx" ON "CmsHero"("tenantId");
CREATE INDEX "CmsService_tenantId_idx" ON "CmsService"("tenantId");
CREATE INDEX "CmsIndustry_tenantId_idx" ON "CmsIndustry"("tenantId");
CREATE INDEX "CmsProject_tenantId_idx" ON "CmsProject"("tenantId");
CREATE INDEX "CmsBlogCategory_tenantId_idx" ON "CmsBlogCategory"("tenantId");
CREATE INDEX "CmsBlog_tenantId_idx" ON "CmsBlog"("tenantId");
CREATE INDEX "CmsTestimonial_tenantId_idx" ON "CmsTestimonial"("tenantId");
CREATE INDEX "CmsCareerJob_tenantId_idx" ON "CmsCareerJob"("tenantId");
CREATE INDEX "CmsCareerApplication_tenantId_idx" ON "CmsCareerApplication"("tenantId");
CREATE INDEX "CmsContactMessage_tenantId_idx" ON "CmsContactMessage"("tenantId");
CREATE INDEX "CmsMedia_tenantId_idx" ON "CmsMedia"("tenantId");
CREATE INDEX "CmsSeo_tenantId_idx" ON "CmsSeo"("tenantId");
CREATE INDEX "CmsFooter_tenantId_idx" ON "CmsFooter"("tenantId");
CREATE INDEX "CmsAnnouncement_tenantId_idx" ON "CmsAnnouncement"("tenantId");
CREATE INDEX "CmsPopup_tenantId_idx" ON "CmsPopup"("tenantId");
CREATE INDEX "CmsForm_tenantId_idx" ON "CmsForm"("tenantId");
CREATE INDEX "CmsActivityLog_tenantId_idx" ON "CmsActivityLog"("tenantId");
CREATE INDEX "WhatsAppSession_tenantId_phoneNumber_idx" ON "WhatsAppSession"("tenantId", "phoneNumber");
CREATE INDEX "WhatsAppSession_phoneNumber_idx" ON "WhatsAppSession"("phoneNumber");
CREATE INDEX "WhatsAppSession_state_idx" ON "WhatsAppSession"("state");
CREATE INDEX "ConversationThread_tenantId_status_idx" ON "ConversationThread"("tenantId", "status");
CREATE INDEX "ConversationThread_sessionId_idx" ON "ConversationThread"("sessionId");
CREATE INDEX "ConversationThread_assignedToId_idx" ON "ConversationThread"("assignedToId");
CREATE INDEX "CustomerFeedback_tenantId_customerId_idx" ON "CustomerFeedback"("tenantId", "customerId");
CREATE INDEX "CustomerReport_tenantId_status_idx" ON "CustomerReport"("tenantId", "status");
CREATE INDEX "BroadcastLog_tenantId_status_idx" ON "BroadcastLog"("tenantId", "status");
CREATE INDEX "WhatsAppDeliveryLog_tenantId_messageId_idx" ON "WhatsAppDeliveryLog"("tenantId", "messageId");
CREATE INDEX "WhatsAppDeliveryLog_messageId_idx" ON "WhatsAppDeliveryLog"("messageId");
CREATE INDEX "OtpCode_tenantId_phoneNumber_idx" ON "OtpCode"("tenantId", "phoneNumber");
CREATE INDEX "OtpCode_phoneNumber_expiresAt_idx" ON "OtpCode"("phoneNumber", "expiresAt");
CREATE INDEX "OtpCode_expiresAt_idx" ON "OtpCode"("expiresAt");
CREATE INDEX "LoginSession_userId_idx" ON "LoginSession"("userId");
CREATE INDEX "LoginSession_refreshToken_idx" ON "LoginSession"("refreshToken");
CREATE INDEX "LoginSession_tenantId_userId_idx" ON "LoginSession"("tenantId", "userId");
CREATE INDEX "Device_userId_idx" ON "Device"("userId");
CREATE INDEX "Device_tenantId_userId_idx" ON "Device"("tenantId", "userId");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE INDEX "PasswordResetToken_tenantId_userId_idx" ON "PasswordResetToken"("tenantId", "userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX "PasswordResetOtp_userId_idx" ON "PasswordResetOtp"("userId");
CREATE INDEX "PasswordResetOtp_email_idx" ON "PasswordResetOtp"("email");
CREATE INDEX "PasswordResetOtp_tenantId_userId_idx" ON "PasswordResetOtp"("tenantId", "userId");
CREATE INDEX "PasswordResetOtp_expiresAt_idx" ON "PasswordResetOtp"("expiresAt");
CREATE INDEX "PasswordResetOtp_status_idx" ON "PasswordResetOtp"("status");
CREATE INDEX "AuthAuditLog_tenantId_createdAt_idx" ON "AuthAuditLog"("tenantId", "createdAt");
CREATE INDEX "AuthAuditLog_email_idx" ON "AuthAuditLog"("email");
CREATE INDEX "AuthAuditLog_ipAddress_idx" ON "AuthAuditLog"("ipAddress");
CREATE INDEX "AuthAuditLog_event_idx" ON "AuthAuditLog"("event");
CREATE INDEX "TermsAcceptance_userId_createdAt_idx" ON "TermsAcceptance"("userId", "createdAt");
CREATE INDEX "TermsAcceptance_tcVersion_idx" ON "TermsAcceptance"("tcVersion");
CREATE INDEX "EmailLog_tenantId_createdAt_idx" ON "EmailLog"("tenantId", "createdAt");
CREATE INDEX "EmailLog_tenantId_status_idx" ON "EmailLog"("tenantId", "status");
CREATE INDEX "EmailLog_tenantId_module_idx" ON "EmailLog"("tenantId", "module");
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_scheduledFor_idx" ON "EmailLog"("scheduledFor");
CREATE INDEX "EmailLog_nextRetryAt_idx" ON "EmailLog"("nextRetryAt");
CREATE INDEX "EmailLog_providerMessageId_idx" ON "EmailLog"("providerMessageId");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

COMMIT;