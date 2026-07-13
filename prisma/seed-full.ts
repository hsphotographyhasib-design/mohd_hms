/**
 * Comprehensive seed data script for FacilityPro CMMS demo.
 * Creates realistic sample data for the entire application.
 * Usage: bun run prisma/seed-full.ts
 *
 * IMPORTANT: Run seed-sqlite.ts FIRST to create the base data (tenant, users, departments, categories, warehouse).
 */
import { config } from "dotenv";
config({ override: true });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = process.env.DATABASE_URL || "file:./db/custom.db";
console.log(`[Seed-Full] Using database: ${dbUrl}`);

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

const TENANT_ID = "tenant-demo";
const NOW = new Date();

// Helper: days ago
function daysAgo(days: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d;
}

// Helper: days from now
function daysFromNow(days: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + days);
  return d;
}

// ──────────────────────────────────────────────
// 1. CUSTOMERS (7 entries)
// ──────────────────────────────────────────────
const customers = [
  {
    id: "cust-001",
    name: "Haji Ahmad bin Omar",
    email: "ahmad.umar@bruneipetroleum.com.bn",
    phone: "+6732221111",
    address: "Block A, Jalan Sultan, Bandar Seri Begawan BA1710",
    companyName: "Brunei Petroleum Services Sdn Bhd",
    customerNumber: "CUST-2025-001",
    district: "Bandar Seri Begawan",
    pic: "Haji Ahmad",
    paymentTerms: "Net 30",
  },
  {
    id: "cust-002",
    name: "Datin Seri Nurhaliza binti Haji Hassan",
    email: "nurhaliza@royalbruneihotels.com",
    phone: "+6732244222",
    address: "Jalan Tasek, Bandar Seri Begawan BS8611",
    companyName: "Royal Brunei Hotels & Resorts",
    customerNumber: "CUST-2025-002",
    district: "Bandar Seri Begawan",
    pic: "Datin Nurhaliza",
    paymentTerms: "Net 15",
  },
  {
    id: "cust-003",
    name: "Mr. Kevin Lim",
    email: "kevin.lim@seriaenergy.com.bn",
    phone: "+6733334444",
    address: "Lot 45, Jalan Bunga Simpur, Kuala Belait KB2513",
    companyName: "Seria Energy Solutions",
    customerNumber: "CUST-2025-003",
    district: "Kuala Belait",
    pic: "Kevin Lim",
    paymentTerms: "Net 45",
  },
  {
    id: "cust-004",
    name: "Awang Haji Mohammad bin Haji Damit",
    email: "mohammad.damit@bruneigov.gov.bn",
    phone: "+6732380111",
    address: "Ministry of Development, Old Airport Road, BSB",
    companyName: "Ministry of Development",
    customerNumber: "CUST-2025-004",
    district: "Bandar Seri Begawan",
    pic: "Awang Mohammad",
    paymentTerms: "Net 60",
  },
  {
    id: "cust-005",
    name: "Ms. Jessica Wong",
    email: "jessica@tutongmall.com.bn",
    phone: "+6734223333",
    address: "Tutong Central, Jalan Tutong, Tutong TU3341",
    companyName: "Tutong Mall Management",
    customerNumber: "CUST-2025-005",
    district: "Tutong",
    pic: "Jessica Wong",
    paymentTerms: "Net 30",
  },
  {
    id: "cust-006",
    name: "Haji Ismail bin Pengiran Haji Mohammad",
    email: "ismail@bruneiairport.com.bn",
    phone: "+6732331111",
    address: "Brunei International Airport, Jalan Berakas, BSB",
    companyName: "Brunei Airport Authority",
    customerNumber: "CUST-2025-006",
    district: "Berakas",
    pic: "Haji Ismail",
    paymentTerms: "Net 30",
  },
  {
    id: "cust-007",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@jerudongpark.com",
    phone: "+6732611234",
    address: "Jerudong Park, Jalan Jerudong, Jerudong TG1115",
    companyName: "Jerudong Park Medical Centre",
    customerNumber: "CUST-2025-007",
    district: "Jerudong",
    pic: "Dr. Sarah Chen",
    paymentTerms: "Net 15",
  },
];

