import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDocument,
  addOpportunity,
  findUserById,
  getSession,
  getState,
  getUserNotifications,
  getMessagesForApplication,
  logoutSession,
  setApplicationStatus,
  deleteDocument,
  sendMessage,
  submitApplication,
  updateDocument,
  updateUserAccount,
  updateProfile,
} from "../services/platformStore";
import {
  eligibilityBand,
  logisticEligibility,
  profileCompleteness,
  skillOverlap,
} from "../utils/aiMatching";

function rankOpportunity(student, opportunity, previousApps) {
  const skillMatch = skillOverlap(student.profile.technicalSkills || [], opportunity.requiredSkills || []);
  const qualificationMatch = student.profile.educationLevel === opportunity.qualification ? 1 : 0.45;
  const profileScore = profileCompleteness(student.profile);
  const probability = logisticEligibility({
    academicScore: student.profile.academicScore,
    income: student.profile.incomeRange,
    skillMatch,
    qualificationMatch,
    profileScore,
  });
  const repeatPenalty = previousApps.includes(opportunity.id) ? -0.08 : 0;
  const finalProbability = Math.max(0, Math.min(1, probability + repeatPenalty));
  return {
    ...opportunity,
    probability: finalProbability,
    band: eligibilityBand(finalProbability),
    matchScore: Math.round(finalProbability * 100),
  };
}

function rankCandidate(student, opportunity) {
  const skillMatch = skillOverlap(student.profile.technicalSkills || [], opportunity.requiredSkills || []);
  const qualificationMatch = student.profile.educationLevel === opportunity.qualification ? 1 : 0.45;
  const profileScore = profileCompleteness(student.profile);
  const probability = logisticEligibility({
    academicScore: student.profile.academicScore,
    income: student.profile.incomeRange,
    skillMatch,
    qualificationMatch,
    profileScore,
  });
  return {
    studentId: student.id,
    studentName: student.name,
    qualification: student.profile.educationLevel,
    skills: student.profile.technicalSkills || [],
    probability,
    matchScore: Math.round(probability * 100),
    band: eligibilityBand(probability),
  };
}

async function uploadDocumentFile(file) {
  const formData = new FormData();
  formData.append("document", file);
  const response = await fetch("http://localhost:5000/uploadDocument", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error("File upload failed");
  }
  return response.json();
}

