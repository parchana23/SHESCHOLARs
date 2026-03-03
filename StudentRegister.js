import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../services/platformStore";

const EDUCATION_LEVELS = [
  "Class 12",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
  "Doctorate",
];

const COURSES_BY_EDUCATION = {
  "Class 12": ["Science", "Commerce", "Arts", "Vocational"],
  Diploma: ["Computer Engineering", "Mechanical", "Civil", "Electronics", "Design"],
  Undergraduate: ["B.Tech", "BCA", "B.Sc", "B.Com", "BA", "BBA", "B.Des", "B.Pharm"],
  Postgraduate: ["M.Tech", "MCA", "M.Sc", "MBA", "MA", "M.Com", "M.Des"],
  Doctorate: ["PhD Engineering", "PhD Sciences", "PhD Humanities", "PhD Management"],
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

const CITIES_BY_STATE = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat"],
  Assam: ["Guwahati", "Silchar", "Dibrugarh"],
  Bihar: ["Patna", "Gaya", "Muzaffarpur"],
  Chhattisgarh: ["Raipur", "Bilaspur", "Durg"],
  Goa: ["Panaji", "Margao", "Vasco da Gama"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  Haryana: ["Gurugram", "Faridabad", "Panipat"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan"],
  Jharkhand: ["Ranchi", "Jamshedpur", "Dhanbad"],
  Karnataka: ["Bengaluru", "Mysuru", "Mangaluru"],
  Kerala: ["Thiruvananthapuram", "Kochi", "Kozhikode"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Gwalior"],
  Maharashtra: ["Mumbai", "Pune", "Nagpur"],
  Manipur: ["Imphal", "Thoubal", "Bishnupur"],
  Meghalaya: ["Shillong", "Tura", "Nongpoh"],
  Mizoram: ["Aizawl", "Lunglei", "Champhai"],
  Nagaland: ["Kohima", "Dimapur", "Mokokchung"],
  Odisha: ["Bhubaneswar", "Cuttack", "Rourkela"],
  Punjab: ["Ludhiana", "Amritsar", "Jalandhar"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur"],
  Sikkim: ["Gangtok", "Namchi", "Gyalshing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  Telangana: ["Hyderabad", "Warangal", "Nizamabad"],
  Tripura: ["Agartala", "Dharmanagar", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida"],
  Uttarakhand: ["Dehradun", "Haridwar", "Haldwani"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  Chandigarh: ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  Delhi: ["New Delhi", "Dwarka", "Rohini"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"],
  Ladakh: ["Leh", "Kargil"],
  Lakshadweep: ["Kavaratti"],
  Puducherry: ["Puducherry", "Karaikal"],
};

function StudentRegister() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    educationLevel: "",
    institution: "",
    course: "",
    academicScore: "",
    incomeRange: "",
    state: "",
    district: "",
    technicalSkills: "",
    softSkills: "",
    certifications: "",
    interests: "",
    careerGoals: "",
  });
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const availableCourses = COURSES_BY_EDUCATION[form.educationLevel] || [];
  const availableCities = CITIES_BY_STATE[form.state] || [];

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      profile: {
        educationLevel: form.educationLevel,
        institution: form.institution,
        course: form.course,
        academicScore: Number(form.academicScore),
        incomeRange: Number(form.incomeRange),
        state: form.state,
        district: form.district,
        technicalSkills: form.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean),
        softSkills: form.softSkills.split(",").map((s) => s.trim()).filter(Boolean),
        certifications: form.certifications.split(",").map((s) => s.trim()).filter(Boolean),
        interests: form.interests.split(",").map((s) => s.trim()).filter(Boolean),
        careerGoals: form.careerGoals,
      },
    };

    const result = registerUser("student", payload);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <section className="page auth-page">
      <article className="auth-card wide">
        <h2>Student Registration</h2>
        <p>Create your academic, socioeconomic and skill profile for AI recommendations.</p>

        <form onSubmit={handleSubmit} className="form-grid two-col">
          <input placeholder="Full Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input type="email" placeholder="Email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <input type="password" placeholder="Password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <input placeholder="Phone Number" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <select
            required
            value={form.educationLevel}
            onChange={(event) => setForm({ ...form, educationLevel: event.target.value, course: "" })}
          >
            <option value="">Select Education Level</option>
            {EDUCATION_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <input placeholder="Institution" required value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} />
          <select
            required
            value={form.course}
            onChange={(event) => setForm({ ...form, course: event.target.value })}
            disabled={!form.educationLevel}
          >
            <option value="">{form.educationLevel ? "Select Course" : "Select Education Level first"}</option>
            {availableCourses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          <input type="number" placeholder="Academic Score (0-100)" required value={form.academicScore} onChange={(event) => setForm({ ...form, academicScore: event.target.value })} />
          <input type="number" placeholder="Annual Income (INR)" required value={form.incomeRange} onChange={(event) => setForm({ ...form, incomeRange: event.target.value })} />
          <select
            required
            value={form.state}
            onChange={(event) => setForm({ ...form, state: event.target.value, district: "" })}
          >
            <option value="">Select State</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <select
            required
            value={form.district}
            onChange={(event) => setForm({ ...form, district: event.target.value })}
            disabled={!form.state}
          >
            <option value="">{form.state ? "Select City" : "Select State first"}</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          <input placeholder="Technical skills (comma separated)" value={form.technicalSkills} onChange={(event) => setForm({ ...form, technicalSkills: event.target.value })} />
          <input placeholder="Soft skills (comma separated)" value={form.softSkills} onChange={(event) => setForm({ ...form, softSkills: event.target.value })} />
          <input placeholder="Certifications (comma separated)" value={form.certifications} onChange={(event) => setForm({ ...form, certifications: event.target.value })} />
          <input placeholder="Interests (comma separated)" value={form.interests} onChange={(event) => setForm({ ...form, interests: event.target.value })} />
          <textarea placeholder="Career Goals" value={form.careerGoals} onChange={(event) => setForm({ ...form, careerGoals: event.target.value })} />
          <button type="submit" className="btn primary-btn">Create Student Account</button>
        </form>

        {message && <p className="status-text">{message}</p>}
        <p>Already have an account? <Link to="/student/login">Login</Link></p>
      </article>
    </section>
  );
}

export default StudentRegister;