// ──────────────────────────────────────────────
// 2. EQUIPMENT (12 entries)
// ──────────────────────────────────────────────
const equipment = [
  {
    id: "equip-001",
    customerId: "cust-001",
    name: "Central Chiller Unit #1",
    category: "HVAC",
    assetNumber: "AST-2025-001",
    qrCode: "QR-EQP-001",
    qrId: "qr-eqp-001",
    brand: "Daikin",
    model: "RXYQ16TAVJ",
    serialNumber: "DK20240001",
    location: "Main Building, Ground Floor",
    building: "Headquarters Block A",
    room: "Mechanical Room 1",
    installDate: daysAgo(365),
    warrantyExpiry: daysFromNow(1095),
    status: "active",
    condition: "good",
  },
  {
    id: "equip-002",
    customerId: "cust-001",
    name: "Diesel Backup Generator",
    category: "Electrical",
    assetNumber: "AST-2025-002",
    qrCode: "QR-EQP-002",
    qrId: "qr-eqp-002",
    brand: "Caterpillar",
    model: "C18-600",
    serialNumber: "CAT20240015",
    location: "Generator Room, Level B1",
    building: "Headquarters Block A",
    installDate: daysAgo(730),
    warrantyExpiry: daysAgo(365),
    status: "active",
    condition: "fair",
  },
  {
    id: "equip-003",
    customerId: "cust-002",
    name: "Booster Pump Set (3-Stage)",
    category: "Plumbing",
    assetNumber: "AST-2025-003",
    qrCode: "QR-EQP-003",
    qrId: "qr-eqp-003",
    brand: "Grundfos",
    model: "CRE 64-1",
    serialNumber: "GRF20230042",
    location: "Pump Room, Level B2",
    building: "Royal Brunei Hotel Tower 1",
    installDate: daysAgo(540),
    warrantyExpiry: daysFromNow(365),
    status: "under-maintenance",
    condition: "poor",
  },
  {
    id: "equip-004",
    customerId: "cust-002",
    name: " passenger Lift #2 (OTIS)",
    category: "Lift & Escalator",
    assetNumber: "AST-2025-004",
    qrCode: "QR-EQP-004",
    qrId: "qr-eqp-004",
    brand: "OTIS",
    model: "Gen2-MRL",
    serialNumber: "OT20210088",
    location: "Lobby Core, Floors 1-12",
    building: "Royal Brunei Hotel Tower 2",
    installDate: daysAgo(1460),
    warrantyExpiry: daysAgo(365),
    status: "active",
    condition: "fair",
  },
  {
    id: "equip-005",
    customerId: "cust-003",
    name: "Air Compressor (Screw Type)",
    category: "Mechanical",
    assetNumber: "AST-2025-005",
    qrCode: "QR-EQP-005",
    qrId: "qr-eqp-005",
    brand: "Atlas Copco",
    model: "GA37 VSD+",
    serialNumber: "AC20230017",
    location: "Workshop Area, Zone B",
    building: "Seria Energy Workshop",
    installDate: daysAgo(270),
    warrantyExpiry: daysFromNow(930),
    status: "active",
    condition: "good",
  },
  {
    id: "equip-006",
    customerId: "cust-003",
    name: "Fire Alarm Control Panel",
    category: "Fire & Safety",
    assetNumber: "AST-2025-006",
    qrCode: "QR-EQP-006",
    qrId: "qr-eqp-006",
    brand: "Notifier",
    model: "NFS2-3030",
    serialNumber: "NF20220055",
    location: "Security Control Room",
    building: "Seria Energy Main Office",
    installDate: daysAgo(900),
    warrantyExpiry: daysAgo(180),
    status: "active",
    condition: "good",
  },
  {
    id: "equip-007",
    customerId: "cust-004",
    name: "AHU Unit - Ministry Block C",
    category: "HVAC",
    assetNumber: "AST-2025-007",
    qrCode: "QR-EQP-007",
    qrId: "qr-eqp-007",
    brand: "Carrier",
    model: "39M-075",
    serialNumber: "CAR20210123",
    location: "Rooftop, Block C",
    building: "Ministry of Development Block C",
    installDate: daysAgo(1095),
    warrantyExpiry: daysAgo(730),
    status: "decommissioned",
    condition: "poor",
  },
  {
    id: "equip-008",
    customerId: "cust-005",
    name: "Escalator #1 (Main Entrance)",
    category: "Lift & Escalator",
    assetNumber: "AST-2025-008",
    qrCode: "QR-EQP-008",
    qrId: "qr-eqp-008",
    brand: "KONE",
    model: "TransitMaster 110",
    serialNumber: "KN20190067",
    location: "Main Entrance, Level 1-2",
    building: "Tutong Mall",
    installDate: daysAgo(1825),
    warrantyExpiry: daysAgo(1825),
    status: "active",
    condition: "fair",
  },
  {
    id: "equip-009",
    customerId: "cust-006",
    name: "Baggage Handling Conveyor System",
    category: "Mechanical",
    assetNumber: "AST-2025-009",
    qrCode: "QR-EQP-009",
    qrId: "qr-eqp-009",
    brand: "Siemens",
    model: "CrisBelt",
    serialNumber: "SM20180045",
    location: "Arrival Hall, Level 1",
    building: "Brunei International Airport Terminal",
    installDate: daysAgo(2190),
    warrantyExpiry: daysAgo(2190),
    status: "active",
    condition: "fair",
  },
  {
    id: "equip-010",
    customerId: "cust-007",
    name: "Medical Air Compressor",
    category: "Medical Equipment",
    assetNumber: "AST-2025-010",
    qrCode: "QR-EQP-010",
    qrId: "qr-eqp-010",
    brand: "Atlas Copco",
    model: "ZR55 VSD+ FT",
    serialNumber: "AC20240003",
    location: "Central Plant Room, Level B1",
    building: "JPMC Main Building",
    installDate: daysAgo(180),
    warrantyExpiry: daysFromNow(1440),
    status: "active",
    condition: "excellent",
  },
  {
    id: "equip-011",
    customerId: "cust-006",
    name: "Centralised UPS System",
    category: "Electrical",
    assetNumber: "AST-2025-011",
    qrCode: "QR-EQP-011",
    qrId: "qr-eqp-011",
    brand: "Eaton",
    model: "93PM-200",
    serialNumber: "EAT20220031",
    location: "Data Centre, Level 2",
    building: "Brunei International Airport Terminal",
    installDate: daysAgo(730),
    warrantyExpiry: daysFromNow(730),
    status: "active",
    condition: "good",
  },
  {
    id: "equip-012",
    customerId: "cust-007",
    name: "Chilled Water Pump (Primary)",
    category: "HVAC",
    assetNumber: "AST-2025-012",
    qrCode: "QR-EQP-012",
    qrId: "qr-eqp-012",
    brand: "Bell & Gossett",
    model: "Series 80",
    serialNumber: "BG20230109",
    location: "Chiller Plant Room, Level B2",
    building: "JPMC Main Building",
    installDate: daysAgo(365),
    warrantyExpiry: daysFromNow(1095),
    status: "under-maintenance",
    condition: "fair",
  },
];