function documentHref(doc) {
  if (doc?.url && !String(doc.url).startsWith("data:") && !String(doc.url).startsWith("blob:")) {
    return doc.url;
  }
  if (!doc?.fileName) return null;
  if (/^https?:\/\//i.test(doc.fileName)) return doc.fileName;
  return `http://localhost:5000/uploads/by-name/${encodeURIComponent(doc.fileName)}`;
}

function MessageThread({ applicationId, currentUserId, targetUserId, targetName, onMessageSent }) {
  const [draft, setDraft] = useState("");
  const messages = getMessagesForApplication(applicationId);

  return (
    <div className="timeline-card">
      <h4>Messages with {targetName}</h4>
      <div className="chat-box">
        {messages.length === 0 && <p>No messages yet. Start the conversation.</p>}
        {messages.map((message) => (
          <p key={message.id}>
            <strong>{message.fromUserId === currentUserId ? "You" : targetName}:</strong> {message.text}
          </p>
        ))}
      </div>
      <div className="inline-filters">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type your message..."
        />
        <button
          className="btn primary-btn"
          onClick={() => {
            const result = sendMessage(applicationId, currentUserId, targetUserId, draft);
            if (!result.ok) return;
            setDraft("");
            onMessageSent();
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function StudentDashboard({ session }) {
  const MIN_MATCH_PERCENT = 60;
  const [, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ location: "", type: "", deadlineBefore: "" });
  const [chatInput, setChatInput] = useState("");
  const [chatReplies, setChatReplies] = useState([
    "Hi, I can guide scholarships, eligibility, documents and deadlines.",
  ]);
  const [docLabel, setDocLabel] = useState("Academic Certificate");
  const [profileDraft, setProfileDraft] = useState({});
  const [accountDraft, setAccountDraft] = useState({ name: "", phone: "" });
  const [technicalSkillsText, setTechnicalSkillsText] = useState("");
  const [softSkillsText, setSoftSkillsText] = useState("");
  const [profileSaved, setProfileSaved] = useState("");
  const loadedStudentIdRef = useRef(null);

  const state = getState();
  const student = state.users.find((user) => user.id === session.userId);
  const applications = state.applications.filter((app) => app.studentId === student.id);
  const previousApps = applications.map((app) => app.opportunityId);
  const notifications = getUserNotifications(student.id);

  useEffect(() => {
    if (loadedStudentIdRef.current !== student.id) {
      setProfileDraft(student.profile || {});
      setAccountDraft({ name: student.name || "", phone: student.phone || "" });
      setTechnicalSkillsText((student.profile?.technicalSkills || []).join(", "));
      setSoftSkillsText((student.profile?.softSkills || []).join(", "));
      loadedStudentIdRef.current = student.id;
    }
  }, [student.id, student.name, student.phone, student.profile]);

  const ranked = useMemo(() => {
    return state.opportunities
      .filter((opportunity) =>
        [opportunity.title, opportunity.description, opportunity.type]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .filter((opportunity) => !filters.location || opportunity.location === filters.location)
      .filter((opportunity) => !filters.type || opportunity.type === filters.type)
      .filter((opportunity) => !filters.deadlineBefore || opportunity.deadline <= filters.deadlineBefore)
      .map((opportunity) => rankOpportunity(student, opportunity, previousApps))
      .filter((opportunity) => opportunity.matchScore >= MIN_MATCH_PERCENT)
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [state.opportunities, search, filters, student, previousApps]);

  const handleChat = () => {
    const text = chatInput.toLowerCase();
    let reply = "I can help with eligibility, search, document upload and tracking.";
    if (text.includes("eligibility")) reply = "Eligibility is predicted with logistic regression and shown as Highly Eligible, Moderate Match, or Low Match.";
    if (text.includes("deadline")) reply = "Use deadline filter in Smart Search and keep notifications active for reminders.";
    if (text.includes("document")) reply = "Upload documents in Document Vault. Visibility is enabled only after apply + organization verification.";
    if (text.includes("internship")) reply = "Set type filter to Internship and sort by Match Score.";
    setChatReplies((items) => [...items, reply]);
    setChatInput("");
  };

  return (
    <section className="page dashboard-page">
      <article className="panel-card">
        <div className="panel-head">
          <h2>Student Dashboard</h2>
          <button
            className="btn danger-btn"
            onClick={() => {
              logoutSession();
              window.location.assign("/");
            }}
          >
            Logout
          </button>
        </div>
        <p>AI recommendations, smart search, profile auto-save and application tracking.</p>
      </article>

      <div className="dashboard-grid">
        <article className="panel-card">
          <h3>Edit Student Profile</h3>
          <form
            className="form-grid two-col"
            onSubmit={(event) => {
              event.preventDefault();
              const parsedTechnicalSkills = technicalSkillsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              const parsedSoftSkills = softSkillsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

              updateUserAccount(student.id, { name: accountDraft.name, phone: accountDraft.phone });
              updateProfile(student.id, {
                ...profileDraft,
                technicalSkills: parsedTechnicalSkills,
                softSkills: parsedSoftSkills,
              });
              setRefresh((value) => value + 1);
              setProfileSaved("Student profile updated successfully.");
              setTimeout(() => setProfileSaved(""), 1800);
            }}
          >
            <input value={accountDraft.name} onChange={(event) => setAccountDraft({ ...accountDraft, name: event.target.value })} placeholder="Full name" />
            <input value={accountDraft.phone} onChange={(event) => setAccountDraft({ ...accountDraft, phone: event.target.value })} placeholder="Phone number" />
            <input value={profileDraft.educationLevel || ""} onChange={(event) => setProfileDraft({ ...profileDraft, educationLevel: event.target.value })} placeholder="Education level" />
            <input value={profileDraft.institution || ""} onChange={(event) => setProfileDraft({ ...profileDraft, institution: event.target.value })} placeholder="Institution" />
            <input value={profileDraft.course || ""} onChange={(event) => setProfileDraft({ ...profileDraft, course: event.target.value })} placeholder="Course / specialization" />
            <input type="number" value={profileDraft.academicScore || ""} onChange={(event) => setProfileDraft({ ...profileDraft, academicScore: Number(event.target.value) })} placeholder="Academic score" />
            <input type="number" value={profileDraft.incomeRange || ""} onChange={(event) => setProfileDraft({ ...profileDraft, incomeRange: Number(event.target.value) })} placeholder="Income range" />
            <input value={profileDraft.state || ""} onChange={(event) => setProfileDraft({ ...profileDraft, state: event.target.value })} placeholder="State" />
            <input value={profileDraft.district || ""} onChange={(event) => setProfileDraft({ ...profileDraft, district: event.target.value })} placeholder="District" />
            <input value={technicalSkillsText} onChange={(event) => setTechnicalSkillsText(event.target.value)} placeholder="Technical skills (comma separated)" />
            <input value={softSkillsText} onChange={(event) => setSoftSkillsText(event.target.value)} placeholder="Soft skills (comma separated)" />
            <textarea value={profileDraft.careerGoals || ""} onChange={(event) => setProfileDraft({ ...profileDraft, careerGoals: event.target.value })} placeholder="Career goals" />
            <button className="btn primary-btn" type="submit">
              Save Student Profile
            </button>
          </form>
          <p>Profile completeness: <strong>{Math.round(profileCompleteness(profileDraft) * 100)}%</strong></p>
          {profileSaved && <p className="status-text">{profileSaved}</p>}
        </article>

        <article className="panel-card">
          <h3>Smart Search</h3>
          <p>Showing only company opportunities with AI match score of {MIN_MATCH_PERCENT}% or higher.</p>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search scholarships, financial aid, internships, organizations..."
          />
          <div className="inline-filters">
            <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}>
              <option value="">All Types</option>
              <option value="Scholarship">Scholarship</option>
              <option value="Financial Aid">Financial Aid</option>
              <option value="Internship">Internship</option>
            </select>
            <select value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })}>
              <option value="">All Locations</option>
              {[...new Set(state.opportunities.map((opportunity) => opportunity.location))].map((location) => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
            <input type="date" value={filters.deadlineBefore} onChange={(event) => setFilters({ ...filters, deadlineBefore: event.target.value })} />
          </div>
          <div className="cards-list">
            {ranked.length === 0 && (
              <p>No companies currently match your profile above {MIN_MATCH_PERCENT}%. Update profile/skills to improve recommendations.</p>
            )}
            {ranked.map((opportunity) => (
              <article className="mini-card" key={opportunity.id}>
                <p className="opportunity-type">{opportunity.type}</p>
                <h4>{opportunity.title}</h4>
                <p>
                  Company:{" "}
                  <strong>
                    {(state.users.find((user) => user.id === opportunity.orgId)?.name) || "Organization"}
                  </strong>
                </p>
                <p>{opportunity.description}</p>
                <p>Location: {opportunity.location} | Deadline: {opportunity.deadline}</p>
                <p>
                  Eligibility Probability: <strong>{opportunity.matchScore}%</strong>{" "}
                  <span className={`pill ${opportunity.band === "Highly Eligible" ? "good" : opportunity.band === "Moderate Match" ? "warn" : "bad"}`}>
                    {opportunity.band}
                  </span>
                </p>
                <button
                  className="btn accent-btn"
                  onClick={() => {
                    submitApplication(student.id, opportunity.id);
                    setRefresh((value) => value + 1);
                  }}
                >
                  Apply Now
                </button>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-card">
          <h3>Document Vault</h3>
          <div className="inline-filters">
            <select value={docLabel} onChange={(event) => setDocLabel(event.target.value)}>
              <option>Academic Certificate</option>
              <option>Identity Proof</option>
              <option>Income Verification</option>
              <option>Skill Certification</option>
              <option>Resume / Portfolio</option>
            </select>
            <input
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const uploaded = await uploadDocumentFile(file);
                  addDocument(student.id, docLabel, uploaded.originalName || file.name, uploaded.fileUrl);
                  setRefresh((value) => value + 1);
                } catch (err) {
                  alert("Upload failed. Please ensure backend is running on port 5000.");
                }
              }}
            />
          </div>
          {student.documents.map((doc) => (
            <div key={doc.id} className="list-row">
              <div>
                <p>
                  <strong>{doc.label}</strong> -{" "}
                  {documentHref(doc) ? (
                    <a href={documentHref(doc)} target="_blank" rel="noreferrer">
                      {doc.fileName}
                    </a>
                  ) : (
                    <span>{doc.fileName} (re-upload required)</span>
                  )}
                </p>
                <p>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
              </div>
              <div className="action-row">
                <input
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const uploaded = await uploadDocumentFile(file);
                      updateDocument(student.id, doc.id, {
                        fileName: uploaded.originalName || file.name,
                        url: uploaded.fileUrl,
                        status: "pending",
                        uploadedAt: new Date().toISOString(),
                        verifiedBy: undefined,
                      });
                      setRefresh((value) => value + 1);
                    } catch (err) {
                      alert("Replace upload failed. Please ensure backend is running on port 5000.");
                    }
                  }}
                />
                <button
                  className="btn ghost-btn"
                  onClick={() => {
                    deleteDocument(student.id, doc.id);
                    setRefresh((value) => value + 1);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </article>

        <article className="panel-card">
          <h3>Notifications</h3>
          {notifications.slice(0, 10).map((note) => (
            <p key={note.id}>{new Date(note.createdAt).toLocaleString()} - {note.message}</p>
          ))}
        </article>

        <article className="panel-card">
          <h3>AI Assistant Chatbot</h3>
          <div className="chat-box">
            {chatReplies.map((reply, index) => (
              <p key={`${reply}-${index}`}>{reply}</p>
            ))}
          </div>
          <div className="inline-filters">
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Ask about eligibility, documents, search..." />
            <button className="btn primary-btn" onClick={handleChat}>Send</button>
          </div>
        </article>
      </div>
    </section>
  );
}

function OrganizationDashboard({ session }) {
  const [, setRefresh] = useState(0);
  const state = getState();
  const organization = state.users.find((user) => user.id === session.userId);
  const [orgAccountDraft, setOrgAccountDraft] = useState(() => ({ name: organization.name || "", phone: organization.phone || "" }));
  const [orgProfileDraft, setOrgProfileDraft] = useState(() => organization.profile || {});
  const [orgRequiredSkillsText, setOrgRequiredSkillsText] = useState(
    () => (organization.profile?.requiredSkills || []).join(", ")
  );
  const [orgSaved, setOrgSaved] = useState("");
  const loadedOrgIdRef = useRef(null);
  const [opportunityForm, setOpportunityForm] = useState({
    title: "",
    type: "Scholarship",
    location: "India",
    deadline: "",
    stipend: "",
    minAcademicScore: "",
    qualification: "",
    requiredSkills: "",
    description: "",
  });
  const orgOpportunityIds = state.opportunities
    .filter((entry) => entry.orgId === organization.id)
    .map((entry) => entry.id);
  const applications = state.applications.filter((app) => orgOpportunityIds.includes(app.opportunityId));

  useEffect(() => {
    if (loadedOrgIdRef.current !== organization.id) {
      setOrgAccountDraft({ name: organization.name || "", phone: organization.phone || "" });
      setOrgProfileDraft(organization.profile || {});
      setOrgRequiredSkillsText((organization.profile?.requiredSkills || []).join(", "));
      loadedOrgIdRef.current = organization.id;
    }
  }, [organization.id, organization.name, organization.phone, organization.profile]);

  return (
    <section className="page dashboard-page">
      <article className="panel-card">
        <div className="panel-head">
          <h2>Organization Dashboard</h2>
          <button
            className="btn danger-btn"
            onClick={() => {
              logoutSession();
              window.location.assign("/");
            }}
          >
            Logout
          </button>
        </div>
        <p>Post opportunities, rank candidates and manage verified document visibility.</p>
      </article>

      <div className="dashboard-grid">
        <article className="panel-card">
          <h3>Edit Organization Profile</h3>
          <form
            className="form-grid two-col"
            onSubmit={(event) => {
              event.preventDefault();
              const parsedRequiredSkills = orgRequiredSkillsText
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
              updateUserAccount(organization.id, { name: orgAccountDraft.name, phone: orgAccountDraft.phone });
              updateProfile(organization.id, {
                ...orgProfileDraft,
                requiredSkills: parsedRequiredSkills,
              });
              setRefresh((value) => value + 1);
              setOrgSaved("Organization profile updated successfully.");
              setTimeout(() => setOrgSaved(""), 1800);
            }}
          >
            <input value={orgAccountDraft.name} onChange={(event) => setOrgAccountDraft({ ...orgAccountDraft, name: event.target.value })} placeholder="Organization name" />
            <input value={orgAccountDraft.phone} onChange={(event) => setOrgAccountDraft({ ...orgAccountDraft, phone: event.target.value })} placeholder="Contact number" />
            <input value={orgProfileDraft.registrationNumber || ""} onChange={(event) => setOrgProfileDraft({ ...orgProfileDraft, registrationNumber: event.target.value })} placeholder="Registration number" />
            <input value={orgProfileDraft.sector || ""} onChange={(event) => setOrgProfileDraft({ ...orgProfileDraft, sector: event.target.value })} placeholder="Sector" />
            <input value={orgProfileDraft.opportunityCategory || ""} onChange={(event) => setOrgProfileDraft({ ...orgProfileDraft, opportunityCategory: event.target.value })} placeholder="Opportunity category" />
            <input value={orgRequiredSkillsText} onChange={(event) => setOrgRequiredSkillsText(event.target.value)} placeholder="Required skills (comma separated)" />
            <textarea value={orgProfileDraft.eligibilityCriteria || ""} onChange={(event) => setOrgProfileDraft({ ...orgProfileDraft, eligibilityCriteria: event.target.value })} placeholder="Eligibility criteria" />
            <button className="btn primary-btn" type="submit">
              Save Organization Profile
            </button>
          </form>
          {orgSaved && <p className="status-text">{orgSaved}</p>}
        </article>

        <article className="panel-card">
          <h3>Post Opportunity</h3>
          <div className="form-grid two-col">
            <input value={opportunityForm.title} onChange={(event) => setOpportunityForm({ ...opportunityForm, title: event.target.value })} placeholder="Title" />
            <select value={opportunityForm.type} onChange={(event) => setOpportunityForm({ ...opportunityForm, type: event.target.value })}>
              <option>Scholarship</option>
              <option>Financial Aid</option>
              <option>Internship</option>
            </select>
            <input value={opportunityForm.location} onChange={(event) => setOpportunityForm({ ...opportunityForm, location: event.target.value })} placeholder="Location" />
            <input type="date" value={opportunityForm.deadline} onChange={(event) => setOpportunityForm({ ...opportunityForm, deadline: event.target.value })} />
            <input type="number" value={opportunityForm.stipend} onChange={(event) => setOpportunityForm({ ...opportunityForm, stipend: Number(event.target.value) })} placeholder="Benefit amount" />
            <input type="number" value={opportunityForm.minAcademicScore} onChange={(event) => setOpportunityForm({ ...opportunityForm, minAcademicScore: Number(event.target.value) })} placeholder="Minimum score" />
            <input value={opportunityForm.qualification} onChange={(event) => setOpportunityForm({ ...opportunityForm, qualification: event.target.value })} placeholder="Required qualification" />
            <input value={opportunityForm.requiredSkills} onChange={(event) => setOpportunityForm({ ...opportunityForm, requiredSkills: event.target.value })} placeholder="Required skills (comma separated)" />
            <textarea value={opportunityForm.description} onChange={(event) => setOpportunityForm({ ...opportunityForm, description: event.target.value })} placeholder="Opportunity description" />
            <button
              className="btn primary-btn"
              onClick={() => {
                addOpportunity(organization.id, {
                  ...opportunityForm,
                  requiredSkills: opportunityForm.requiredSkills.split(",").map((item) => item.trim()).filter(Boolean),
                });
                setOpportunityForm({
                  title: "",
                  type: "Scholarship",
                  location: "India",
                  deadline: "",
                  stipend: "",
                  minAcademicScore: "",
                  qualification: "",
                  requiredSkills: "",
                  description: "",
                });
                setRefresh((value) => value + 1);
              }}
            >
              Publish Opportunity
            </button>
          </div>
        </article>

        <article className="panel-card">
          <h3>Organization Verification Documents</h3>
          <div className="inline-filters">
            <input
              type="file"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  const uploaded = await uploadDocumentFile(file);
                  addDocument(
                    organization.id,
                    "Organization Verification",
                    uploaded.originalName || file.name,
                    uploaded.fileUrl
                  );
                  setRefresh((value) => value + 1);
                } catch (err) {
                  alert("Upload failed. Please ensure backend is running on port 5000.");
                }
              }}
            />
          </div>
          {organization.documents.map((doc) => (
            <div key={doc.id} className="list-row">
              <p>
                {doc.label} -{" "}
                {documentHref(doc) ? (
                  <a href={documentHref(doc)} target="_blank" rel="noreferrer">
                    {doc.fileName}
                  </a>
                ) : (
                  <span>{doc.fileName} (re-upload required)</span>
                )}
              </p>
              <div className="action-row">
                <input
                  type="file"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      const uploaded = await uploadDocumentFile(file);
                      updateDocument(organization.id, doc.id, {
                        fileName: uploaded.originalName || file.name,
                        url: uploaded.fileUrl,
                        status: "pending",
                        uploadedAt: new Date().toISOString(),
                        verifiedBy: undefined,
                      });
                      setRefresh((value) => value + 1);
                    } catch (err) {
                      alert("Replace upload failed. Please ensure backend is running on port 5000.");
                    }
                  }}
                />
                <button
                  className="btn ghost-btn"
                  onClick={() => {
                    deleteDocument(organization.id, doc.id);
                    setRefresh((value) => value + 1);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </article>

        <article className="panel-card">
          <h3>AI Candidate Recommendations</h3>
          {applications.length === 0 && <p>No candidates yet.</p>}
          {applications.map((application) => {
            const opportunity = state.opportunities.find((entry) => entry.id === application.opportunityId);
            const student = findUserById(application.studentId);
            const ranking = student ? rankCandidate(student, opportunity) : null;
            return (
              <div key={application.id} className="timeline-card">
                <h4>{student?.name || "Unknown Candidate"} for {opportunity?.title}</h4>
                {ranking && (
                  <>
                    <p>Match Score: {ranking.matchScore}%</p>
                    <p>Band: <span className={`pill ${ranking.band === "Highly Eligible" ? "good" : ranking.band === "Moderate Match" ? "warn" : "bad"}`}>{ranking.band}</span></p>
                    <p>Skills: {ranking.skills.join(", ") || "Not specified"}</p>
                  </>
                )}
                <p>Application Status: {application.status}</p>
                <div className="action-row">
                  <button className="btn ghost-btn" onClick={() => {
                    setApplicationStatus(application.id, "Under Review", session.userId);
                    setRefresh((value) => value + 1);
                  }}>Under Review</button>
                  <button className="btn success-btn" onClick={() => {
                    setApplicationStatus(application.id, "Approved", session.userId);
                    setRefresh((value) => value + 1);
                  }}>Approve</button>
                  <button className="btn danger-btn" onClick={() => {
                    setApplicationStatus(application.id, "Rejected", session.userId);
                    setRefresh((value) => value + 1);
                  }}>Reject</button>
                </div>
                <div>
                  <p>Student Documents (read-only):</p>
                  {(student.documents || []).length > 0
                    ? (student.documents || []).map((doc) => (
                        <div key={doc.id} className="list-row">
                          <p>
                            {doc.label} -{" "}
                            {documentHref(doc) ? (
                              <a href={documentHref(doc)} target="_blank" rel="noreferrer">
                                {doc.fileName}
                              </a>
                            ) : (
                              <span>{doc.fileName} (re-upload required)</span>
                            )}{" "}
                            ({doc.status})
                          </p>
                        </div>
                      ))
                    : <p>No documents submitted yet by this student.</p>}
                </div>
                {student?.id && (
                  <MessageThread
                    applicationId={application.id}
                    currentUserId={organization.id}
                    targetUserId={student.id}
                    targetName={student.name || "Student"}
                    onMessageSent={() => setRefresh((value) => value + 1)}
                  />
                )}
              </div>
            );
          })}
        </article>
      </div>
    </section>
  );
}

function Dashboard() {
  const session = getSession();
  if (!session) {
    return (
      <section className="page">
        <article className="panel-card">
          <h2>Please login to view dashboard.</h2>
          <div className="action-row">
            <Link className="btn primary-btn" to="/student/login">Student Login</Link>
            <Link className="btn ghost-btn" to="/company/login">Company Login</Link>
          </div>
        </article>
      </section>
    );
  }
  if (session.role === "student") return <StudentDashboard session={session} />;
  if (session.role === "organization") return <OrganizationDashboard session={session} />;
  return null;
}

export default Dashboard;
