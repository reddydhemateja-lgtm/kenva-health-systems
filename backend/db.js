const fs = require('fs');
const path = require('path');

const dbFilePath = path.join(__dirname, 'data.json');

// Default initial state
const defaultData = {
  users: [],
  patient_profiles: [],
  hospitals: [],
  hospital_staff: [],
  booking_access_codes: [],
  appointments: [],
  test_orders: [],
  samples: [],
  logistics_events: [],
  laboratory_records: [],
  reports: [],
  sample_workflow_timeline: [],
  notifications: [],
  audit_logs: [],
  login_otps: [],
  email_config: {
    id: 'primary',
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_email: '',
    is_enabled: 0,
    last_updated: new Date().toISOString()
  }
};

let data = { ...defaultData };

function loadDb() {
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf8');
      data = JSON.parse(raw);
      // Ensure all keys exist
      for (const key in defaultData) {
        if (!data[key]) {
          data[key] = defaultData[key];
        }
      }
    } else {
      saveDb();
    }
  } catch (err) {
    console.error('Error loading database file, initializing default:', err);
    data = { ...defaultData };
    saveDb();
  }
}

function saveDb() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

// Database helper functions
const db = {
  reload() {
    loadDb();
  },

  getCollection(table) {
    if (!data[table]) data[table] = [];
    return data[table];
  },

  find(table, filterFn = () => true) {
    const list = this.getCollection(table);
    return list.filter(filterFn);
  },

  findOne(table, filterFn) {
    const list = this.getCollection(table);
    return list.find(filterFn) || null;
  },

  insert(table, item) {
    const list = this.getCollection(table);
    list.push(item);
    saveDb();
    return item;
  },

  update(table, filterFn, updateData) {
    const list = this.getCollection(table);
    let updatedCount = 0;
    data[table] = list.map(item => {
      if (filterFn(item)) {
        updatedCount++;
        return { ...item, ...updateData };
      }
      return item;
    });
    if (updatedCount > 0) saveDb();
    return updatedCount;
  },

  delete(table, filterFn) {
    const list = this.getCollection(table);
    const initialLen = list.length;
    data[table] = list.filter(item => !filterFn(item));
    if (data[table].length !== initialLen) saveDb();
    return initialLen - data[table].length;
  },

  getEmailConfig() {
    return data.email_config || defaultData.email_config;
  },

  updateEmailConfig(newConf) {
    data.email_config = {
      ...data.email_config,
      ...newConf,
      last_updated: new Date().toISOString()
    };
    saveDb();
    return data.email_config;
  },

  // Save explicitly if modified directly
  persist() {
    saveDb();
  },

  // Log audit event
  logAudit({ actor_id, actor_name, actor_role, action, target_type, target_id, details }) {
    const auditItem = {
      id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      actor_id: actor_id || 'SYSTEM',
      actor_name: actor_name || 'System Auto',
      actor_role: actor_role || 'SYSTEM',
      action,
      target_type,
      target_id,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      timestamp: new Date().toISOString()
    };
    this.insert('audit_logs', auditItem);
    return auditItem;
  },

  // Send notification to user
  notifyUser({ user_id, title, message, type }) {
    const notif = {
      id: 'NOTIF-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      user_id,
      title,
      message,
      type,
      is_read: 0,
      created_at: new Date().toISOString()
    };
    this.insert('notifications', notif);
    return notif;
  }
};

loadDb();

module.exports = db;