// ──────────────────────────────────────────────
// 3. COMPLAINTS (10 entries)
// ──────────────────────────────────────────────
const complaints = [
  {
    id: "comp-001",
    customerId: "cust-001",
    equipmentId: "equip-001",
    title: "Chiller unit making unusual noise and reduced cooling",
    description: "The central chiller unit has been producing loud grinding noise for the past 3 days. Cooling capacity has dropped significantly, affecting the entire ground floor office area. Temperature readings show 28°C instead of the normal 22°C.",
    priority: "high",
    status: "in-progress",
    complaintNumber: "CMP-2025-0001",
    source: "admin",
    category: "HVAC",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-manager",
    assignedByRole: "manager",
    assignedAt: daysAgo(2),
    assignmentStatus: "ASSIGNED",
    slaResponseDeadline: daysAgo(1),
    locationInfo: "Main Building, Ground Floor, Mechanical Room 1",
    startedAt: daysAgo(1),
  },
  {
    id: "comp-002",
    customerId: "cust-001",
    equipmentId: "equip-002",
    title: "Generator failing to start during weekly test",
    description: "During the routine weekly generator test, the diesel backup generator failed to start. Battery voltage appears low. Last successful test run was 2 weeks ago.",
    priority: "critical",
    status: "in-progress",
    complaintNumber: "CMP-2025-0002",
    source: "admin",
    category: "Electrical",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-manager",
    assignedByRole: "manager",
    assignedAt: daysAgo(1),
    assignmentStatus: "ASSIGNED",
    slaResponseDeadline: NOW,
    startedAt: daysAgo(0),
  },
  {
    id: "comp-003",
    customerId: "cust-002",
    equipmentId: "equip-003",
    title: "Water pressure fluctuation in hotel tower",
    description: "Guests on floors 5-8 have reported intermittent water pressure issues. The booster pump has been cycling on and off erratically. Pressure gauge shows fluctuation between 1.5 and 3.5 bar.",
    priority: "high",
    status: "in-progress",
    complaintNumber: "CMP-2025-0003",
    source: "admin",
    category: "Plumbing",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-supervisor",
    assignedByRole: "supervisor",
    assignedAt: daysAgo(5),
    assignmentStatus: "ASSIGNED",
    slaResponseDeadline: daysAgo(4),
    startedAt: daysAgo(4),
  },
  {
    id: "comp-004",
    customerId: "cust-002",
    equipmentId: "equip-004",
    title: "Lift door not closing properly",
    description: "The passenger lift #2 in Tower 2 has a misaligned door sensor. The door sometimes reopens without obstruction, causing delays. This has been reported multiple times by hotel guests.",
    priority: "medium",
    status: "resolved",
    complaintNumber: "CMP-2025-0004",
    source: "admin",
    category: "Lift & Escalator",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-manager",
    assignedByRole: "manager",
    assignedAt: daysAgo(14),
    assignmentStatus: "ASSIGNED",
    completedAt: daysAgo(10),
    resolvedAt: daysAgo(9),
    closedAt: daysAgo(8),
    resolutionNotes: "Replaced door sensor and realigned the door track. Tested 20 cycles - all working normally.",
  },
  {
    id: "comp-005",
    customerId: "cust-003",
    equipmentId: "equip-005",
    title: "Air compressor oil leak detected",
    description: "Routine inspection revealed an oil leak from the compressor's oil separator. Oil level dropping approximately 0.5L per day. Immediate attention required to prevent compressor damage.",
    priority: "medium",
    status: "open",
    complaintNumber: "CMP-2025-0005",
    source: "admin",
    category: "Mechanical",
    assignmentStatus: "UNASSIGNED",
  },
  {
    id: "comp-006",
    customerId: "cust-004",
    equipmentId: "equip-007",
    title: "AHU unit vibration and noise - replacement recommendation needed",
    description: "The AHU unit on Block C rooftop has excessive vibration and bearing noise. Unit has exceeded its useful life. Recommending full replacement rather than repair.",
    priority: "low",
    status: "closed",
    complaintNumber: "CMP-2025-0006",
    source: "admin",
    category: "HVAC",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-manager",
    assignedByRole: "manager",
    assignedAt: daysAgo(45),
    assignmentStatus: "ASSIGNED",
    completedAt: daysAgo(40),
    resolvedAt: daysAgo(38),
    closedAt: daysAgo(35),
    resolutionNotes: "Equipment decommissioned. Replacement quotation submitted and approved. New unit to be procured under separate work order.",
  },
  {
    id: "comp-007",
    customerId: "cust-005",
    equipmentId: "equip-008",
    title: "Escalator making grinding noise on uphill section",
    description: "Mall management reported grinding noise from the main entrance escalator. Noise intensifies during peak hours. Step chain tension may need adjustment.",
    priority: "medium",
    status: "open",
    complaintNumber: "CMP-2025-0007",
    source: "admin",
    category: "Lift & Escalator",
    assignmentStatus: "UNASSIGNED",
  },
  {
    id: "comp-008",
    customerId: "cust-006",
    equipmentId: "equip-009",
    title: "Baggage conveyor belt slipping at junction point",
    description: "At the arrival hall baggage claim, the conveyor belt is slipping at the transfer junction from the main line to carousel 3. Bags are getting stuck and delayed.",
    priority: "high",
    status: "in-progress",
    complaintNumber: "CMP-2025-0008",
    source: "admin",
    category: "Mechanical",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-supervisor",
    assignedByRole: "supervisor",
    assignedAt: daysAgo(3),
    assignmentStatus: "ASSIGNED",
    startedAt: daysAgo(2),
  },
  {
    id: "comp-009",
    customerId: "cust-007",
    equipmentId: "equip-010",
    title: "Annual preventive maintenance due for medical air compressor",
    description: "The medical air compressor is due for its annual PM service. Includes filter replacement, oil change, belt inspection, and calibration of pressure sensors. Must comply with medical equipment standards.",
    priority: "medium",
    status: "open",
    complaintNumber: "CMP-2025-0009",
    source: "admin",
    category: "Preventive Maintenance",
    assignmentStatus: "UNASSIGNED",
  },
  {
    id: "comp-010",
    customerId: "cust-007",
    equipmentId: "equip-012",
    title: "Chilled water pump vibration and bearing overheating",
    description: "The primary chilled water pump is exhibiting excessive vibration and the front bearing is running hot (measured 78°C, normal is 45-55°C). Pump has been shut down to prevent further damage. Backup pump is currently in service.",
    priority: "critical",
    status: "in-progress",
    complaintNumber: "CMP-2025-0010",
    source: "admin",
    category: "HVAC",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    assignedBy: "user-supervisor",
    assignedByRole: "supervisor",
    assignedAt: daysAgo(0),
    assignmentStatus: "ASSIGNED",
    startedAt: daysAgo(0),
  },
];

