import { NextResponse } from 'next/server';
import { db } from '@/core/database/db';
export const dynamic = 'force-dynamic';

const PLACEHOLDER_IMG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export async function POST() {
  try {
    // Clean existing data
    await db.irmActivity.deleteMany();
    await db.irmApproval.deleteMany();
    await db.irmRevision.deleteMany();
    await db.irmPhoto.deleteMany();
    await db.irmReport.deleteMany();
    await db.irmProject.deleteMany();
    await db.irmUser.deleteMany();

    // 1. Seed Users
    const users = await db.irmUser.createMany({
      data: [
        { email: 'superadmin@irms.local', name: 'Haji Ahmad', role: 'Super Admin', phone: '+673-888-0001', active: true },
        { email: 'admin@irms.local', name: 'Dayang Siti', role: 'Admin', phone: '+673-888-0002', active: true },
        { email: 'pm@irms.local', name: 'Awang Haji Mohammad', role: 'Project Manager', phone: '+673-888-0003', active: true },
        { email: 'engineer@irms.local', name: 'Md Harris bin Omar', role: 'Site Engineer', phone: '+673-888-0004', active: true },
        { email: 'inspector@irms.local', name: 'Awang Nordin', role: 'Inspector', phone: '+673-888-0005', active: true },
        { email: 'supervisor@irms.local', name: 'Haji Bakar', role: 'Supervisor', phone: '+673-888-0006', active: true },
        { email: 'technician@irms.local', name: 'Md Yusof', role: 'Technician', phone: '+673-888-0007', active: true },
      ],
    });
    const allUsers = await db.irmUser.findMany({ orderBy: { id: 'asc' } });

    // 2. Seed Projects
    const projects = await db.irmProject.createMany({
      data: [
        {
          name: 'Kiarong Flats Maintenance',
          number: 'PRJ-2024-001',
          contractNumber: 'CT-2024-101',
          tenderNumber: 'TN-2024-001',
          customer: 'Ministry of Development',
          location: 'Kiarong, Brunei-Muara',
          gpsLat: 4.9023,
          gpsLng: 114.9398,
          value: 1500000,
          startDate: new Date('2024-01-15'),
          completionDate: new Date('2025-06-30'),
          status: 'active',
          consultant: 'Halcrow Group',
          contractor: 'GHK Builders Sdn Bhd',
          supervisor: 'Awang Hj Bakar',
          description: 'Comprehensive maintenance of 120 residential units including plumbing, electrical, and structural repairs.',
        },
        {
          name: 'Gadong Office Tower MEP',
          number: 'PRJ-2024-002',
          contractNumber: 'CT-2024-102',
          tenderNumber: 'TN-2024-002',
          customer: 'Brunei Investment Agency',
          location: 'Gadong, Brunei-Muara',
          gpsLat: 4.8833,
          gpsLng: 114.9280,
          value: 3200000,
          startDate: new Date('2024-03-01'),
          completionDate: new Date('2025-12-31'),
          status: 'active',
          consultant: 'Arup Associates',
          contractor: 'CEM Builders Sdn Bhd',
          description: 'Mechanical, Electrical, and Plumbing upgrade for a 12-storey commercial tower.',
        },
        {
          name: 'RIPAS Hospital HVAC Upgrade',
          number: 'PRJ-2024-003',
          contractNumber: 'CT-2024-103',
          tenderNumber: 'TN-2024-003',
          customer: 'Ministry of Health',
          location: 'Bandar Seri Begawan',
          gpsLat: 4.8903,
          gpsLng: 114.9422,
          value: 5800000,
          startDate: new Date('2024-02-15'),
          completionDate: new Date('2025-09-30'),
          status: 'active',
          consultant: 'WSP Group',
          contractor: 'M&E Solutions Sdn Bhd',
          description: 'Complete HVAC system replacement and upgrade for the main hospital block including ICU and operating theatres.',
        },
      ],
    });
    const allProjects = await db.irmProject.findMany({ orderBy: { id: 'asc' } });

    // 3. Seed Reports
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 86400000);
    const reportsData = [
      {
        number: 'IR-2024-0001',
        projectId: allProjects[0].id,
        inspectorId: allUsers[4].id,
        inspectionDate: yesterday,
        department: 'Maintenance',
        site: 'Block A',
        building: 'Kiarong Flats Block A',
        floor: '3rd Floor',
        room: 'A-301',
        equipment: 'AHU-01',
        assetId: 'AST-KF-0001',
        workCategory: 'HVAC',
        inspectionType: 'Routine',
        priority: 'high',
        status: 'draft',
        taskDescription: 'Inspect and replace faulty AHU fan motor in Block A 3rd floor.',
        workScope: 'Fan motor replacement and belt alignment check',
        inspectionNotes: 'Fan motor showing excessive vibration. Bearings worn out. Recommend immediate replacement.',
        correctiveActions: 'Replace motor bearings and fan belt. Realign motor to fan assembly.',
        recommendation: 'Schedule quarterly vibration analysis for all AHU units.',
        observation: 'Unit has been running 24/7 for 5 years without major servicing.',
        safetyNotes: 'Ensure LOTO procedure followed before commencing work.',
        rootCause: 'Normal wear and tear due to continuous operation. Lack of preventive maintenance.',
        materialsUsed: 'Motor bearings (2x), Fan belt (1x), Lubricant (500ml)',
        labourHours: 4.5,
        completionPct: 30,
      },
      {
        number: 'IR-2024-0002',
        projectId: allProjects[0].id,
        inspectorId: allUsers[4].id,
        inspectionDate: twoDaysAgo,
        department: 'Electrical',
        site: 'Block B',
        building: 'Kiarong Flats Block B',
        floor: 'Ground Floor',
        room: 'Electrical Room',
        equipment: 'MDB-02',
        workCategory: 'Electrical',
        inspectionType: 'Corrective',
        priority: 'critical',
        status: 'submitted',
        taskDescription: 'Emergency inspection of main distribution board tripping issue.',
        workScope: 'MDB inspection, cable testing, breaker replacement',
        inspectionNotes: 'MCB for Block B ground floor circuits showing signs of overheating. Thermal imaging revealed hotspot at 78°C.',
        correctiveActions: 'Replace 63A MCB with 80A rated breaker. Upgrade main busbar connections.',
        recommendation: 'Install power monitoring system for critical distribution boards.',
        observation: 'Load has increased by 40% since original installation due to additional air conditioning units.',
        safetyNotes: 'De-energize entire Block B ground floor before work. Provide temporary power via generator.',
        rootCause: 'Undersized breaker for increased load. Thermal cycling caused contact degradation.',
        materialsUsed: '80A MCB (1x), Busbar connectors (4x), Thermal paste (1 tube)',
        labourHours: 6,
        completionPct: 75,
      },
      {
        number: 'IR-2024-0003',
        projectId: allProjects[1].id,
        inspectorId: allUsers[4].id,
        assessedById: allUsers[3].id,
        inspectionDate: today,
        department: 'MEP',
        site: 'Gadong Tower',
        building: 'Office Tower Main',
        floor: '8th Floor',
        room: 'Server Room',
        equipment: 'Precision AC Unit',
        workCategory: 'HVAC',
        inspectionType: 'Routine',
        priority: 'medium',
        status: 'manager_approval',
        taskDescription: 'Quarterly inspection of precision air conditioning for server room.',
        workScope: 'Filter replacement, refrigerant check, condensate drain inspection',
        inspectionNotes: 'Air filters severely clogged. Supply air temperature 4°C above setpoint. Condensate drain partially blocked.',
        correctiveActions: 'Replace all 4 air filters. Clean condensate drain line. Check refrigerant charge.',
        recommendation: 'Increase filter replacement frequency from quarterly to monthly for server room units.',
        observation: 'Server room temperature has been fluctuating between 22-26°C instead of required 20-22°C.',
        safetyNotes: 'Coordinate with IT department for server room access. Ensure UPS backup during maintenance.',
        rootCause: 'Delayed filter replacement schedule. Dust from nearby construction site.',
        materialsUsed: 'HEPA filters (4x), Coil cleaner (2L), Condensate treatment tablets (10x)',
        labourHours: 3,
        completionPct: 60,
        assessedDate: today,
      },
      {
        number: 'IR-2024-0004',
        projectId: allProjects[2].id,
        inspectorId: allUsers[4].id,
        assessedById: allUsers[3].id,
        inspectionDate: new Date(today.getTime() - 3 * 86400000),
        department: 'HVAC',
        site: 'RIPAS Hospital',
        building: 'Main Block',
        floor: '2nd Floor',
        room: 'Operating Theatre 2',
        equipment: 'Chilled Water AHU-OT2',
        workCategory: 'HVAC',
        inspectionType: 'Compliance',
        priority: 'critical',
        status: 'approved',
        taskDescription: 'Annual compliance inspection of OT HVAC system per hospital standards.',
        workScope: 'Full system inspection, filter integrity test, airflow measurement, pressure differential check',
        inspectionNotes: 'All parameters within acceptable limits. HEPA filter efficiency at 99.97%. Room pressure differential maintained at +15 Pa.',
        correctiveActions: 'No corrective actions required. Pre-filter showing 60% loading - schedule replacement within 2 weeks.',
        recommendation: 'Continue quarterly monitoring schedule. Consider upgrading BMS integration for real-time pressure monitoring.',
        observation: 'System performing well. Regular maintenance program is effective.',
        safetyNotes: 'Strict contamination control protocols must be followed. All personnel to wear cleanroom PPE.',
        rootCause: 'N/A - Routine compliance inspection with satisfactory results.',
        materialsUsed: 'N/A',
        labourHours: 5,
        completionPct: 100,
        assessedDate: twoDaysAgo,
        workOrderNumber: 'WO-2024-0089',
      },
    ];

    const reports = [];
    for (const r of reportsData) {
      const report = await db.irmReport.create({ data: r });
      reports.push(report);
    }

    // 4. Seed Photos
    const photosData: { reportId: string; type: string; data: string; thumbnail: string; originalImage: string; caption: string; photoNumber: string; room: string; building: string; sortOrder: number; }[] = [];
    const photoConfigs = [
      { reportIdx: 0, type: 'before', caption: 'Faulty AHU fan motor before repair', photoNumber: 'B001', room: 'A-301', building: 'Kiarong Flats Block A' },
      { reportIdx: 0, type: 'progress', caption: 'Motor disassembly in progress', photoNumber: 'P001', room: 'A-301', building: 'Kiarong Flats Block A' },
      { reportIdx: 1, type: 'before', caption: 'Overheated MCB thermal image', photoNumber: 'B001', room: 'Electrical Room', building: 'Kiarong Flats Block B' },
      { reportIdx: 1, type: 'defect', caption: 'Burnt contact points on MCB', photoNumber: 'D001', room: 'Electrical Room', building: 'Kiarong Flats Block B' },
      { reportIdx: 2, type: 'before', caption: 'Clogged air filters in server room AC', photoNumber: 'B001', room: 'Server Room', building: 'Office Tower Main' },
      { reportIdx: 2, type: 'after', caption: 'New HEPA filters installed', photoNumber: 'A001', room: 'Server Room', building: 'Office Tower Main' },
      { reportIdx: 3, type: 'before', caption: 'OT HVAC system overview', photoNumber: 'B001', room: 'Operating Theatre 2', building: 'Main Block' },
      { reportIdx: 3, type: 'after', caption: 'HEPA filter integrity test results', photoNumber: 'A001', room: 'Operating Theatre 2', building: 'Main Block' },
      { reportIdx: 3, type: 'completion', caption: 'Final system compliance certificate', photoNumber: 'C001', room: 'Operating Theatre 2', building: 'Main Block' },
    ];

    for (const pc of photoConfigs) {
      photosData.push({
        reportId: reports[pc.reportIdx].id,
        type: pc.type,
        data: PLACEHOLDER_IMG,
        thumbnail: PLACEHOLDER_IMG,
        originalImage: PLACEHOLDER_IMG,
        caption: pc.caption,
        photoNumber: pc.photoNumber,
        room: pc.room,
        building: pc.building,
        sortOrder: photosData.length,
      });
    }

    const photos = await db.irmPhoto.createMany({ data: photosData });

    // 5. Seed Revisions
    const revisions = await db.irmRevision.createMany({
      data: [
        {
          reportId: reports[2].id,
          version: 1,
          snapshot: JSON.stringify({ status: 'draft', inspectionNotes: reports[2].inspectionNotes, correctiveActions: 'Initial draft' }),
          note: 'Initial draft created',
          userId: allUsers[4].id,
        },
        {
          reportId: reports[2].id,
          version: 2,
          snapshot: JSON.stringify({ status: 'submitted', inspectionNotes: reports[2].inspectionNotes, correctiveActions: reports[2].correctiveActions }),
          note: 'Updated corrective actions and submitted for review',
          userId: allUsers[4].id,
        },
        {
          reportId: reports[3].id,
          version: 1,
          snapshot: JSON.stringify({ status: 'draft' }),
          note: 'Initial draft',
          userId: allUsers[4].id,
        },
      ],
    });

    // 6. Seed Approvals
    const approvals = await db.irmApproval.createMany({
      data: [
        {
          reportId: reports[2].id,
          step: 'supervisor_review',
          status: 'approved',
          userId: allUsers[5].id,
          comment: 'Reviewed and approved. Work completed satisfactorily.',
        },
        {
          reportId: reports[2].id,
          step: 'manager_approval',
          status: 'pending',
          userId: allUsers[2].id,
        },
        {
          reportId: reports[3].id,
          step: 'supervisor_review',
          status: 'approved',
          userId: allUsers[5].id,
          comment: 'Compliance inspection verified. All parameters acceptable.',
        },
        {
          reportId: reports[3].id,
          step: 'manager_approval',
          status: 'approved',
          userId: allUsers[2].id,
          comment: 'Approved. Good work on maintaining hospital HVAC standards.',
        },
      ],
    });

    // 7. Seed Activities
    const activities = await db.irmActivity.createMany({
      data: [
        { type: 'report_created', description: 'Created inspection report IR-2024-0001', userId: allUsers[4].id, reportId: reports[0].id, projectId: allProjects[0].id },
        { type: 'report_created', description: 'Created inspection report IR-2024-0002', userId: allUsers[4].id, reportId: reports[1].id, projectId: allProjects[0].id },
        { type: 'report_submitted', description: 'Submitted IR-2024-0002 for review', userId: allUsers[4].id, reportId: reports[1].id, projectId: allProjects[0].id },
        { type: 'report_created', description: 'Created inspection report IR-2024-0003', userId: allUsers[4].id, reportId: reports[2].id, projectId: allProjects[1].id },
        { type: 'report_submitted', description: 'Submitted IR-2024-0003 for review', userId: allUsers[4].id, reportId: reports[2].id, projectId: allProjects[1].id },
        { type: 'approval_approved', description: 'Supervisor approved IR-2024-0003', userId: allUsers[5].id, reportId: reports[2].id, projectId: allProjects[1].id },
        { type: 'report_created', description: 'Created inspection report IR-2024-0004', userId: allUsers[4].id, reportId: reports[3].id, projectId: allProjects[2].id },
        { type: 'report_approved', description: 'Report IR-2024-0004 fully approved', userId: allUsers[2].id, reportId: reports[3].id, projectId: allProjects[2].id },
      ],
    });

    return NextResponse.json({
      seeded: true,
      counts: {
        users: users.count,
        projects: projects.count,
        reports: reports.length,
        photos: photos.count,
        revisions: revisions.count,
        approvals: approvals.count,
        activities: activities.count,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Seed failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}