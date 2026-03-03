const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const validation = require("./validation");

const app = express();

app.use(cors());
app.use(express.json());

// configure upload directory and multer storage
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// resolve legacy records by original file name (e.g., "WhatsApp Image ...jpeg")
app.get('/uploads/by-name/:name', (req, res) => {
  try {
    const originalName = decodeURIComponent(req.params.name || '').trim();
    if (!originalName) {
      return res.status(400).json({ error: 'Invalid file name' });
    }
    const files = fs
      .readdirSync(uploadDir)
      .filter((f) => f.endsWith(originalName))
      .map((f) => ({
        name: f,
        mtime: fs.statSync(path.join(uploadDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (!files.length) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.sendFile(path.join(uploadDir, files[0].name));
  } catch (err) {
    console.error('uploads/by-name error:', err);
    res.status(500).json({ error: 'Unable to fetch file' });
  }
});

// generic document upload endpoint used by dashboard vault uploads
app.post('/uploadDocument', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(req.file.filename)}`;
    res.json({
      success: true,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl,
    });
  } catch (err) {
    console.error('uploadDocument error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// simple helper to read/write json
function readData(file){
  const full = path.join(__dirname,'data',file);
  try {
    const raw = fs.readFileSync(full);
    if (!raw || raw.length === 0) {
      return [];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.warn(`readData: failed to parse ${file}, resetting to []`, e.message);
    // overwrite with empty array to recover
    writeData(file, []);
    return [];
  }
}
function writeData(file, data){
  fs.writeFileSync(path.join(__dirname,'data',file), JSON.stringify(data,null,2));
}

const JWT_SECRET = "supersecretkey"; // change in production


// ---------- STUDENT REGISTER ----------
app.post("/registerStudent", upload.fields([{ name: 'incomeCert' }, { name: 'marksheet' }]), async (req, res) => {
  try {
    console.log('registerStudent called');
    const errors = validation.validateStudentRegistration(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors[0] });
    }
    let students = readData('students.json');
    const body = req.body;

    // check if email already exists
    if (students.find(s => s.email === body.email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // hash password
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    }
    // file path
    if (req.files) {
      if (req.files.incomeCert) body.incomeCertPath = req.files.incomeCert[0].filename;
      if (req.files.marksheet) body.marksheetPath = req.files.marksheet[0].filename;
    }
    // initialize skills and certificates arrays
    body.skills = [];
    body.certificates = [];
    // add id
    body.id = students.length ? students[students.length - 1].id + 1 : 1;
    students.push(body);
    writeData('students.json', students);
    res.json({ success: true, message: 'Student Registered Successfully' });
  } catch (err) {
    console.error('registerStudent error:', err);
    res.status(500).json({ error: err.message || 'Error registering student' });
  }
});


// ---------- COMPANY REGISTER ----------
app.post(
  "/registerCompany",
  upload.fields([{ name: 'companyLogo' }, { name: 'csrCert' }]),
  async (req, res) => {
    console.log('registerCompany called');
    if (!req.body) {
      return res.status(400).json({ error: 'no form data received' });
    }
    try {
      const errors = validation.validateCompanyRegistration(req.body);
      if (errors.length > 0) {
        return res.status(400).json({ error: errors[0] });
      }

      let companies = readData('companies.json');
      const body = req.body;

      // check if email already registered
      if (companies.find(c => c.email === body.email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      if (body.password) {
        body.password = await bcrypt.hash(body.password, 10);
      }
      if (req.files) {
        if (req.files.companyLogo) body.logoPath = req.files.companyLogo[0].filename;
        if (req.files.csrCert) body.csrCertPath = req.files.csrCert[0].filename;
      }
      body.id = companies.length ? companies[companies.length - 1].id + 1 : 1;
      body.verification_status = 'pending';
      companies.push(body);
      writeData('companies.json', companies);
      res.json({ success: true, message: 'Company Registered Successfully' });
    } catch (err) {
      console.error('company registration failed', err);
      res.status(500).json({ error: err.message || 'Error registering company' });
    }
  }
);

// simple scoring function for profile vs scholarship
function computeScore(profile, sch) {
  if (!profile || !sch) return 0;
  let score = 0;
  if (profile.marksPercent && sch.minMarks) {
    score += Math.min(100, (profile.marksPercent / sch.minMarks) * 100);
  }
  if (profile.familyIncome && sch.amount) {
    score += Math.min(100, (sch.amount / (profile.familyIncome || 1)) * 10);
  }
  if (profile.locationType && sch.locationType && profile.locationType === sch.locationType) {
    score += 10;
  }
  return score;
}

// recommend scholarships for a given student email
app.get('/recommendations/:email', (req, res) => {
  const students = readData('students.json');
  const user = students.find((u) => u.email === req.params.email);
  if (!user) return res.status(404).send('student not found');
  const schs = readData('scholarships.json');
  const ranked = schs
    .map((s) => ({ ...s, score: computeScore(user, s) }))
    .sort((a, b) => b.score - a.score);
  res.json(ranked);
});

// ---------- STUDENT PROFILE ----------
app.get('/student/:email', (req, res) => {
  const students = readData('students.json');
  const user = students.find((u) => u.email === req.params.email);
  if (!user) return res.status(404).send('not found');
  res.json(user);
});

// ---------- COMPANY PROFILE ----------
app.get('/company/:email', (req, res) => {
  const companies = readData('companies.json');
  const user = companies.find((u) => u.email === req.params.email);
  if (!user) return res.status(404).send('not found');
  res.json(user);
});

// ---------- STUDENT LOGIN ----------
app.post('/loginStudent', async (req, res) => {
  try {
    const { email, password } = req.body;
    const students = readData('students.json');
    const user = students.find((u) => u.email === email);
    if (!user) return res.status(400).send('invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('invalid credentials');
    const token = jwt.sign({ id: user.id, type: 'student' }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).send('error');
  }
});

// ---------- COMPANY LOGIN ----------
app.post('/loginCompany', async (req, res) => {
  try {
    const { email, password } = req.body;
    const companies = readData('companies.json');
    const user = companies.find((u) => u.email === email);
    if (!user) return res.status(400).send('invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send('invalid credentials');
    const token = jwt.sign({ id: user.id, type: 'company' }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).send('error');
  }
});

// ---------- GET STUDENTS ----------
app.get('/students', (req,res)=>{
  const students = readData('students.json');
  // do not send passwords
  students.forEach(s=>{if(s.password)delete s.password;});
  res.json(students);
});

// ---------- GET COMPANIES ----------
app.get('/companies', (req,res)=>{
  const comp = readData('companies.json');
  comp.forEach(c=>{if(c.password)delete c.password;});
  res.json(comp);
});

// ---------- GET INTERESTS ----------
app.get('/interests', (req, res) => {
  const ints = readData('interests.json');
  res.json(ints);
});

// ---------- SHORTLIST / MATCH ----------
app.post('/shortlist', (req,res) => {
  const { studentEmail, scholarshipId } = req.body;
  let matches = [];
  try {
    matches = readData('matches.json');
  } catch(e) {
    matches = [];
  }
  matches.push({ studentEmail, scholarshipId, date: new Date() });
  writeData('matches.json', matches);
  res.send('Shortlisted');
});

// ---------- GET MATCHES ----------
app.get('/matches', (req,res) => {
  const m = readData('matches.json');
  res.json(m);
});

// ---------- CREATE SCHOLARSHIP ----------
app.post("/addScholarship",(req,res)=>{
  try {
    let scholarships = readData('scholarships.json');
    req.body.id = scholarships.length ? scholarships[scholarships.length-1].id + 1 : 1;
    scholarships.push(req.body);
    writeData('scholarships.json', scholarships);
    res.send("Scholarship Added");
  } catch(err) {
    console.error('addScholarship error', err);
    res.status(500).json({ error: 'Error adding scholarship' });
  }
});


// ---------- GET SCHOLARSHIPS ----------
app.get("/scholarships",(req,res)=>{
  try {
    const scholarships = readData('scholarships.json');
    res.json(scholarships);
  } catch(e) {
    console.error('get scholarships error', e);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});


// ---------- INTEREST ----------
app.post("/interested",(req,res)=>{
  try {
    let interests = readData('interests.json');
    interests.push(req.body);
    writeData('interests.json', interests);
    res.send("Interest Saved");
  } catch(e) {
    console.error('interested error', e);
    res.status(500).json({ error: 'Error saving interest' });
  }
});


// ---------- SKILLS ENDPOINTS ----------
// add skill to student
app.post('/student/:email/skills', (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill) return res.status(400).json({ error: 'Skill name required' });

    let students = readData('students.json');
    const student = students.find(s => s.email === req.params.email);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (!student.skills) student.skills = [];
    student.skills.push({ id: Date.now(), name: skill, addedAt: new Date() });
    writeData('students.json', students);
    res.json({ success: true, skill: student.skills[student.skills.length - 1] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// remove skill
app.delete('/student/:email/skills/:skillId', (req, res) => {
  try {
    let students = readData('students.json');
    const student = students.find(s => s.email === req.params.email);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    student.skills = student.skills.filter(s => s.id !== parseInt(req.params.skillId));
    writeData('students.json', students);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- CERTIFICATES ENDPOINTS ----------
// add certificate to student
app.post('/student/:email/certificates', (req, res) => {
  try {
    const { name, url } = req.body;
    if (!name) return res.status(400).json({ error: 'Certificate name required' });

    let students = readData('students.json');
    const student = students.find(s => s.email === req.params.email);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    if (!student.certificates) student.certificates = [];
    student.certificates.push({ id: Date.now(), name, url: url || '', addedAt: new Date() });
    writeData('students.json', students);
    res.json({ success: true, certificate: student.certificates[student.certificates.length - 1] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// remove certificate
app.delete('/student/:email/certificates/:certId', (req, res) => {
  try {
    let students = readData('students.json');
    const student = students.find(s => s.email === req.params.email);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    student.certificates = student.certificates.filter(c => c.id !== parseInt(req.params.certId));
    writeData('students.json', students);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000,()=>{
  console.log("✅ SheScholar Backend Running");
});

// global error handler - ensure errors return JSON instead of HTML pages
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});