// ──────────────────────────────────────────────
// 4. WORK ORDERS (8 entries)
// ──────────────────────────────────────────────
const workOrders = [
  {
    id: "wo-001",
    complaintId: "comp-001",
    customerId: "cust-001",
    equipmentId: "equip-001",
    workOrderNumber: "WO-2025-0001",
    title: "Diagnose and repair chiller unit noise",
    description: "Inspect chiller compressor, check refrigerant levels, inspect bearings and fan blades. Replace worn components as needed. Perform vibration analysis.",
    status: "in-progress",
    priority: "high",
    type: "corrective",
    category: "HVAC",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-supervisor",
    scheduledDate: daysAgo(1),
    dueDate: daysFromNow(1),
    estimatedHours: 8,
    laborHours: 4,
    startedAt: daysAgo(1),
  },
  {
    id: "wo-002",
    complaintId: "comp-002",
    customerId: "cust-001",
    equipmentId: "equip-002",
    workOrderNumber: "WO-2025-0002",
    title: "Generator battery replacement and testing",
    description: "Replace generator starter battery. Load test the new battery. Inspect alternator and voltage regulator. Perform full load bank test.",
    status: "in-progress",
    priority: "critical",
    type: "corrective",
    category: "Electrical",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-supervisor",
    scheduledDate: daysAgo(0),
    dueDate: daysAgo(0),
    estimatedHours: 4,
    startedAt: daysAgo(0),
  },
  {
    id: "wo-003",
    complaintId: "comp-003",
    customerId: "cust-002",
    equipmentId: "equip-003",
    workOrderNumber: "WO-2025-0003",
    title: "Booster pump overhaul and pressure regulation",
    description: "Dismantle and inspect 3-stage booster pump. Replace worn seals and impellers. Recalibrate pressure switches and install new pressure sustaining valve.",
    status: "in-progress",
    priority: "high",
    type: "corrective",
    category: "Plumbing",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-supervisor",
    scheduledDate: daysAgo(3),
    dueDate: daysFromNow(2),
    estimatedHours: 16,
    laborHours: 12,
    startedAt: daysAgo(3),
  },
  {
    id: "wo-004",
    complaintId: "comp-004",
    customerId: "cust-002",
    equipmentId: "equip-004",
    workOrderNumber: "WO-2025-0004",
    title: "Lift door sensor replacement and alignment",
    description: "Replace faulty infrared door sensor. Realign door tracks and adjust closing force. Test all safety features per BSI EN 81 standards.",
    status: "completed",
    priority: "medium",
    type: "corrective",
    category: "Lift & Escalator",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-manager",
    scheduledDate: daysAgo(13),
    dueDate: daysAgo(9),
    estimatedHours: 6,
    laborHours: 5,
    laborCost: 175,
    materialCost: 320,
    totalCost: 495,
    startedAt: daysAgo(12),
    completedAt: daysAgo(10),
    notes: "Replaced OTIS door sensor module. Adjusted door closing force to 150N. Tested 20 open/close cycles.",
  },
  {
    id: "wo-005",
    complaintId: "comp-006",
    customerId: "cust-004",
    equipmentId: "equip-007",
    workOrderNumber: "WO-2025-0005",
    title: "AHU decommissioning and site assessment",
    description: "Safely decommission the AHU unit. Disconnect electrical and piping connections. Cap all openings. Document final condition and recommend replacement specifications.",
    status: "completed",
    priority: "low",
    type: "corrective",
    category: "HVAC",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-manager",
    scheduledDate: daysAgo(43),
    dueDate: daysAgo(38),
    estimatedHours: 12,
    laborHours: 10,
    laborCost: 350,
    materialCost: 150,
    totalCost: 500,
    startedAt: daysAgo(42),
    completedAt: daysAgo(40),
    notes: "AHU safely decommissioned. All electrical disconnected and tagged. Piping capped. Assessment report submitted.",
  },
  {
    id: "wo-006",
    complaintId: "comp-008",
    customerId: "cust-006",
    equipmentId: "equip-009",
    workOrderNumber: "WO-2025-0006",
    title: "Conveyor belt tension adjustment and roller replacement",
    description: "Inspect and adjust conveyor belt tension at transfer junction. Replace worn rollers. Lubricate all bearings. Test with weighted load simulation.",
    status: "in-progress",
    priority: "high",
    type: "corrective",
    category: "Mechanical",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-supervisor",
    scheduledDate: daysAgo(2),
    dueDate: daysFromNow(1),
    estimatedHours: 6,
    laborHours: 2,
    startedAt: daysAgo(2),
  },
  {
    id: "wo-007",
    complaintId: "comp-010",
    customerId: "cust-007",
    equipmentId: "equip-012",
    workOrderNumber: "WO-2025-0007",
    title: "Chilled water pump bearing replacement",
    description: "Replace front bearing on primary chilled water pump. Check alignment with motor. Inspect shaft for wear. Replace mechanical seal if needed. Perform alignment check after reassembly.",
    status: "in-progress",
    priority: "critical",
    type: "corrective",
    category: "HVAC",
    assignedToId: "user-tech1",
    supervisorId: "user-supervisor",
    createdBy: "user-supervisor",
    scheduledDate: daysAgo(0),
    dueDate: daysFromNow(2),
    estimatedHours: 8,
    startedAt: daysAgo(0),
  },
  {
    id: "wo-008",
    customerId: "cust-006",
    equipmentId: "equip-011",
    workOrderNumber: "WO-2025-0008",
    title: "UPS battery health check and firmware update",
    description: "Perform comprehensive UPS battery health check including impedance testing. Update firmware to latest version. Check alarm thresholds and notification settings.",
    status: "DRAFT",
    priority: "medium",
    type: "preventive",
    category: "Electrical",
    supervisorId: "user-supervisor",
    createdBy: "user-manager",
    scheduledDate: daysFromNow(3),
    dueDate: daysFromNow(5),
    estimatedHours: 4,
  },
];

// ──────────────────────────────────────────────
// 5. PM SCHEDULES (4 entries)
// ──────────────────────────────────────────────
const pmSchedules = [
  {
    id: "pm-001",
    equipmentId: "equip-001",
    title: "Quarterly Chiller Preventive Maintenance",
    description: "Full chiller PM: clean condenser coils, check refrigerant charge, inspect compressor oil, test safety controls, calibrate sensors, check electrical connections.",
    frequency: "quarterly",
    customDays: 90,
    lastExecuted: daysAgo(30),
    nextDueDate: daysFromNow(60),
    assignedToId: "user-tech1",
    status: "active",
  },
  {
    id: "pm-002",
    equipmentId: "equip-002",
    title: "Monthly Generator Inspection & Test Run",
    description: "Monthly generator check: engine oil level, coolant level, battery voltage, run test for 30 min under load, check fuel system for leaks.",
    frequency: "monthly",
    customDays: 30,
    lastExecuted: daysAgo(25),
    nextDueDate: daysFromNow(5),
    assignedToId: "user-tech1",
    status: "active",
  },
  {
    id: "pm-003",
    equipmentId: "equip-009",
    title: "Bi-Annual Conveyor System Maintenance",
    description: "Comprehensive conveyor maintenance: belt tension, roller inspection, motor check, safety sensor testing, lubrication, alignment check.",
    frequency: "custom",
    customDays: 180,
    lastExecuted: daysAgo(90),
    nextDueDate: daysFromNow(90),
    assignedToId: "user-tech1",
    status: "active",
  },
  {
    id: "pm-004",
    equipmentId: "equip-010",
    title: "Annual Medical Air Compressor Service",
    description: "Annual service per medical standards: replace all filters, oil change, belt inspection/replacement, pressure calibration, leak test, safety valve test, documentation for compliance.",
    frequency: "yearly",
    customDays: 365,
    lastExecuted: daysAgo(350),
    nextDueDate: daysFromNow(15),
    assignedToId: "user-tech1",
    status: "active",
  },
];

