import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getPool, checkDatabaseConnection, initDatabaseSchema, currentDBConfig } from './db';
import { INITIAL_INVOICES, INITIAL_VENDORS } from '../src/data/mockFinanceData';
import { SEEDED_DAILY_PAYMENTS } from '../src/data/dailyPaymentsSeed';

// Format DB dates in server-local time (+07 Phnom Penh) instead of UTC,
// otherwise DATE columns stored at local midnight shift to the previous day.
const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Initialize DB schema on server launch
initDatabaseSchema().catch((err) => {
  console.warn('[Server] Initial DB check failed (MySQL may be offline or starting up):', err.message);
});

// Helper to seed MySQL database if empty
const seedDatabaseIfEmpty = async () => {
  const p = getPool();
  
  const [vendorRows]: any = await p.query('SELECT COUNT(*) AS count FROM `vendors`');
  if (vendorRows[0].count === 0) {
    console.log('[MySQL] Seeding vendors table...');
    for (const v of INITIAL_VENDORS) {
      await p.query(
        `INSERT INTO \`vendors\` (\`id\`, \`name\`, \`category\`, \`tax_id\`, \`email\`, \`phone\`, \`address\`, \`bank_name\`, \`bank_routing_number\`, \`bank_account_number\`, \`default_payment_method\`, \`default_payment_terms\`, \`rating\`, \`status\`, \`contact_person\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`)`,
        [
          v.id,
          v.name,
          v.category,
          v.taxId || '',
          v.email || '',
          v.phone || '',
          v.address || '',
          v.bankName || 'ABA Bank',
          v.bankRoutingNumber || '',
          v.bankAccountNumber || '',
          v.defaultPaymentMethod || 'aba_pay',
          v.defaultPaymentTerms || 'Net 30',
          v.rating || 5.0,
          v.status || 'active',
          v.contactPerson || '',
        ]
      );
    }
  }

  const [invoiceRows]: any = await p.query('SELECT COUNT(*) AS count FROM `invoices`');
  if (invoiceRows[0].count === 0) {
    console.log('[MySQL] Seeding invoices table...');
    for (const inv of INITIAL_INVOICES) {
      await p.query(
        `INSERT INTO \`invoices\` (\`id\`, \`invoice_number\`, \`type\`, \`po_number\`, \`vendor_id\`, \`vendor_name\`, \`vendor_category\`, \`issue_date\`, \`due_date\`, \`currency\`, \`subtotal\`, \`tax_amount\`, \`total_amount\`, \`base_amount_usd\`, \`amount_paid\`, \`remaining_balance\`, \`status\`, \`payment_terms\`, \`department\`, \`assigned_approver_role\`, \`three_way_matched\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`total_amount\`=VALUES(\`total_amount\`)`,
        [
          inv.id,
          inv.invoiceNumber,
          inv.type,
          inv.poNumber || null,
          inv.vendorId,
          inv.vendorName,
          inv.vendorCategory,
          inv.issueDate,
          inv.dueDate,
          inv.currency,
          inv.subtotal,
          inv.taxAmount,
          inv.totalAmount,
          inv.baseAmountUSD,
          inv.amountPaid || 0,
          inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount - (inv.amountPaid || 0),
          inv.status,
          inv.paymentTerms,
          inv.department,
          inv.assignedApproverRole || 'cfo',
          inv.threeWayMatched ? 1 : 0,
          inv.notes || '',
        ]
      );

      // Line items
      if (inv.lineItems && inv.lineItems.length > 0) {
        for (const li of inv.lineItems) {
          await p.query(
            `INSERT INTO \`invoice_line_items\` (\`id\`, \`invoice_id\`, \`description\`, \`quantity\`, \`unit_price\`, \`tax_rate\`, \`total_amount\`)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE \`description\`=VALUES(\`description\`)`,
            [li.id, inv.id, li.description, li.quantity, li.unitPrice, li.taxRate, li.totalAmount]
          );
        }
      }

      // Partial payments
      if (inv.partialPayments && inv.partialPayments.length > 0) {
        for (const pp of inv.partialPayments) {
          await p.query(
            `INSERT INTO \`partial_payments\` (\`id\`, \`invoice_id\`, \`amount\`, \`amount_usd\`, \`payment_date\`, \`payment_method\`, \`reference\`, \`notes\`, \`recorded_by\`, \`remaining_balance_after\`)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`)`,
            [
              pp.id,
              inv.id,
              pp.amount,
              pp.amountUSD,
              pp.paymentDate,
              pp.paymentMethod,
              pp.reference || '',
              pp.notes || '',
              pp.recordedBy || 'Cashier',
              pp.remainingBalanceAfter,
            ]
          );
        }
      }
    }
  }

  const [dailyRows]: any = await p.query('SELECT COUNT(*) AS count FROM `daily_payments`');
  if (dailyRows[0].count === 0) {
    console.log('[MySQL] Seeding daily_payments table...');
    for (const dp of SEEDED_DAILY_PAYMENTS) {
      await p.query(
        `INSERT INTO \`daily_payments\` (\`id\`, \`date\`, \`supplier\`, \`amount\`, \`payment_method\`, \`reference\`, \`notes\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`amount\`=VALUES(\`amount\`)`,
        [dp.id, dp.date, dp.supplier, dp.amount, dp.paymentMethod, dp.reference || '', dp.notes || '']
      );
    }
  }
};

