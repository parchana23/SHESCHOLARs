const STATE_KEY = "shescholar_state_v2";
const SESSION_KEY = "shescholar_session_v2";
const SESSION_EVENT = "shescholar_session_changed";

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function isApprovedGmail(email) {
  if (!email) return false;
  const normalized = String(email).trim().toLowerCase();
  return /^[a-z0-9._%+-]+@gmail\.com$/.test(normalized);
}

const defaultState = {
  users: [
    {
      id: "student_seed_1",
      role: "student",
      name: "Aarohi Sharma",
      email: "student.shescholar@gmail.com",
      password: "student123",
      phone: "+919900000001",
      auth: { googleLinked: true, otpVerified: true },
      profile: {
        educationLevel: "Undergraduate",
        institution: "NIT Trichy",
        course: "Computer Science",
        academicScore: 87,
        incomeRange: 260000,
        state: "Karnataka",
        district: "Mysuru",
        educationBackground: "First-generation learner",
        technicalSkills: ["React", "Python", "Data Analysis"],
        softSkills: ["Leadership", "Communication"],
        certifications: ["Google Data Analytics"],
        interests: ["STEM", "Women Leadership"],
        careerGoals: "Build AI solutions for social impact",
      },
      documents: [],
    },
    {
      id: "org_seed_1",
      role: "organization",
      name: "FutureHer Foundation",
      email: "org.shescholar@gmail.com",
      password: "org123",
      phone: "+919900000002",
      auth: { googleLinked: false, otpVerified: true },
      profile: {
        registrationNumber: "FHF-REG-2026-001",
        sector: "Education Technology",
        opportunityCategory: "Scholarship + Internship",
        requiredSkills: ["React", "Communication", "Problem Solving"],
        eligibilityCriteria: "Women students in UG/PG with 70%+ score",
      },
      documents: [
        {
          id: "doc_org_seed_1",
          label: "Registration Certificate",
          fileName: "fhf-registration.pdf",
          status: "verified",
          verifiedBy: "system",
          uploadedAt: nowIso(),
        },
      ],
    },
  ],
  opportunities: [
    {
      id: "opp_seed_1",
      orgId: "org_seed_1",
      title: "Women in AI Scholarship 2026",
      type: "Scholarship",
      location: "India",
      deadline: "2026-04-25",
      stipend: 120000,
      minAcademicScore: 75,
      qualification: "Undergraduate",
      requiredSkills: ["Python", "Data Analysis", "Communication"],
      description: "Funding + mentorship + internship pipeline for AI careers.",
    },
    {
      id: "opp_seed_2",
      orgId: "org_seed_1",
      title: "Inclusive Product Design Internship",
      type: "Internship",
      location: "Remote",
      deadline: "2026-04-10",
      stipend: 35000,
      minAcademicScore: 65,
      qualification: "Undergraduate",
      requiredSkills: ["Figma", "Research", "Storytelling"],
      description: "Paid internship focused on gender-inclusive product experiences.",
    },
  ],
  applications: [],
  messages: [],
  notifications: [],
  auditLogs: [],
};

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) {
    localStorage.setItem(STATE_KEY, JSON.stringify(defaultState));
    return JSON.parse(JSON.stringify(defaultState));
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.users) parsed.users = [];
    if (!parsed.opportunities) parsed.opportunities = [];
    if (!parsed.applications) parsed.applications = [];
    if (!parsed.messages) parsed.messages = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.auditLogs) parsed.auditLogs = [];
    return parsed;
  } catch (err) {
    localStorage.setItem(STATE_KEY, JSON.stringify(defaultState));
    return JSON.parse(JSON.stringify(defaultState));
  }
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export function getState() {
  return loadState();
}

export function updateState(mutator) {
  const state = loadState();
  mutator(state);
  saveState(state);
  return state;
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function notifySessionChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EVENT));
  }
}

export function setSession(user) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      startedAt: nowIso(),
    })
  );
  notifySessionChanged();
}

export function logoutSession() {
  localStorage.removeItem(SESSION_KEY);
  notifySessionChanged();
}

export function getSessionEventName() {
  return SESSION_EVENT;
}

export function findUserById(userId) {
  return getState().users.find((user) => user.id === userId);
}

export function login(role, email, password) {
  if (!isApprovedGmail(email)) {
    return { ok: false, message: "Only @gmail.com email addresses are allowed" };
  }
  const user = getState().users.find(
    (entry) =>
      entry.role === role &&
      entry.email.toLowerCase() === email.toLowerCase() &&
      entry.password === password
  );
  if (!user) return { ok: false, message: "Invalid credentials" };
  setSession(user);
  addNotification(user.id, "Login successful. Welcome back to SheScholar.");
  return { ok: true, user };
}

export function registerUser(role, form) {
  if (!isApprovedGmail(form.email)) {
    return { ok: false, message: "Only @gmail.com email addresses are allowed" };
  }
  let createdUser = null;
  updateState((state) => {
    const emailUsed = state.users.some(
      (entry) => entry.email.toLowerCase() === form.email.toLowerCase()
    );
    if (emailUsed) {
      return;
    }
    createdUser = {
      id: uid(role),
      role,
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      auth: { googleLinked: false, otpVerified: false },
      profile: form.profile || {},
      documents: [],
    };
    state.users.push(createdUser);
    state.auditLogs.push({
      id: uid("log"),
      actor: createdUser.id,
      action: `Registered as ${role}`,
      timestamp: nowIso(),
    });
  });
  if (!createdUser) return { ok: false, message: "Email already exists" };
  setSession(createdUser);
  return { ok: true, user: createdUser };
}