// ──────────────────────────────────────────────
// 6. INVOICES (5 entries)
// ──────────────────────────────────────────────
const invoices = [
  {
    id: "inv-001",
    customerId: "cust-002",
    workOrderId: "wo-004",
    invoiceNumber: "INV-2025-0001",
    title: "Lift Door Sensor Replacement - Royal Brunei Hotel",
    items: JSON.stringify([
      { description: "OTIS Door Sensor Module", qty: 1, unitPrice: 280, total: 280 },
      { description: "Labour - Lift Technician (5 hrs)", qty: 1, unitPrice: 35, total: 175 },
      { description: "Miscellaneous Parts & Consumables", qty: 1, unitPrice: 40, total: 40 },
    ]),
    subtotal: 495,
    taxRate: 0,
    tax: 0,
    discount: 0,
    total: 495,
    status: "paid",
    currency: "BND",
    paymentTerms: "Net 15",
    dueDate: daysAgo(5),
    paidAt: daysAgo(7),
    paymentMethod: "bank_transfer",
    paymentRef: "BRN-RT-20250001",
    preparedBy: "user-finance",
    createdBy: "user-supervisor",
    approvedBy: "user-manager",
    approvedAt: daysAgo(10),
    sentAt: daysAgo(12),
    viewedAt: daysAgo(11),
  },
  {
    id: "inv-002",
    customerId: "cust-004",
    workOrderId: "wo-005",
    invoiceNumber: "INV-2025-0002",
    title: "AHU Decommissioning Service - Ministry of Development",
    items: JSON.stringify([
      { description: "AHU Decommissioning Labour (10 hrs)", qty: 1, unitPrice: 35, total: 350 },
      { description: "Piping Capping Materials", qty: 1, unitPrice: 80, total: 80 },
      { description: "Electrical Disconnection Materials", qty: 1, unitPrice: 70, total: 70 },
    ]),
    subtotal: 500,
    taxRate: 0,
    tax: 0,
    discount: 0,
    total: 500,
    status: "paid",
    currency: "BND",
    paymentTerms: "Net 60",
    dueDate: daysAgo(20),
    paidAt: daysAgo(22),
    paymentMethod: "bank_transfer",
    paymentRef: "GOV-RT-20250045",
    preparedBy: "user-finance",
    createdBy: "user-supervisor",
    approvedBy: "user-manager",
    approvedAt: daysAgo(38),
    sentAt: daysAgo(37),
    viewedAt: daysAgo(35),
  },
  {
    id: "inv-003",
    customerId: "cust-001",
    workOrderId: "wo-001",
    invoiceNumber: "INV-2025-0003",
    title: "Chiller Repair Service - Brunei Petroleum Services",
    items: JSON.stringify([
      { description: "Chiller Diagnosis & Repair (est. 8 hrs)", qty: 1, unitPrice: 45, total: 360 },
      { description: "Compressor Bearing Kit", qty: 1, unitPrice: 450, total: 450 },
      { description: "Refrigerant R-410A (5kg)", qty: 1, unitPrice: 120, total: 120 },
      { description: "Vibration Analysis Report", qty: 1, unitPrice: 200, total: 200 },
    ]),
    subtotal: 1130,
    taxRate: 0,
    tax: 0,
    discount: 50,
    total: 1080,
    status: "DRAFT",
    currency: "BND",
    paymentTerms: "Net 30",
    dueDate: daysFromNow(30),
    preparedBy: "user-finance",
    createdBy: "user-supervisor",
  },
  {
    id: "inv-004",
    customerId: "cust-002",
    workOrderId: "wo-003",
    invoiceNumber: "INV-2025-0004",
    title: "Booster Pump Overhaul - Royal Brunei Hotels",
    items: JSON.stringify([
      { description: "Pump Overhaul Labour (16 hrs)", qty: 1, unitPrice: 40, total: 640 },
      { description: "Mechanical Seal Kit", qty: 3, unitPrice: 85, total: 255 },
      { description: "Impeller Set (3 stages)", qty: 1, unitPrice: 320, total: 320 },
      { description: "Pressure Sustaining Valve", qty: 1, unitPrice: 180, total: 180 },
      { description: "Pressure Switch Calibration", qty: 1, unitPrice: 50, total: 50 },
    ]),
    subtotal: 1445,
    taxRate: 0,
    tax: 0,
    discount: 0,
    total: 1445,
    status: "sent",
    currency: "BND",
    paymentTerms: "Net 15",
    dueDate: daysFromNow(15),
    sentAt: daysAgo(1),
    preparedBy: "user-finance",
    createdBy: "user-supervisor",
    approvedBy: "user-manager",
    approvedAt: daysAgo(2),
  },
  {
    id: "inv-005",
    customerId: "cust-006",
    workOrderId: "wo-006",
    invoiceNumber: "INV-2025-0005",
    title: "Conveyor Belt Repair - Brunei Airport Authority",
    items: JSON.stringify([
      { description: "Conveyor Repair Labour (6 hrs)", qty: 1, unitPrice: 45, total: 270 },
      { description: "Replacement Rollers (set of 4)", qty: 1, unitPrice: 160, total: 160 },
      { description: "Belt Tensioner Assembly", qty: 1, unitPrice: 95, total: 95 },
    ]),
    subtotal: 525,
    taxRate: 0,
    tax: 0,
    discount: 0,
    total: 525,
    status: "overdue",
    currency: "BND",
    paymentTerms: "Net 30",
    dueDate: daysAgo(5),
    sentAt: daysAgo(20),
    viewedAt: daysAgo(18),
    preparedBy: "user-finance",
    createdBy: "user-supervisor",
    approvedBy: "user-manager",
    approvedAt: daysAgo(22),
  },
];

