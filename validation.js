// Email validation helper
function validateGmailEmail(email) {
  const gmailRegex = /^[a-zA-Z0-9._%-]+@gmail\.com$/;
  return gmailRegex.test(email);
}

// CGPA validation
function validateCGPA(cgpa) {
  const num = parseFloat(cgpa);
  return !isNaN(num) && num >= 0 && num <= 10;
}

// Family income validation
function validateIncome(income) {
  const num = parseFloat(income);
  return !isNaN(num) && num > 0;
}

// Student registration validation
function validateStudentRegistration(data) {
  const errors = [];

  if (!data.fullName || data.fullName.trim() === '') {
    errors.push('Full Name is required');
  }
  if (!data.email) {
    errors.push('Email is required');
  } else if (!validateGmailEmail(data.email)) {
    errors.push('Only valid @gmail.com email addresses are allowed');
  }
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  if (!data.mobile || data.mobile.trim() === '') {
    errors.push('Mobile Number is required');
  }
  if (!data.dob) {
    errors.push('Date of Birth is required');
  }
  if (!data.educationLevel) {
    errors.push('Education Level is required');
  }
  if (!data.courseName || data.courseName.trim() === '') {
    errors.push('Course Name is required');
  }
  if (!data.collegeName || data.collegeName.trim() === '') {
    errors.push('College Name is required');
  }
  if (!data.marksPercent && data.marksPercent !== '0') {
    errors.push('CGPA is required');
  } else if (!validateCGPA(data.marksPercent)) {
    errors.push('CGPA must be a number between 0 and 10');
  }
  if (!data.yearOfStudy) {
    errors.push('Year of Study is required');
  }
  if (!data.familyIncome) {
    errors.push('Family Annual Income is required');
  } else if (!validateIncome(data.familyIncome)) {
    errors.push('Family Income must be a positive number');
  }
  if (!data.state || data.state.trim() === '') {
    errors.push('State is required');
  }
  // marksheet optional but if provided must be a pdf/jpg/png etc (handled in upload)

  if (!data.district || data.district.trim() === '') {
    errors.push('District is required');
  }
  if (!data.locationType) {
    errors.push('Area Type (Urban/Rural) is required');
  }

  return errors;
}

// Company registration validation
function validateCompanyRegistration(data) {
  const errors = [];

  if (!data.companyName || data.companyName.trim() === '') {
    errors.push('Company Name is required');
  }
  if (!data.email) {
    errors.push('Email is required');
  }
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }
  if (!data.contactPerson || data.contactPerson.trim() === '') {
    errors.push('Contact Person Name is required');
  }
  if (!data.phone || data.phone.trim() === '') {
    errors.push('Phone Number is required');
  }
  if (!data.website || data.website.trim() === '') {
    errors.push('Website URL is required');
  }
  if (!data.registrationNumber || data.registrationNumber.trim() === '') {
    errors.push('Company Registration Number is required');
  }
  if (!data.gst || data.gst.trim() === '') {
    errors.push('GST / Legal ID is required');
  }

  return errors;
}

module.exports = {
  validateGmailEmail,
  validateCGPA,
  validateIncome,
  validateStudentRegistration,
  validateCompanyRegistration,
};