export function verifyOtp(userId) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    user.auth.otpVerified = true;
  });
}

export function linkGoogle(userId) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    user.auth.googleLinked = true;
  });
}

export function requestPasswordReset(email) {
  const user = getState().users.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase()
  );
  if (!user) return { ok: false, message: "No account found for this email" };
  addNotification(user.id, "Password reset request received. Check your email inbox.");
  return { ok: true };
}

export function updateProfile(userId, partialProfile) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    user.profile = { ...user.profile, ...partialProfile };
  });
}

export function updateUserAccount(userId, partialFields) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    Object.assign(user, partialFields);
  });
}

export function addDocument(userId, label, fileName, url = "") {
  const document = {
    id: uid("doc"),
    label,
    fileName,
    url,
    status: "pending",
    uploadedAt: nowIso(),
  };
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    user.documents.push(document);
    state.auditLogs.push({
      id: uid("log"),
      actor: user.id,
      action: `Uploaded document: ${label}`,
      timestamp: nowIso(),
    });
  });
  return document;
}

export function updateDocument(userId, documentId, updates) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    const doc = user.documents.find((entry) => entry.id === documentId);
    if (!doc) return;
    Object.assign(doc, updates);
    state.auditLogs.push({
      id: uid("log"),
      actor: userId,
      action: `Updated document: ${doc.label}`,
      timestamp: nowIso(),
    });
  });
}

export function deleteDocument(userId, documentId) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    const existing = user.documents.find((entry) => entry.id === documentId);
    user.documents = user.documents.filter((entry) => entry.id !== documentId);
    if (existing) {
      state.auditLogs.push({
        id: uid("log"),
        actor: userId,
        action: `Deleted document: ${existing.label}`,
        timestamp: nowIso(),
      });
    }
  });
}

export function setDocumentStatus(userId, documentId, status, reviewerId) {
  updateState((state) => {
    const user = state.users.find((entry) => entry.id === userId);
    if (!user) return;
    const doc = user.documents.find((entry) => entry.id === documentId);
    if (!doc) return;
    doc.status = status;
    doc.verifiedBy = reviewerId;
    state.auditLogs.push({
      id: uid("log"),
      actor: reviewerId,
      action: `Set document ${documentId} status to ${status}`,
      timestamp: nowIso(),
    });
  });
}

export function addOpportunity(orgId, payload) {
  const opportunity = { id: uid("opp"), orgId, ...payload };
  updateState((state) => {
    state.opportunities.push(opportunity);
    state.auditLogs.push({
      id: uid("log"),
      actor: orgId,
      action: `Created opportunity: ${payload.title}`,
      timestamp: nowIso(),
    });
  });
  return opportunity;
}

export function submitApplication(studentId, opportunityId) {
  const application = {
    id: uid("app"),
    studentId,
    opportunityId,
    status: "Submitted",
    timeline: [{ stage: "Submitted", at: nowIso() }],
    docsVisibleAfterAdminApproval: false,
    submittedAt: nowIso(),
  };
  updateState((state) => {
    state.applications.push(application);
    const opportunity = state.opportunities.find((entry) => entry.id === opportunityId);
    if (opportunity) {
      state.notifications.unshift({
        id: uid("ntf"),
        targetUserId: opportunity.orgId,
        message: `New application received for "${opportunity.title}".`,
        createdAt: nowIso(),
      });
    }
  });
  return application;
}

export function setApplicationStatus(applicationId, status, actorId) {
  updateState((state) => {
    const application = state.applications.find((entry) => entry.id === applicationId);
    if (!application) return;
    application.status = status;
    application.timeline.push({ stage: status, at: nowIso() });
    state.auditLogs.push({
      id: uid("log"),
      actor: actorId,
      action: `Changed application ${applicationId} to ${status}`,
      timestamp: nowIso(),
    });
    state.notifications.unshift({
      id: uid("ntf"),
      targetUserId: application.studentId,
      message: `Application update: ${status}`,
      createdAt: nowIso(),
    });
  });
}

export function setApplicationVisibility(applicationId, enabled, actorId) {
  updateState((state) => {
    const application = state.applications.find((entry) => entry.id === applicationId);
    if (!application) return;
    application.docsVisibleAfterAdminApproval = enabled;
    application.timeline.push({
      stage: enabled ? "Documents Verified" : "Documents Restricted",
      at: nowIso(),
    });
    state.auditLogs.push({
      id: uid("log"),
      actor: actorId,
      action: `${enabled ? "Enabled" : "Disabled"} document visibility for ${applicationId}`,
      timestamp: nowIso(),
    });
  });
}

export function canViewDocuments(application) {
  return Boolean(application?.docsVisibleAfterAdminApproval);
}

export function sendMessage(applicationId, fromUserId, toUserId, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return { ok: false, message: "Message cannot be empty" };
  const message = {
    id: uid("msg"),
    applicationId,
    fromUserId,
    toUserId,
    text: trimmed,
    createdAt: nowIso(),
  };
  updateState((state) => {
    state.messages.push(message);
  });
  return { ok: true, message };
}

export function getMessagesForApplication(applicationId) {
  return (getState().messages || [])
    .filter((entry) => entry.applicationId === applicationId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export function addNotification(targetUserId, message) {
  updateState((state) => {
    state.notifications.unshift({
      id: uid("ntf"),
      targetUserId,
      message,
      createdAt: nowIso(),
    });
  });
}

export function getUserNotifications(userId) {
  return getState().notifications.filter((entry) => entry.targetUserId === userId);
}