// ──────────────────────────────────────────────
// 7. INVENTORY ITEMS (12 entries)
// ──────────────────────────────────────────────
const inventoryItems = [
  {
    id: "item-001",
    itemCode: "ELC-CB-001",
    sku: "SKU-CB-MCB63",
    name: "MCB 3P 63A",
    shortName: "MCB 63A 3-Phase",
    itemType: "inventory",
    categoryId: "invcat-electrical-components",
    description: "Miniature Circuit Breaker, 3-Pole, 63A, 10kA breaking capacity",
    unit: "pcs",
    purchaseCost: 28.5,
    sellingPrice: 42,
    quantity: 45,
    minStock: 10,
    reorderLevel: 15,
    maxStock: 100,
    supplier: "Brunei Electrical Supply",
    location: "Shelf A-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-002",
    itemCode: "ELC-CT-001",
    sku: "SKU-CT-3P100",
    name: "Contactor 3P 100A",
    shortName: "Contactor 100A",
    itemType: "inventory",
    categoryId: "invcat-electrical-components",
    description: "3-Pole contactor, 100A, 220V coil, with 1NO+1NC auxiliary contacts",
    unit: "pcs",
    purchaseCost: 85,
    sellingPrice: 125,
    quantity: 12,
    minStock: 4,
    reorderLevel: 6,
    maxStock: 30,
    supplier: "Brunei Electrical Supply",
    location: "Shelf A-2",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-003",
    itemCode: "PLB-PV-001",
    sku: "SKU-PV-GALV50",
    name: "Galvanised Pipe 2\" (50mm)",
    shortName: "GI Pipe 2\"",
    itemType: "inventory",
    categoryId: "invcat-plumbing-supplies",
    description: "Galvanised iron pipe, 2 inch diameter, 6m length, class B",
    unit: "pcs",
    purchaseCost: 32,
    sellingPrice: 48,
    quantity: 30,
    minStock: 10,
    reorderLevel: 15,
    maxStock: 60,
    supplier: "HW Lum & Co",
    location: "Rack B-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-004",
    itemCode: "PLB-VL-001",
    sku: "SKU-VL-BRSV50",
    name: "Ball Valve 2\" (Full Bore)",
    shortName: "Ball Valve 2\"",
    itemType: "inventory",
    categoryId: "invcat-plumbing-supplies",
    description: "Brass full bore ball valve, 2 inch BSP, lever handle, PN25 rated",
    unit: "pcs",
    purchaseCost: 22,
    sellingPrice: 35,
    quantity: 25,
    minStock: 8,
    reorderLevel: 10,
    maxStock: 50,
    supplier: "HW Lum & Co",
    location: "Rack B-2",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-005",
    itemCode: "HVC-FL-001",
    sku: "SKU-FL-HF250",
    name: "HEPA Filter 24x24x12\"",
    shortName: "HEPA Filter 610x610x305mm",
    itemType: "inventory",
    categoryId: "invcat-hvac-parts",
    description: "HEPA air filter, 99.97% efficiency at 0.3 micron, galvanised frame, for AHU systems",
    unit: "pcs",
    purchaseCost: 120,
    sellingPrice: 180,
    quantity: 8,
    minStock: 3,
    reorderLevel: 4,
    maxStock: 20,
    supplier: "CoolAir Brunei",
    location: "Shelf C-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-006",
    itemCode: "HVC-CP-001",
    sku: "SKU-CMP-BRG",
    name: "Compressor Bearing Kit (Daikin)",
    shortName: "Daikin Bearing Kit",
    itemType: "inventory",
    categoryId: "invcat-hvac-parts",
    description: "Original Daikin compressor bearing kit, fits RXYQ series, includes front and rear bearings",
    unit: "set",
    purchaseCost: 380,
    sellingPrice: 550,
    quantity: 3,
    minStock: 1,
    reorderLevel: 2,
    maxStock: 6,
    supplier: "Daikin Southeast Asia",
    location: "Shelf C-2",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-007",
    itemCode: "SAF-HM-001",
    sku: "SKU-HM-FFP2",
    name: "Safety Helmet (FFP2)",
    shortName: "Safety Helmet",
    itemType: "inventory",
    categoryId: "invcat-safety-equipment",
    description: "Industrial safety helmet with adjustable harness, vented, UV resistant, certified EN397",
    unit: "pcs",
    purchaseCost: 12,
    sellingPrice: 20,
    quantity: 50,
    minStock: 15,
    reorderLevel: 20,
    maxStock: 100,
    supplier: "SafetyFirst Brunei",
    location: "Shelf D-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-008",
    itemCode: "SAF-GL-001",
    sku: "SKU-GL-SP5",
    name: "Safety Goggles (Anti-Fog)",
    shortName: "Safety Goggles",
    itemType: "inventory",
    categoryId: "invcat-safety-equipment",
    description: "Anti-fog safety goggles, indirect ventilation, anti-scratch polycarbonate lens, EN166 certified",
    unit: "pcs",
    purchaseCost: 8,
    sellingPrice: 14,
    quantity: 40,
    minStock: 10,
    reorderLevel: 15,
    maxStock: 80,
    supplier: "SafetyFirst Brunei",
    location: "Shelf D-2",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-009",
    itemCode: "CLN-DC-001",
    sku: "SKU-DC-DP50",
    name: "Degreaser Concentrate (5L)",
    shortName: "Degreaser 5L",
    itemType: "inventory",
    categoryId: "invcat-cleaning-supplies",
    description: "Industrial degreaser concentrate, water-soluble, biodegradable, dilution ratio 1:10",
    unit: "pcs",
    purchaseCost: 18,
    sellingPrice: 28,
    quantity: 20,
    minStock: 5,
    reorderLevel: 8,
    maxStock: 40,
    supplier: "CleanPro Supplies",
    location: "Shelf E-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-010",
    itemCode: "TLS-DR-001",
    sku: "SKU-DR-SET10",
    name: "Socket Set (1/2\" Drive, 10pc)",
    shortName: "Socket Set 10pc",
    itemType: "inventory",
    categoryId: "invcat-tools-hardware",
    description: "1/2 inch drive socket set, 10 pieces, 8mm-24mm, chrome vanadium steel, blow moulded case",
    unit: "set",
    purchaseCost: 45,
    sellingPrice: 68,
    quantity: 6,
    minStock: 2,
    reorderLevel: 3,
    maxStock: 10,
    supplier: "BHardware Supply",
    location: "Tool Cabinet T-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-011",
    itemCode: "IT-CBL-001",
    sku: "SKU-CBL-CAT6",
    name: "CAT6 Ethernet Cable (305m)",
    shortName: "CAT6 Cable 305m",
    itemType: "inventory",
    categoryId: "invcat-it-equipment",
    description: "CAT6 UTP ethernet cable, 305m reel, 23AWG, CM rated, blue jacket",
    unit: "roll",
    purchaseCost: 85,
    sellingPrice: 125,
    quantity: 4,
    minStock: 1,
    reorderLevel: 2,
    maxStock: 8,
    supplier: "IT Solutions Brunei",
    location: "Shelf F-1",
    status: "approved",
    approvalStatus: "approved",
  },
  {
    id: "item-012",
    itemCode: "OFC-SUP-001",
    sku: "SKU-SUP-A4RM",
    name: "A4 Copy Paper (Ream x5)",
    shortName: "A4 Paper 5-Ream",
    itemType: "inventory",
    categoryId: "invcat-office-supplies",
    description: "A4 80gsm copy paper, 500 sheets per ream, 5 reams per pack, bright white",
    unit: "pack",
    purchaseCost: 15,
    sellingPrice: 22,
    quantity: 25,
    minStock: 5,
    reorderLevel: 10,
    maxStock: 50,
    supplier: "Brunei Stationery",
    location: "Shelf G-1",
    status: "approved",
    approvalStatus: "approved",
  },
];

