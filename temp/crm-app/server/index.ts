import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (in production, use a database)
const users = new Map();
const customers = new Map();
const leads = new Map();
const deals = new Map();
const tasks = new Map();
const activities = new Map();

// Authentication middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !users.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = token;
  next();
};

// Auth routes
app.post('/api/register', (req, res) => {
  const { email, password, name } = req.body;
  const userId = crypto.randomBytes(16).toString('hex');
  
  // Check if email exists
  for (const [id, user] of users) {
    if (user.email === email) {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }
  
  users.set(userId, {
    id: userId,
    email,
    password: crypto.createHash('sha256').update(password).digest('hex'),
    name,
    role: 'sales_rep',
    createdAt: new Date()
  });
  
  res.json({ 
    token: userId, 
    user: { 
      id: userId, 
      email, 
      name,
      role: 'sales_rep'
    } 
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  for (const [id, user] of users) {
    if (user.email === email && user.password === hashedPassword) {
      return res.json({ 
        token: id, 
        user: { 
          id, 
          email: user.email, 
          name: user.name,
          role: user.role
        } 
      });
    }
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

// Dashboard stats
app.get('/api/dashboard/stats', authenticate, (req: any, res) => {
  const stats = {
    totalCustomers: customers.size,
    totalLeads: leads.size,
    activeDeals: Array.from(deals.values()).filter((d: any) => d.status !== 'closed').length,
    closedDeals: Array.from(deals.values()).filter((d: any) => d.status === 'closed').length,
    totalRevenue: Array.from(deals.values())
      .filter((d: any) => d.status === 'closed')
      .reduce((sum: number, d: any) => sum + d.amount, 0),
    pendingTasks: Array.from(tasks.values()).filter((t: any) => !t.completed).length,
    conversionRate: leads.size > 0 ? (customers.size / leads.size) * 100 : 0,
    avgDealSize: deals.size > 0 ? 
      Array.from(deals.values()).reduce((sum: number, d: any) => sum + d.amount, 0) / deals.size : 0
  };
  res.json(stats);
});

// Customers CRUD
app.get('/api/customers', authenticate, (req: any, res) => {
  const customerList = Array.from(customers.values());
  res.json(customerList);
});

app.get('/api/customers/:id', authenticate, (req: any, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

app.post('/api/customers', authenticate, (req: any, res) => {
  const customerId = crypto.randomBytes(16).toString('hex');
  const customer = {
    id: customerId,
    ...req.body,
    createdBy: req.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  customers.set(customerId, customer);
  res.json(customer);
});

app.put('/api/customers/:id', authenticate, (req: any, res) => {
  const customer = customers.get(req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  const updated = {
    ...customer,
    ...req.body,
    updatedAt: new Date()
  };
  customers.set(req.params.id, updated);
  res.json(updated);
});

// Leads CRUD
app.get('/api/leads', authenticate, (req: any, res) => {
  const leadList = Array.from(leads.values());
  res.json(leadList);
});

app.post('/api/leads', authenticate, (req: any, res) => {
  const leadId = crypto.randomBytes(16).toString('hex');
  const lead = {
    id: leadId,
    ...req.body,
    status: 'new',
    score: 0,
    assignedTo: req.userId,
    createdBy: req.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  leads.set(leadId, lead);
  res.json(lead);
});

app.put('/api/leads/:id', authenticate, (req: any, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  const updated = {
    ...lead,
    ...req.body,
    updatedAt: new Date()
  };
  leads.set(req.params.id, updated);
  res.json(updated);
});

app.post('/api/leads/:id/convert', authenticate, (req: any, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  
  // Create customer from lead
  const customerId = crypto.randomBytes(16).toString('hex');
  const customer = {
    id: customerId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    industry: lead.industry,
    convertedFromLead: lead.id,
    createdBy: req.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  customers.set(customerId, customer);
  
  // Update lead status
  lead.status = 'converted';
  lead.convertedToCustomer = customerId;
  lead.convertedAt = new Date();
  leads.set(req.params.id, lead);
  
  res.json({ lead, customer });
});

// Deals/Opportunities CRUD
app.get('/api/deals', authenticate, (req: any, res) => {
  const dealList = Array.from(deals.values());
  res.json(dealList);
});

app.post('/api/deals', authenticate, (req: any, res) => {
  const dealId = crypto.randomBytes(16).toString('hex');
  const deal = {
    id: dealId,
    ...req.body,
    stage: 'qualification',
    probability: 20,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    assignedTo: req.userId,
    createdBy: req.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  deals.set(dealId, deal);
  res.json(deal);
});

app.put('/api/deals/:id', authenticate, (req: any, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  
  // Update probability based on stage
  const stageProbability: any = {
    qualification: 20,
    proposal: 40,
    negotiation: 60,
    closing: 80,
    closed: 100,
    lost: 0
  };
  
  const updated = {
    ...deal,
    ...req.body,
    probability: stageProbability[req.body.stage] || deal.probability,
    updatedAt: new Date()
  };
  deals.set(req.params.id, updated);
  res.json(updated);
});

// Tasks CRUD
app.get('/api/tasks', authenticate, (req: any, res) => {
  const userTasks = Array.from(tasks.values())
    .filter((t: any) => t.assignedTo === req.userId);
  res.json(userTasks);
});

app.post('/api/tasks', authenticate, (req: any, res) => {
  const taskId = crypto.randomBytes(16).toString('hex');
  const task = {
    id: taskId,
    ...req.body,
    completed: false,
    assignedTo: req.userId,
    createdBy: req.userId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  tasks.set(taskId, task);
  res.json(task);
});

app.put('/api/tasks/:id/complete', authenticate, (req: any, res) => {
  const task = tasks.get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  task.completed = true;
  task.completedAt = new Date();
  task.updatedAt = new Date();
  tasks.set(req.params.id, task);
  res.json(task);
});

// Activities/Timeline
app.get('/api/activities', authenticate, (req: any, res) => {
  const { entityType, entityId } = req.query;
  let activityList = Array.from(activities.values());
  
  if (entityType && entityId) {
    activityList = activityList.filter((a: any) => 
      a.entityType === entityType && a.entityId === entityId
    );
  }
  
  activityList.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  res.json(activityList);
});

app.post('/api/activities', authenticate, (req: any, res) => {
  const activityId = crypto.randomBytes(16).toString('hex');
  const activity = {
    id: activityId,
    ...req.body,
    userId: req.userId,
    createdAt: new Date()
  };
  activities.set(activityId, activity);
  res.json(activity);
});

// Sales pipeline
app.get('/api/pipeline', authenticate, (req: any, res) => {
  const dealList = Array.from(deals.values());
  const pipeline = {
    qualification: dealList.filter((d: any) => d.stage === 'qualification'),
    proposal: dealList.filter((d: any) => d.stage === 'proposal'),
    negotiation: dealList.filter((d: any) => d.stage === 'negotiation'),
    closing: dealList.filter((d: any) => d.stage === 'closing'),
    closed: dealList.filter((d: any) => d.stage === 'closed'),
    lost: dealList.filter((d: any) => d.stage === 'lost')
  };
  res.json(pipeline);
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`CRM Server running on port ${PORT}`);
});