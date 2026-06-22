import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateAssetNumber, generateInvoiceNumber, generatePONumber, generateCustomerNumber } from '@/lib/auth';

export async function POST() {
  try {
    // Check if seed data already exists
    const existingTenant = await db.tenant.findFirst({ where: { domain: 'demo.facilitypro.com' } });
    if (existingTenant) {
      // Delete old invoices and quotations, then recreate them
      await db.invoice.deleteMany({ where: { tenantId: existingTenant.id } });
      await db.quotation.deleteMany({ where: { tenantId: existingTenant.id } });
      // Re-fetch relations needed for invoice creation
      const customers = await db.customer.findMany({ where: { tenantId: existingTenant.id } });
      const users = await db.user.findMany({ where: { tenantId: existingTenant.id } });
      const workOrders = await db.workOrder.findMany({ where: { tenantId: existingTenant.id, status: 'COMPLETED' } });

      if (customers.length === 0 || users.length === 0 || workOrders.length === 0) {
        return NextResponse.json({ message: 'Seed data already exists but missing dependencies', tenantId: existingTenant.id });
      }

      // Create invoices with new format
      const invoiceStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'PAID', 'PAID', 'OVERDUE'] as const;
      const invoiceItems = [
        [
          { title: 'Split AC Installation', description: 'Installation of 1 unit split AC including mounting, copper pipe, drain pipe, brackets, testing and commissioning.', unit: 'Nos', quantity: 2, rate: 250, amount: 500 },
          { title: 'Copper Pipe (1/4 + 3/8)', description: 'Insulated copper pipe with accessories.', unit: 'Meter', quantity: 10, rate: 12, amount: 120 },
          { title: 'Gas Top Up (R410A)', description: 'R410A refrigerant gas top up and pressure test.', unit: 'Kg', quantity: 2, rate: 45, amount: 90 },
        ],
        [
          { title: 'Electrical Panel Maintenance', description: 'Full inspection and maintenance of main distribution panel including tightening connections and thermal imaging.', unit: 'Nos', quantity: 1, rate: 350, amount: 350 },
          { title: 'Circuit Breaker Replacement', description: 'Replacement of 32A MCB with new Hager branded breaker.', unit: 'Nos', quantity: 4, rate: 85, amount: 340 },
        ],
        [
          { title: 'Plumbing Repair Works', description: 'Repair of leaking pipes and replacement of worn-out fittings in washroom area.', unit: 'Lot', quantity: 1, rate: 450, amount: 450 },
          { title: 'Water Pump Service', description: 'Full service of centrifugal water pump including impeller check and seal replacement.', unit: 'Nos', quantity: 2, rate: 180, amount: 360 },
        ],
      ];
      const defaultTerms = [
        '50% advance payment and balance upon completion.',
        'Price validity: 60 days from the invoice date.',
        'Delivery period: 3 working days.',
        'Additional works are subject to variation order.',
        'Warranty applies only to workmanship.',
        'Material warranty follows manufacturer terms.',
        'Payment by bank transfer or cheque.',
      ];
      await Promise.all(
        workOrders.slice(0, 6).map((wo, i) => {
          const status = invoiceStatuses[i % 6];
          const custIdx = i % customers.length;
          const items = invoiceItems[i % 3];
          const subtotal = items.reduce((s: number, item: { amount: number }) => s + item.amount, 0);
          return db.invoice.create({
            data: {
              tenantId: existingTenant.id,
              customerId: customers[custIdx].id,
              workOrderId: wo.id,
              invoiceNumber: generateInvoiceNumber(),
              title: `Invoice for ${wo.title}`,
              items: JSON.stringify(items),
              subtotal,
              taxRate: 0, tax: 0, discount: 0, shipping: 0,
              total: subtotal,
              status,
              currency: 'BND',
              paymentTerms: '30 Days',
              referenceNo: `QTN/SMSB/01/${4529 + i}`,
              poReference: i === 0 ? 'PO-2026-0001' : null,
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
              paidAt: status === 'PAID' ? new Date().toISOString() : null,
              paymentMethod: status === 'PAID' ? 'Bank Transfer' : null,
              transactionId: status === 'PAID' ? `TRX2026062001${i + 1}` : null,
              bankName: 'BAIDURI BANK',
              bankAccountName: 'SMART MAINTENANCE SERVICES SDN BHD',
              bankAccountNo: '00-12345-678901-2',
              notes: 'Thank you for choosing Smart Maintenance Services.',
              terms: JSON.stringify(defaultTerms),
              shipToName: customers[custIdx].companyName || customers[custIdx].name,
              shipToAddress: customers[custIdx].address || undefined,
              shipToPhone: customers[custIdx].phone,
              preparedBy: users[Math.min(5, users.length - 1)].id,
              createdBy: users[Math.min(5, users.length - 1)].id,
            },
          });
        })
      );

      // Create quotations
      const quotationItems = [
        [
          { title: 'Split AC Installation', description: 'Installation of 1 unit split AC including mounting, copper pipe, drain pipe, brackets, testing and commissioning.', unit: 'Nos', quantity: 2, rate: 250, amount: 500, category: 'HVAC', warranty: '12 months' },
          { title: 'Copper Pipe (1/4 + 3/8)', description: 'Insulated copper pipe with accessories.', unit: 'Meter', quantity: 10, rate: 12, amount: 120, category: 'HVAC' },
          { title: 'Gas Top Up (R410A)', description: 'R410A refrigerant gas top up and pressure test.', unit: 'Kg', quantity: 2, rate: 45, amount: 90, category: 'HVAC' },
        ],
        [
          { title: 'Generator Overhaul', description: 'Complete overhaul of diesel generator including oil change, filter replacement, and load testing.', unit: 'Nos', quantity: 1, rate: 1200, amount: 1200, category: 'Generator', warranty: '6 months' },
          { title: 'Fuel System Service', description: 'Cleaning and servicing of fuel delivery system, injector testing.', unit: 'Lot', quantity: 1, rate: 350, amount: 350, category: 'Generator' },
        ],
      ];
      const qtStatuses = ['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'ACCEPTED', 'CONVERTED_INVOICE'] as const;
      await Promise.all(
        customers.slice(0, 6).map((cust, i) => {
          const status = qtStatuses[i % 6];
          const items = quotationItems[i % 2];
          const subtotal = items.reduce((s: number, item: { amount: number }) => s + item.amount, 0);
          return db.quotation.create({
            data: {
              tenantId: existingTenant.id,
              customerId: cust.id,
              quotationNo: `QTN/SMSB/01/${4529 + i}`,
              title: `Quotation for ${['AC Installation', 'Generator Service', 'Electrical Works', 'Plumbing Works', 'Fire Suppression', 'Preventive Maintenance'][i]}`,
              items: JSON.stringify(items),
              terms: JSON.stringify(defaultTerms),
              currency: 'BND',
              subtotal,
              taxRate: 0, tax: 0, discount: 0, shipping: 0,
              total: subtotal,
              status,
              validUntil: new Date(Date.now() + 60 * 86400000).toISOString(),
              preparedBy: users[Math.min(5, users.length - 1)].id,
              sentAt: ['SENT', 'ACCEPTED', 'CONVERTED_INVOICE'].includes(status) ? new Date(Date.now() - 5 * 86400000).toISOString() : null,
              acceptedAt: ['ACCEPTED', 'CONVERTED_INVOICE'].includes(status) ? new Date(Date.now() - 2 * 86400000).toISOString() : null,
              approvedAt: ['APPROVED', 'SENT', 'ACCEPTED', 'CONVERTED_INVOICE'].includes(status) ? new Date(Date.now() - 7 * 86400000).toISOString() : null,
              notes: 'Thank you for choosing Smart Maintenance Services. We look forward to working with you.',
            },
          });
        })
      );

      return NextResponse.json({ message: 'Invoices and quotations reseeded', tenantId: existingTenant.id });
    }

    // Create tenant
    const tenant = await db.tenant.create({
      data: {
        name: 'FacilityPro Services',
        domain: 'demo.facilitypro.com',
        address: '123 Business Park, Suite 100',
        phone: '+1-555-0100',
        email: 'info@facilitypro.com',
        plan: 'enterprise',
        maxUsers: 200,
      },
    });

    // Create departments
    const departments = await Promise.all([
      db.department.create({ data: { tenantId: tenant.id, name: 'Operations', description: 'Field operations and maintenance' } }),
      db.department.create({ data: { tenantId: tenant.id, name: 'Finance', description: 'Financial operations' } }),
      db.department.create({ data: { tenantId: tenant.id, name: 'Management', description: 'Management and administration' } }),
      db.department.create({ data: { tenantId: tenant.id, name: 'HVAC', description: 'HVAC maintenance team' } }),
      db.department.create({ data: { tenantId: tenant.id, name: 'Electrical', description: 'Electrical maintenance team' } }),
    ]);

    // Create users
    const password = await hashPassword('password123');

    const users = await Promise.all([
      db.user.create({
        data: {
          tenantId: tenant.id, email: 'admin@facilitypro.com', passwordHash: password,
          name: 'Ahmed Al-Rashid', role: 'admin', employeeNumber: 'EMP-001',
          departmentId: departments[2].id, phone: '+1-555-0101', profileCompleted: true,
        },
      }),
      db.user.create({
        data: {
          tenantId: tenant.id, email: 'manager@facilitypro.com', passwordHash: password,
          name: 'Sarah Johnson', role: 'manager', employeeNumber: 'EMP-002',
          departmentId: departments[0].id, phone: '+1-555-0102', profileCompleted: true,
        },
      }),
      db.user.create({
        data: {
          tenantId: tenant.id, email: 'supervisor@facilitypro.com', passwordHash: password,
          name: 'Mohammed Hassan', role: 'supervisor', employeeNumber: 'EMP-003',
          departmentId: departments[0].id, phone: '+1-555-0103', profileCompleted: true,
        },
      }),
      db.user.create({
        data: {
          tenantId: tenant.id, email: 'tech1@facilitypro.com', passwordHash: password,
          name: 'Carlos Mendez', role: 'technician', employeeNumber: 'EMP-004',
          departmentId: departments[3].id, phone: '+1-555-0104', isOnline: true, profileCompleted: true,
        },
      }),
      db.user.create({
        data: {
          tenantId: tenant.id, email: 'tech2@facilitypro.com', passwordHash: password,
          name: 'David Chen', role: 'technician', employeeNumber: 'EMP-005',
          departmentId: departments[4].id, phone: '+1-555-0105', isOnline: false, profileCompleted: true,
        },
      }),
      db.user.create({
        data: {
          tenantId: tenant.id, email: 'finance@facilitypro.com', passwordHash: password,
          name: 'Lisa Park', role: 'finance', employeeNumber: 'EMP-006',
          departmentId: departments[1].id, phone: '+1-555-0106', profileCompleted: true,
        },
      }),
    ]);

    // Create customers
    const customers = await Promise.all([
      db.customer.create({
        data: {
          tenantId: tenant.id, name: 'John Smith', phone: '+1-555-0201',
          email: 'john@acmecorp.com', address: '456 Industrial Ave',
          companyName: 'ACME Corporation', customerNumber: generateCustomerNumber(),
        },
      }),
      db.customer.create({
        data: {
          tenantId: tenant.id, name: 'Maria Garcia', phone: '+1-555-0202',
          email: 'maria@greenbldg.com', address: '789 Green Street',
          companyName: 'Green Building LLC', customerNumber: generateCustomerNumber(),
        },
      }),
      db.customer.create({
        data: {
          tenantId: tenant.id, name: 'Robert Kim', phone: '+1-555-0203',
          email: 'robert@techpark.com', address: '321 Tech Park Blvd',
          companyName: 'TechPark Industries', customerNumber: generateCustomerNumber(),
        },
      }),
    ]);

    // Create equipment
    const categories = ['HVAC', 'Electrical', 'Plumbing', 'Generator', 'Mechanical', 'FireProtection'] as const;
    const equipData = [
      { name: 'Central AC Unit - Floor 1', category: 'HVAC', brand: 'Carrier', model: '30XA-252', customerId: customers[0].id },
      { name: 'Chiller System - Main', category: 'HVAC', brand: 'Trane', model: 'RTAC-200', customerId: customers[0].id },
      { name: 'Main Distribution Panel', category: 'Electrical', brand: 'ABB', model: 'MNS-3200', customerId: customers[0].id },
      { name: 'Emergency Generator', category: 'Generator', brand: 'Caterpillar', model: 'C18-600', customerId: customers[1].id },
      { name: 'Fire Alarm System', category: 'FireProtection', brand: 'Honeywell', model: 'FS-250', customerId: customers[1].id },
      { name: 'Water Pump Station', category: 'Plumbing', brand: 'Grundfos', model: 'CR-32', customerId: customers[2].id },
      { name: 'Elevator Motor', category: 'Mechanical', brand: 'Otis', model: 'Gen2-MRL', customerId: customers[2].id },
      { name: 'Split AC - Meeting Room', category: 'HVAC', brand: 'Daikin', model: 'FTKF-50', customerId: customers[1].id },
      { name: 'UPS System', category: 'Electrical', brand: 'APC', model: 'SRT-10K', customerId: customers[2].id },
      { name: 'Diesel Generator', category: 'Generator', brand: 'Cummins', model: 'QST30-G6', customerId: customers[0].id },
    ];

    const equipmentList = await Promise.all(
      equipData.map((eq) => {
        const assetNumber = generateAssetNumber(eq.category);
        return db.equipment.create({
          data: {
            tenantId: tenant.id,
            customerId: eq.customerId,
            name: eq.name,
            category: eq.category,
            assetNumber,
            qrCode: `QR-${assetNumber}`,
            brand: eq.brand,
            model: eq.model,
            location: 'Building A',
            status: 'active',
            installDate: new Date(2023, Math.floor(Math.random() * 12), 1).toISOString(),
            warrantyExpiry: new Date(2026, 0, 1).toISOString(),
            specifications: JSON.stringify({ capacity: `${Math.floor(Math.random() * 500) + 100} kW`, voltage: '380V', phase: '3-phase' }),
          },
        });
      })
    );

    // Create complaints
    const complaintStatuses = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
    const priorities = ['low', 'medium', 'high', 'critical'] as const;
    const complaintTitles = [
      'AC not cooling properly', 'Strange noise from generator', 'Water leakage in restroom',
      'Power outage in Section B', 'Fire alarm false triggers', 'Elevator stuck between floors',
      'HVAC filter replacement needed', 'Electrical panel sparking', 'Low water pressure',
      'Generator fuel leak detected', 'AC compressor failure', 'Emergency light not working',
    ];

    const complaints = await Promise.all(
      complaintTitles.map((title, i) => {
        const status = complaintStatuses[i % 5];
        const custIdx = i % 3;
        const equipIdx = i % equipmentList.length;
        return db.complaint.create({
          data: {
            tenantId: tenant.id,
            customerId: customers[custIdx].id,
            equipmentId: equipmentList[equipIdx].id,
            title,
            description: `${title}. This needs immediate attention as reported by the facility manager during routine inspection.`,
            priority: priorities[i % 4],
            status,
            category: equipmentList[equipIdx].category,
            assignedToId: status !== 'OPEN' ? users[3 + (i % 2)].id : null,
            supervisorId: status !== 'OPEN' ? users[2].id : null,
            resolvedAt: (status === 'RESOLVED' || status === 'CLOSED') ? new Date(Date.now() - 86400000 * 2).toISOString() : null,
            closedAt: status === 'CLOSED' ? new Date(Date.now() - 86400000).toISOString() : null,
            customerRating: status === 'CLOSED' ? [4, 5, 3, 4, 5][i % 5] : null,
          },
        });
      })
    );

    // Create work orders
    const woStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED'] as const;
    const workOrders = await Promise.all(
      complaints.filter(c => c.status !== 'OPEN').map((complaint, i) => {
        const status = woStatuses[i % 5];
        return db.workOrder.create({
          data: {
            tenantId: tenant.id,
            complaintId: complaint.id,
            equipmentId: complaint.equipmentId || undefined,
            title: `WO for: ${complaint.title}`,
            description: `Work order generated for complaint #${complaint.id.slice(-6)}`,
            status,
            priority: complaint.priority,
            type: 'corrective',
            assignedToId: complaint.assignedToId || undefined,
            createdBy: users[2].id,
            scheduledDate: new Date(Date.now() - 86400000 * 3).toISOString(),
            startedAt: status !== 'PENDING' ? new Date(Date.now() - 86400000 * 2).toISOString() : null,
            completedAt: status === 'COMPLETED' ? new Date(Date.now() - 86400000).toISOString() : null,
            laborHours: status === 'COMPLETED' ? [2, 4, 3, 5, 1.5][i % 5] : null,
            laborCost: status === 'COMPLETED' ? [150, 300, 225, 375, 112.5][i % 5] : null,
            materialCost: status === 'COMPLETED' ? [200, 450, 100, 320, 50][i % 5] : null,
            totalCost: status === 'COMPLETED' ? [350, 750, 325, 695, 162.5][i % 5] : null,
          },
        });
      })
    );

    // Create invoices
    const invoiceStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'PAID', 'PAID', 'OVERDUE'] as const;
    const invoiceItems = [
      [
        { title: 'Split AC Installation', description: 'Installation of 1 unit split AC including mounting, copper pipe, drain pipe, brackets, testing and commissioning.', unit: 'Nos', quantity: 2, rate: 250, amount: 500 },
        { title: 'Copper Pipe (1/4 + 3/8)', description: 'Insulated copper pipe with accessories.', unit: 'Meter', quantity: 10, rate: 12, amount: 120 },
        { title: 'Gas Top Up (R410A)', description: 'R410A refrigerant gas top up and pressure test.', unit: 'Kg', quantity: 2, rate: 45, amount: 90 },
      ],
      [
        { title: 'Electrical Panel Maintenance', description: 'Full inspection and maintenance of main distribution panel including tightening connections and thermal imaging.', unit: 'Nos', quantity: 1, rate: 350, amount: 350 },
        { title: 'Circuit Breaker Replacement', description: 'Replacement of 32A MCB with new Hager branded breaker.', unit: 'Nos', quantity: 4, rate: 85, amount: 340 },
      ],
      [
        { title: 'Plumbing Repair Works', description: 'Repair of leaking pipes and replacement of worn-out fittings in washroom area.', unit: 'Lot', quantity: 1, rate: 450, amount: 450 },
        { title: 'Water Pump Service', description: 'Full service of centrifugal water pump including impeller check and seal replacement.', unit: 'Nos', quantity: 2, rate: 180, amount: 360 },
      ],
    ];
    await Promise.all(
      workOrders.filter(wo => wo.status === 'COMPLETED').map((wo, i) => {
        const status = invoiceStatuses[i % 6];
        const custIdx = i % 3;
        const items = invoiceItems[i % 3];
        const subtotal = items.reduce((s, item) => s + item.amount, 0);
        const taxRate = 0;
        const tax = 0;
        const discount = 0;
        const shipping = 0;
        const total = subtotal;
        return db.invoice.create({
          data: {
            tenantId: tenant.id,
            customerId: customers[custIdx].id,
            workOrderId: wo.id,
            invoiceNumber: generateInvoiceNumber(),
            title: `Invoice for ${wo.title}`,
            items: JSON.stringify(items),
            subtotal,
            taxRate,
            tax,
            discount,
            shipping,
            total,
            status,
            currency: 'BND',
            paymentTerms: '30 Days',
            referenceNo: `QTN/SMSB/01/${4500 + i}`,
            poReference: i === 0 ? 'PO-2026-0001' : null,
            dueDate: new Date(Date.now() + 30 * 86400000).toISOString(),
            paidAt: status === 'PAID' ? new Date().toISOString() : null,
            paymentMethod: status === 'PAID' ? 'Bank Transfer' : null,
            transactionId: status === 'PAID' ? `TRX2026062001${i + 1}` : null,
            bankName: 'BAIDURI BANK',
            bankAccountName: 'SMART MAINTENANCE SERVICES SDN BHD',
            bankAccountNo: '00-12345-678901-2',
            notes: i === 0 ? 'Thank you for choosing Smart Maintenance Services.' : null,
            terms: JSON.stringify([
              '50% advance payment and balance upon completion.',
              'Price validity: 60 days from the invoice date.',
              'Delivery period: 3 working days.',
              'Additional works are subject to variation order.',
              'Warranty applies only to workmanship.',
              'Material warranty follows manufacturer terms.',
              'Payment by bank transfer or cheque.',
            ]),
            shipToName: customers[custIdx].companyName || customers[custIdx].name,
            shipToAddress: customers[custIdx].address,
            shipToPhone: customers[custIdx].phone,
            preparedBy: users[5].id,
            createdBy: users[5].id,
          },
        });
      })
    );

    // Create PM schedules
    const freqs = ['monthly', 'quarterly', 'half_yearly', 'yearly'] as const;
    await Promise.all(
      equipmentList.slice(0, 6).map((eq, i) =>
        db.pmSchedule.create({
          data: {
            tenantId: tenant.id,
            equipmentId: eq.id,
            title: `PM - ${eq.name}`,
            description: `Regular ${freqs[i % 4]} maintenance for ${eq.name}`,
            frequency: freqs[i % 4],
            lastExecuted: new Date(Date.now() - 15 * 86400000).toISOString(),
            nextDueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
            assignedToId: users[3 + (i % 2)].id,
            status: 'active',
          },
        })
      )
    );

    // Create inventory items
    const invData = [
      { name: 'AC Filter 20x20', category: 'HVAC', unit: 'pcs', qty: 45, min: 10, cost: 25 },
      { name: 'Copper Wire 2.5mm', category: 'Electrical', unit: 'meter', qty: 200, min: 50, cost: 3.5 },
      { name: 'PVC Pipe 1"', category: 'Plumbing', unit: 'meter', qty: 80, min: 20, cost: 8 },
      { name: 'Diesel Fuel Filter', category: 'Generator', unit: 'pcs', qty: 12, min: 5, cost: 45 },
      { name: 'Bearing 6205', category: 'Mechanical', unit: 'pcs', qty: 30, min: 10, cost: 15 },
      { name: 'Fire Extinguisher CO2', category: 'FireProtection', unit: 'pcs', qty: 8, min: 5, cost: 120 },
      { name: 'Refrigerant R-410A', category: 'HVAC', unit: 'kg', qty: 3, min: 5, cost: 85 },
      { name: 'Circuit Breaker 32A', category: 'Electrical', unit: 'pcs', qty: 15, min: 8, cost: 35 },
      { name: 'Ball Valve 1/2"', category: 'Plumbing', unit: 'pcs', qty: 25, min: 10, cost: 12 },
      { name: 'Engine Oil 15W-40', category: 'Generator', unit: 'liter', qty: 20, min: 10, cost: 22 },
    ];

    await Promise.all(
      invData.map((item) =>
        db.inventoryItem.create({
          data: {
            tenantId: tenant.id,
            name: item.name,
            category: item.category,
            unit: item.unit,
            quantity: item.qty,
            minStock: item.min,
            unitCost: item.cost,
            supplier: 'Global Parts Supply Co.',
            location: 'Main Warehouse',
          },
        })
      )
    );

    // Create vehicles
    await Promise.all([
      db.vehicle.create({
        data: {
          tenantId: tenant.id, plateNumber: 'SV-1234', make: 'Toyota', model: 'Hilux',
          year: 2023, fuelType: 'diesel', status: 'active', currentMileage: 25000,
          nextServiceDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
      }),
      db.vehicle.create({
        data: {
          tenantId: tenant.id, plateNumber: 'SV-5678', make: 'Ford', model: 'Transit',
          year: 2022, fuelType: 'diesel', status: 'active', currentMileage: 45000,
          nextServiceDate: new Date(Date.now() + 15 * 86400000).toISOString(),
        },
      }),
    ]);

    // Create checklist templates
    await Promise.all([
      db.checklistTemplate.create({
        data: {
          tenantId: tenant.id, name: 'HVAC Routine Maintenance', category: 'HVAC', isDefault: true,
          items: JSON.stringify([
            { label: 'Check air filter condition', required: true },
            { label: 'Inspect condenser coil', required: true },
            { label: 'Check refrigerant level', required: true },
            { label: 'Test thermostat operation', required: true },
            { label: 'Inspect electrical connections', required: true },
            { label: 'Check drain pan and line', required: false },
            { label: 'Measure supply/return air temp', required: true },
            { label: 'Lubricate moving parts', required: false },
          ]),
        },
      }),
      db.checklistTemplate.create({
        data: {
          tenantId: tenant.id, name: 'Electrical Safety Check', category: 'Electrical', isDefault: true,
          items: JSON.stringify([
            { label: 'Visual inspection of panels', required: true },
            { label: 'Test circuit breakers', required: true },
            { label: 'Check grounding system', required: true },
            { label: 'Measure insulation resistance', required: true },
            { label: 'Verify emergency lighting', required: true },
            { label: 'Test RCD/GFCI operation', required: true },
          ]),
        },
      }),
      db.checklistTemplate.create({
        data: {
          tenantId: tenant.id, name: 'Generator Maintenance', category: 'Generator', isDefault: true,
          items: JSON.stringify([
            { label: 'Check engine oil level', required: true },
            { label: 'Inspect coolant level', required: true },
            { label: 'Test battery condition', required: true },
            { label: 'Check fuel system for leaks', required: true },
            { label: 'Run load test', required: true },
            { label: 'Inspect exhaust system', required: false },
            { label: 'Check air filter', required: true },
            { label: 'Verify control panel functions', required: true },
          ]),
        },
      }),
      db.checklistTemplate.create({
        data: {
          tenantId: tenant.id, name: 'Plumbing Inspection', category: 'Plumbing', isDefault: true,
          items: JSON.stringify([
            { label: 'Check for leaks at all fixtures', required: true },
            { label: 'Test water pressure', required: true },
            { label: 'Inspect drain lines', required: true },
            { label: 'Check water heater operation', required: true },
            { label: 'Inspect backflow preventer', required: true },
            { label: 'Test sump pump', required: false },
          ]),
        },
      }),
    ]);

    // Create notifications
    const notifTypes = [
      { type: 'status_update', title: 'Complaint Assigned', message: 'AC not cooling properly has been assigned to Carlos Mendez', userId: users[3].id },
      { type: 'pm_reminder', title: 'PM Due Soon', message: 'PM for Central AC Unit is due in 3 days', userId: users[3].id },
      { type: 'invoice_reminder', title: 'Invoice Overdue', message: 'Invoice INV-240101-XXXX is 5 days overdue', userId: users[5].id },
      { type: 'status_update', title: 'Work Order Completed', message: 'WO for Strange noise from generator has been completed', userId: users[2].id },
      { type: 'eta_update', title: 'Technician En Route', message: 'David Chen is en route to your location (ETA: 15 min)', userId: users[3].id },
    ];

    await Promise.all(
      notifTypes.map((n) =>
        db.notification.create({
          data: {
            tenantId: tenant.id,
            userId: n.userId,
            type: n.type,
            title: n.title,
            message: n.message,
            isRead: Math.random() > 0.5,
            relatedEntityType: 'complaint',
            relatedEntityId: complaints[0]?.id,
          },
        })
      )
    );

    return NextResponse.json({
      message: 'Seed data created successfully',
      tenantId: tenant.id,
      credentials: {
        admin: { email: 'admin@facilitypro.com', password: 'password123' },
        manager: { email: 'manager@facilitypro.com', password: 'password123' },
        supervisor: { email: 'supervisor@facilitypro.com', password: 'password123' },
        technician: { email: 'tech1@facilitypro.com', password: 'password123' },
        finance: { email: 'finance@facilitypro.com', password: 'password123' },
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed', details: String(error) }, { status: 500 });
  }
}