// ──────────────────────────────────────────────
// 8. SERVICE ITEMS (6 entries)
// ──────────────────────────────────────────────
const serviceItems = [
  {
    id: "svc-001",
    serviceCode: "SVC-HVAC-001",
    name: "HVAC System Diagnosis",
    shortName: "AC Diagnosis",
    description: "Comprehensive diagnostic check of HVAC system including refrigerant pressure, compressor performance, airflow measurement, and thermostat calibration.",
    unitOfMeasure: "per unit",
    pricingModel: "fixed",
    costPrice: 50,
    sellingPrice: 120,
    taxRate: 0,
    currency: "BND",
    standardDuration: 120,
    labourHours: 2,
    techniciansRequired: 1,
    skillLevel: "intermediate",
    technicianGrade: "Grade B",
    department: "HVAC",
  },
  {
    id: "svc-002",
    serviceCode: "SVC-HVAC-002",
    name: "Chiller Full Service (Quarterly PM)",
    shortName: "Chiller PM",
    description: "Quarterly preventive maintenance for chiller units: coil cleaning, refrigerant check, oil analysis, electrical inspection, sensor calibration, and performance report.",
    unitOfMeasure: "per unit",
    pricingModel: "fixed",
    costPrice: 200,
    sellingPrice: 450,
    taxRate: 0,
    currency: "BND",
    standardDuration: 480,
    labourHours: 8,
    techniciansRequired: 2,
    skillLevel: "senior",
    technicianGrade: "Grade A",
    department: "HVAC",
  },
  {
    id: "svc-003",
    serviceCode: "SVC-ELC-001",
    name: "Generator Load Bank Test",
    shortName: "Gen Load Test",
    description: "Full load bank testing of diesel generators including voltage regulation, frequency stability, fuel consumption measurement, and exhaust analysis.",
    unitOfMeasure: "per unit",
    pricingModel: "fixed",
    costPrice: 150,
    sellingPrice: 350,
    taxRate: 0,
    currency: "BND",
    standardDuration: 240,
    labourHours: 4,
    techniciansRequired: 2,
    skillLevel: "senior",
    technicianGrade: "Grade A",
    department: "Electrical",
  },
  {
    id: "svc-004",
    serviceCode: "SVC-PLB-001",
    name: "Pump Overhaul Service",
    shortName: "Pump Overhaul",
    description: "Complete pump overhaul including disassembly, bearing replacement, seal replacement, impeller inspection, alignment check, and performance testing.",
    unitOfMeasure: "per stage",
    pricingModel: "fixed",
    costPrice: 120,
    sellingPrice: 280,
    taxRate: 0,
    currency: "BND",
    standardDuration: 360,
    labourHours: 6,
    techniciansRequired: 1,
    skillLevel: "senior",
    technicianGrade: "Grade A",
    department: "Plumbing",
  },
  {
    id: "svc-005",
    serviceCode: "SVC-LFT-001",
    name: "Lift/Escalator Safety Inspection",
    shortName: "Lift Inspection",
    description: "Annual safety inspection for lifts and escalators per BSI EN 81 standards. Includes door mechanism, safety devices, speed governor, and emergency systems.",
    unitOfMeasure: "per unit",
    pricingModel: "fixed",
    costPrice: 180,
    sellingPrice: 400,
    taxRate: 0,
    currency: "BND",
    standardDuration: 300,
    labourHours: 5,
    techniciansRequired: 2,
    skillLevel: "senior",
    technicianGrade: "Grade A",
    department: "Maintenance",
  },
  {
    id: "svc-006",
    serviceCode: "SVC-GEN-001",
    name: "Emergency Call-Out Service",
    shortName: "Emergency Call-Out",
    description: "24/7 emergency breakdown call-out service. Includes initial diagnosis and first-hour labour. Additional charges apply for parts and extended labour.",
    unitOfMeasure: "per visit",
    pricingModel: "fixed",
    costPrice: 80,
    sellingPrice: 200,
    taxRate: 0,
    currency: "BND",
    standardDuration: 60,
    labourHours: 1,
    techniciansRequired: 1,
    skillLevel: "intermediate",
    technicianGrade: "Grade B",
    department: "Maintenance",
    overtimeEligible: true,
    weekendRate: 280,
    holidayRate: 350,
  },
];

// ──────────────────────────────────────────────
// 9. SUPPLIERS (via ItemSupplier, 5 entries)
// ──────────────────────────────────────────────
const itemSuppliers = [
  {
    id: "isup-001",
    itemId: "item-001",
    supplierName: "Brunei Electrical Supply Co.",
    supplierCode: "BES",
    contactPerson: "Awang Haji Kamal",
    phone: "+6732223456",
    email: "sales@bruneielectrical.com.bn",
    address: "Unit 3, Ground Floor, Gadong Central, BSB",
    leadTimeDays: 7,
    purchasePrice: 28.5,
    moq: 5,
    isPrimary: true,
  },
  {
    id: "isup-002",
    itemId: "item-005",
    supplierName: "CoolAir Brunei Sdn Bhd",
    supplierCode: "CAB",
    contactPerson: "Mr. David Tan",
    phone: "+6732445678",
    email: "orders@coolairbrunei.com.bn",
    address: "Lot 12, Kiulap Commercial Area, BSB",
    leadTimeDays: 14,
    purchasePrice: 120,
    moq: 2,
    isPrimary: true,
  },
  {
    id: "isup-003",
    itemId: "item-010",
    supplierName: "BHardware Supply House",
    supplierCode: "BHS",
    contactPerson: "Mr. Lim Ah Hock",
    phone: "+6732337890",
    email: "info@bhardware.com.bn",
    address: "Unit 5, Serusop Industrial Estate, Berakas",
    leadTimeDays: 5,
    purchasePrice: 45,
    moq: 1,
    isPrimary: true,
  },
  {
    id: "isup-004",
    itemId: "item-007",
    supplierName: "SafetyFirst Brunei",
    supplierCode: "SFB",
    contactPerson: "Ms. Nurul Ain",
    phone: "+6732556789",
    email: "sales@safetyfirstbrunei.com",
    address: "Block C, Jalan Tutong, Tutong",
    leadTimeDays: 3,
    purchasePrice: 12,
    moq: 10,
    isPrimary: true,
  },
  {
    id: "isup-005",
    itemId: "item-006",
    supplierName: "Daikin Southeast Asia (Brunei)",
    supplierCode: "DSA",
    contactPerson: "Mr. Takeshi Yamamoto",
    phone: "+6732234567",
    email: "parts.brunei@daikin-sea.com",
    address: "DA Building, Jalan Menteri Besar, BSB",
    leadTimeDays: 21,
    purchasePrice: 380,
    moq: 1,
    isPrimary: true,
  },
];

// ──────────────────────────────────────────────
// 10. VEHICLES (3 entries)
// ──────────────────────────────────────────────
const vehicles = [
  {
    id: "veh-001",
    plateNumber: "BA 1234",
    make: "Toyota",
    model: "Hilux",
    year: 2023,
    vin: "MHFHY1ATXN001234",
    fuelType: "diesel",
    status: "active",
    currentMileage: 34500,
    nextServiceDate: daysFromNow(30),
  },
  {
    id: "veh-002",
    plateNumber: "KB 5678",
    make: "Mitsubishi",
    model: "Triton",
    year: 2022,
    vin: "MMAXF3ATXN005678",
    fuelType: "diesel",
    status: "active",
    currentMileage: 52800,
    nextServiceDate: daysFromNow(10),
  },
  {
    id: "veh-003",
    plateNumber: "BS 9012",
    make: "Toyota",
    model: "HiAce",
    year: 2021,
    vin: "MR0HE3CSZN009012",
    fuelType: "diesel",
    status: "active",
    currentMileage: 78200,
    nextServiceDate: daysAgo(5),
  },
];