// -------------------------------------------------------------
// 1. Health & MySQL Status Endpoint
// -------------------------------------------------------------
app.get('/api/health', async (_req: Request, res: Response) => {
  const status = await checkDatabaseConnection();
  res.json({
    status: status.connected ? 'ok' : 'db_error',
    database: {
      connected: status.connected,
      host: currentDBConfig.host,
      port: currentDBConfig.port,
      user: currentDBConfig.user,
      name: currentDBConfig.database,
      error: status.error || null,
    },
    app: 'KY Store Accounts Payable Ledger',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// 2. Trigger Database Seed Endpoint
// -------------------------------------------------------------
app.post('/api/seed', async (_req: Request, res: Response) => {
  try {
    await initDatabaseSchema();
    await seedDatabaseIfEmpty();
    res.json({ success: true, message: 'Database seeded successfully with KY Store data.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 3. Invoices Endpoints
// -------------------------------------------------------------
app.get('/api/invoices', async (_req: Request, res: Response) => {
  try {
    const p = getPool();
    const [invoices]: any = await p.query('SELECT * FROM `invoices` ORDER BY `issue_date` DESC');
    
    // Fetch line items and partial payments
    const [lineItems]: any = await p.query('SELECT * FROM `invoice_line_items`');
    const [payments]: any = await p.query('SELECT * FROM `partial_payments` ORDER BY `payment_date` ASC');
    const [audits]: any = await p.query('SELECT * FROM `audit_logs` ORDER BY `timestamp` ASC');

    const formattedInvoices = invoices.map((inv: any) => {
      const invLineItems = lineItems
        .filter((li: any) => li.invoice_id === inv.id)
        .map((li: any) => ({
          id: li.id,
          description: li.description,
          quantity: Number(li.quantity),
          unitPrice: Number(li.unit_price),
          taxRate: Number(li.tax_rate),
          totalAmount: Number(li.total_amount),
        }));

      const invPayments = payments
        .filter((pp: any) => pp.invoice_id === inv.id)
        .map((pp: any) => ({
          id: pp.id,
          amount: Number(pp.amount),
          amountUSD: Number(pp.amount_usd),
          paymentDate: pp.payment_date instanceof Date ? localDateStr(pp.payment_date) : pp.payment_date,
          paymentMethod: pp.payment_method,
          reference: pp.reference,
          notes: pp.notes,
          recordedBy: pp.recorded_by,
          remainingBalanceAfter: Number(pp.remaining_balance_after),
        }));

      const invAudits = audits
        .filter((a: any) => a.invoice_id === inv.id)
        .map((a: any) => ({
          id: a.id,
          timestamp: a.timestamp,
          userName: a.user_name,
          role: a.role,
          action: a.action,
          note: a.note,
        }));

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        type: inv.type,
        poNumber: inv.po_number || undefined,
        vendorId: inv.vendor_id,
        vendorName: inv.vendor_name,
        vendorCategory: inv.vendor_category,
        issueDate: inv.issue_date instanceof Date ? localDateStr(inv.issue_date) : inv.issue_date,
        dueDate: inv.due_date instanceof Date ? localDateStr(inv.due_date) : inv.due_date,
        currency: inv.currency,
        subtotal: Number(inv.subtotal),
        taxAmount: Number(inv.tax_amount),
        totalAmount: Number(inv.total_amount),
        baseAmountUSD: Number(inv.base_amount_usd),
        amountPaid: Number(inv.amount_paid),
        remainingBalance: Number(inv.remaining_balance),
        status: inv.status,
        paymentTerms: inv.payment_terms,
        department: inv.department,
        assignedApproverRole: inv.assigned_approver_role,
        threeWayMatched: Boolean(inv.three_way_matched),
        paymentMethod: inv.payment_method || undefined,
        paymentReference: inv.payment_reference || undefined,
        paidAt: inv.paid_at || undefined,
        remindersSentCount: Number(inv.reminders_sent_count || 0),
        lastReminderDate: inv.last_reminder_date || undefined,
        notes: inv.notes || undefined,
        lineItems: invLineItems,
        partialPayments: invPayments,
        auditHistory: invAudits,
      };
    });

    res.json(formattedInvoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const inv = req.body;
    const invId = inv.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    await p.query(
      `INSERT INTO \`invoices\` (\`id\`, \`invoice_number\`, \`type\`, \`po_number\`, \`vendor_id\`, \`vendor_name\`, \`vendor_category\`, \`issue_date\`, \`due_date\`, \`currency\`, \`subtotal\`, \`tax_amount\`, \`total_amount\`, \`base_amount_usd\`, \`amount_paid\`, \`remaining_balance\`, \`status\`, \`payment_terms\`, \`department\`, \`assigned_approver_role\`, \`three_way_matched\`, \`notes\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invId,
        inv.invoiceNumber,
        inv.type || 'payable',
        inv.poNumber || null,
        inv.vendorId,
        inv.vendorName,
        inv.vendorCategory || 'General',
        inv.issueDate,
        inv.dueDate,
        inv.currency || 'USD',
        inv.subtotal || inv.totalAmount,
        inv.taxAmount || 0,
        inv.totalAmount,
        inv.baseAmountUSD || inv.totalAmount,
        inv.amountPaid || 0,
        inv.remainingBalance !== undefined ? inv.remainingBalance : inv.totalAmount,
        inv.status || 'approved',
        inv.paymentTerms || 'Net 30',
        inv.department || 'Store Operations',
        inv.assignedApproverRole || 'cfo',
        inv.threeWayMatched ? 1 : 0,
        inv.notes || '',
      ]
    );

    if (inv.lineItems && inv.lineItems.length > 0) {
      for (const li of inv.lineItems) {
        const liId = li.id || `li_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        await p.query(
          `INSERT INTO \`invoice_line_items\` (\`id\`, \`invoice_id\`, \`description\`, \`quantity\`, \`unit_price\`, \`tax_rate\`, \`total_amount\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            liId,
            invId,
            li.description || '',
            li.quantity || 1,
            li.unitPrice || 0,
            li.taxRate || 0,
            li.totalAmount ?? li.totalPrice ?? ((li.quantity || 1) * (li.unitPrice || 0))
          ]
        );
      }
    }

    res.status(201).json({ success: true, id: invId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/invoices/:id', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const { id } = req.params;
    const updates = req.body;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      fields.push('`status` = ?');
      values.push(updates.status);
    }
    if (updates.amountPaid !== undefined) {
      fields.push('`amount_paid` = ?');
      values.push(updates.amountPaid);
    }
    if (updates.remainingBalance !== undefined) {
      fields.push('`remaining_balance` = ?');
      values.push(updates.remainingBalance);
    }
    if (updates.paymentMethod !== undefined) {
      fields.push('`payment_method` = ?');
      values.push(updates.paymentMethod);
    }
    if (updates.notes !== undefined) {
      fields.push('`notes` = ?');
      values.push(updates.notes);
    }

    if (fields.length > 0) {
      values.push(id);
      await p.query(`UPDATE \`invoices\` SET ${fields.join(', ')} WHERE \`id\` = ?`, values);
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const { id } = req.params;
    await p.query('DELETE FROM `invoices` WHERE `id` = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Record payment on invoice
app.post('/api/invoices/:id/payments', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const { id } = req.params;
    const { amount, amountUSD, paymentDate, paymentMethod, reference, notes, recordedBy } = req.body;

    // Get current invoice
    const [rows]: any = await p.query('SELECT * FROM `invoices` WHERE `id` = ?', [id]);
    if (rows.length === 0) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const inv = rows[0];
    const newAmountPaid = Number(inv.amount_paid) + Number(amount);
    const newRemainingBalance = Math.max(0, Number(inv.total_amount) - newAmountPaid);
    const newStatus = newRemainingBalance <= 0.001 ? 'paid' : 'partially_paid';

    // Insert payment
    const paymentId = `pp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    await p.query(
      `INSERT INTO \`partial_payments\` (\`id\`, \`invoice_id\`, \`amount\`, \`amount_usd\`, \`payment_date\`, \`payment_method\`, \`reference\`, \`notes\`, \`recorded_by\`, \`remaining_balance_after\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        id,
        amount,
        amountUSD || amount,
        paymentDate || localDateStr(new Date()),
        paymentMethod || 'aba_pay',
        reference || '',
        notes || '',
        recordedBy || 'Cashier',
        newRemainingBalance,
      ]
    );

    // Update invoice
    await p.query(
      `UPDATE \`invoices\` SET \`amount_paid\` = ?, \`remaining_balance\` = ?, \`status\` = ?, \`payment_method\` = ? WHERE \`id\` = ?`,
      [newAmountPaid, newRemainingBalance, newStatus, paymentMethod, id]
    );

    res.json({ success: true, paymentId, remainingBalance: newRemainingBalance, status: newStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. Vendors Endpoints
// -------------------------------------------------------------
app.get('/api/vendors', async (_req: Request, res: Response) => {
  try {
    const p = getPool();
    const [rows]: any = await p.query('SELECT * FROM `vendors` ORDER BY `name` ASC');
    const vendors = rows.map((v: any) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      taxId: v.tax_id,
      email: v.email,
      phone: v.phone,
      address: v.address,
      bankName: v.bank_name,
      bankRoutingNumber: v.bank_routing_number,
      bankAccountNumber: v.bank_account_number,
      defaultPaymentMethod: v.default_payment_method,
      defaultPaymentTerms: v.default_payment_terms,
      rating: Number(v.rating),
      status: v.status,
      contactPerson: v.contact_person,
      totalSpendUSD: 0,
      openInvoicesCount: 0,
    }));
    res.json(vendors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vendors', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const v = req.body;
    const vId = v.id || `vnd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    await p.query(
      `INSERT INTO \`vendors\` (\`id\`, \`name\`, \`category\`, \`tax_id\`, \`email\`, \`phone\`, \`address\`, \`bank_name\`, \`bank_routing_number\`, \`bank_account_number\`, \`default_payment_method\`, \`default_payment_terms\`, \`rating\`, \`status\`, \`contact_person\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE \`name\`=VALUES(\`name\`), \`category\`=VALUES(\`category\`)`,
      [
        vId,
        v.name,
        v.category || 'General',
        v.taxId || '',
        v.email || '',
        v.phone || '',
        v.address || '',
        v.bankName || 'ABA Bank',
        v.bankRoutingNumber || '',
        v.bankAccountNumber || '',
        v.defaultPaymentMethod || 'aba_pay',
        v.defaultPaymentTerms || 'Net 30',
        v.rating || 5.0,
        v.status || 'active',
        v.contactPerson || '',
      ]
    );

    res.status(201).json({ success: true, id: vId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vendors/:id', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const { id } = req.params;
    await p.query('DELETE FROM `vendors` WHERE `id` = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 5. Daily Payments (Cashbook) Endpoints
// -------------------------------------------------------------
app.get('/api/daily-payments', async (_req: Request, res: Response) => {
  try {
    const p = getPool();
    const [rows]: any = await p.query('SELECT * FROM `daily_payments` ORDER BY `date` DESC, `created_at` DESC');
    const payments = rows.map((dp: any) => ({
      id: dp.id,
      date: dp.date instanceof Date ? localDateStr(dp.date) : dp.date,
      supplier: dp.supplier,
      amount: Number(dp.amount),
      paymentMethod: dp.payment_method,
      reference: dp.reference,
      notes: dp.notes,
    }));
    res.json(payments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/daily-payments', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const { date, supplier, amount, paymentMethod, reference, notes } = req.body;
    const id = req.body.id || `dpay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    await p.query(
      `INSERT INTO \`daily_payments\` (\`id\`, \`date\`, \`supplier\`, \`amount\`, \`payment_method\`, \`reference\`, \`notes\`)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, date, supplier, amount, paymentMethod || 'aba_pay', reference || '', notes || '']
    );

    res.status(201).json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/daily-payments/:id', async (req: Request, res: Response) => {
  try {
    const p = getPool();
    const { id } = req.params;
    await p.query('DELETE FROM `daily_payments` WHERE `id` = ?', [id]);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[API Server] Running on http://localhost:${PORT}`);
  console.log(`[API Server] Connected config: ${currentDBConfig.user}@${currentDBConfig.host}:${currentDBConfig.port}/${currentDBConfig.database}`);
});