// ══════════════════════════════════════════════
// MAIN SEED FUNCTION
// ══════════════════════════════════════════════
async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   FacilityPro Comprehensive Seed Data Generator   ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const counts = { customers: 0, equipment: 0, complaints: 0, workOrders: 0, pmSchedules: 0, invoices: 0, inventoryItems: 0, serviceItems: 0, suppliers: 0, vehicles: 0 };

  // ── 1. Customers ──
  console.log("📦 Seeding Customers...");
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: { updatedAt: NOW },
      create: {
        ...c,
        tenantId: TENANT_ID,
        country: "Brunei",
        taxRate: 0,
        isActive: true,
        isWhatsappVerified: false,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.customers++;
  }
  console.log(`   ✅ ${counts.customers} customers created`);

  // ── 2. Equipment ──
  console.log("🔧 Seeding Equipment...");
  for (const e of equipment) {
    await prisma.equipment.upsert({
      where: { id: e.id },
      update: { updatedAt: NOW },
      create: {
        ...e,
        tenantId: TENANT_ID,
        scanCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.equipment++;
  }
  console.log(`   ✅ ${counts.equipment} equipment records created`);

  // ── 3. Complaints ──
  console.log("📋 Seeding Complaints...");
  for (const c of complaints) {
    await prisma.complaint.upsert({
      where: { id: c.id },
      update: { updatedAt: NOW },
      create: {
        ...c,
        tenantId: TENANT_ID,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.complaints++;
  }
  console.log(`   ✅ ${counts.complaints} complaints created`);

  // ── 4. Work Orders ──
  console.log("📝 Seeding Work Orders...");
  for (const w of workOrders) {
    await prisma.workOrder.upsert({
      where: { id: w.id },
      update: { updatedAt: NOW },
      create: {
        ...w,
        tenantId: TENANT_ID,
        isLocked: w.status === "completed",
        isDraft: w.status === "DRAFT",
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.workOrders++;
  }
  console.log(`   ✅ ${counts.workOrders} work orders created`);

  // ── 5. PM Schedules ──
  console.log("📅 Seeding PM Schedules...");
  for (const pm of pmSchedules) {
    await prisma.pmSchedule.upsert({
      where: { id: pm.id },
      update: { updatedAt: NOW },
      create: {
        ...pm,
        tenantId: TENANT_ID,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.pmSchedules++;
  }
  console.log(`   ✅ ${counts.pmSchedules} PM schedules created`);

  // ── 6. Invoices ──
  console.log("💰 Seeding Invoices...");
  for (const inv of invoices) {
    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: { updatedAt: NOW },
      create: {
        ...inv,
        tenantId: TENANT_ID,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.invoices++;
  }
  console.log(`   ✅ ${counts.invoices} invoices created`);

  // ── 7. Inventory Items ──
  console.log("📦 Seeding Inventory Items...");
  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { id: item.id },
      update: { updatedAt: NOW },
      create: {
        ...item,
        tenantId: TENANT_ID,
        currency: "BND",
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.inventoryItems++;
  }
  console.log(`   ✅ ${counts.inventoryItems} inventory items created`);

  // ── 8. Service Items ──
  console.log("🛠️  Seeding Service Items...");
  for (const svc of serviceItems) {
    await prisma.serviceItem.upsert({
      where: { id: svc.id },
      update: { updatedAt: NOW },
      create: {
        ...svc,
        tenantId: TENANT_ID,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.serviceItems++;
  }
  console.log(`   ✅ ${counts.serviceItems} service items created`);

  // ── 9. Item Suppliers ──
  console.log("🏭 Seeding Suppliers (ItemSupplier)...");
  for (const sup of itemSuppliers) {
    await prisma.itemSupplier.upsert({
      where: { id: sup.id },
      update: { updatedAt: NOW },
      create: {
        ...sup,
        tenantId: TENANT_ID,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.suppliers++;
  }
  console.log(`   ✅ ${counts.suppliers} supplier records created`);

  // ── 10. Vehicles ──
  console.log("🚗 Seeding Vehicles...");
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      update: { updatedAt: NOW },
      create: {
        ...v,
        tenantId: TENANT_ID,
        createdAt: NOW,
        updatedAt: NOW,
      },
    });
    counts.vehicles++;
  }
  console.log(`   ✅ ${counts.vehicles} vehicles created`);

  // ── Link complaints to work orders ──
  console.log("\n🔗 Linking complaints to work orders...");
  for (const w of workOrders) {
    if (w.complaintId) {
      await prisma.complaint.update({
        where: { id: w.complaintId },
        data: { workOrderId: w.id },
      });
    }
  }
  console.log("   ✅ Complaint-WorkOrder links updated");

  // ══════════════════════════════════════════════
  // SUMMARY
  // ══════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║              SEED COMPLETE - SUMMARY             ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Customers:          ${String(counts.customers).padEnd(28)}║`);
  console.log(`║  Equipment:          ${String(counts.equipment).padEnd(28)}║`);
  console.log(`║  Complaints:         ${String(counts.complaints).padEnd(28)}║`);
  console.log(`║  Work Orders:        ${String(counts.workOrders).padEnd(28)}║`);
  console.log(`║  PM Schedules:       ${String(counts.pmSchedules).padEnd(28)}║`);
  console.log(`║  Invoices:           ${String(counts.invoices).padEnd(28)}║`);
  console.log(`║  Inventory Items:    ${String(counts.inventoryItems).padEnd(28)}║`);
  console.log(`║  Service Items:      ${String(counts.serviceItems).padEnd(28)}║`);
  console.log(`║  Suppliers:          ${String(counts.suppliers).padEnd(28)}║`);
  console.log(`║  Vehicles:           ${String(counts.vehicles).padEnd(28)}║`);
  console.log("╠══════════════════════════════════════════════════╣");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`║  TOTAL RECORDS:      ${String(total).padEnd(28)}║`);
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Data relationship summary
  console.log("📊 Data Relationships:");
  console.log("   Complaints → Work Orders:  6 linked");
  console.log("   Work Orders → Invoices:    5 linked");
  console.log("   Equipment → Customers:     12 linked to 7 customers");
  console.log("   PM Schedules → Equipment:  4 linked");
  console.log("   Inventory Items → Categories: 12 across 8 categories");
  console.log("   ItemSuppliers → Items:     5 supplier records");
  console.log("\n✅ All seed data created successfully!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });