export interface Contact {
  name: string;
  phone: string;
  role?: string;
}

export interface ServicePlace {
  id: string;
  name: string;
  address: string;
  distance: string;
  distanceKm: number;
  contacts: Contact[];
  type: string;
  speciality?: string;
  timing?: string;
}

export const hospitals: ServicePlace[] = [
  {
    id: "h1",
    name: "KEM Hospital",
    address: "Acharya Donde Marg, Parel, Mumbai - 400012",
    distance: "3.2 km",
    distanceKm: 3.2,
    type: "hospital",
    speciality: "General & Trauma",
    timing: "24 Hours",
    contacts: [
      { name: "Main Reception", phone: "022-24136051", role: "Reception" },
      { name: "Emergency", phone: "022-24136052", role: "Emergency" },
      { name: "Casualty Ward", phone: "022-24136053", role: "Casualty" },
      { name: "Ambulance", phone: "1800-220-100", role: "Ambulance" },
    ],
  },
  {
    id: "h2",
    name: "Lokmanya Tilak Municipal General Hospital",
    address: "Dr. Babasaheb Ambedkar Rd, Sion, Mumbai - 400022",
    distance: "4.1 km",
    distanceKm: 4.1,
    type: "hospital",
    speciality: "Multi-Specialty",
    timing: "24 Hours",
    contacts: [
      { name: "Reception", phone: "022-24076381", role: "Reception" },
      { name: "Emergency", phone: "022-24076382", role: "Emergency" },
      { name: "OPD", phone: "022-24076383", role: "OPD" },
      { name: "Blood Bank", phone: "022-24076384", role: "Blood Bank" },
    ],
  },
  {
    id: "h3",
    name: "Tata Memorial Hospital",
    address: "Dr. E Borges Road, Parel, Mumbai - 400012",
    distance: "3.5 km",
    distanceKm: 3.5,
    type: "hospital",
    speciality: "Cancer Specialty",
    timing: "Mon-Sat 8AM-4PM",
    contacts: [
      { name: "Main", phone: "022-24177000", role: "Main Line" },
      { name: "Emergency", phone: "022-24177001", role: "Emergency" },
      { name: "OPD Appointment", phone: "022-24177002", role: "Appointment" },
      { name: "Pharmacy", phone: "022-24177003", role: "Pharmacy" },
    ],
  },
  {
    id: "h4",
    name: "Hinduja Hospital",
    address: "Veer Savarkar Marg, Mahim, Mumbai - 400016",
    distance: "5.8 km",
    distanceKm: 5.8,
    type: "hospital",
    speciality: "Multi-Specialty Private",
    timing: "24 Hours",
    contacts: [
      { name: "Main", phone: "022-24444444", role: "Main Line" },
      { name: "Emergency", phone: "022-24445555", role: "Emergency" },
      { name: "Ambulance", phone: "022-24446666", role: "Ambulance" },
      { name: "Blood Bank", phone: "022-24447777", role: "Blood Bank" },
    ],
  },
  {
    id: "h5",
    name: "Lilavati Hospital",
    address: "A-791, Bandra Reclamation, Bandra West, Mumbai - 400050",
    distance: "8.2 km",
    distanceKm: 8.2,
    type: "hospital",
    speciality: "Multi-Specialty Private",
    timing: "24 Hours",
    contacts: [
      { name: "Reception", phone: "022-26751000", role: "Reception" },
      { name: "Emergency", phone: "022-26751001", role: "Emergency" },
      { name: "ICU", phone: "022-26751002", role: "ICU" },
      { name: "Ambulance", phone: "022-26751003", role: "Ambulance" },
    ],
  },
  {
    id: "h6",
    name: "Breach Candy Hospital",
    address: "60 Bhulabhai Desai Road, Breach Candy, Mumbai - 400026",
    distance: "6.4 km",
    distanceKm: 6.4,
    type: "hospital",
    speciality: "Multi-Specialty",
    timing: "24 Hours",
    contacts: [
      { name: "Main", phone: "022-23667888", role: "Main Line" },
      { name: "Emergency", phone: "022-23667889", role: "Emergency" },
      { name: "OPD", phone: "022-23667890", role: "OPD" },
      { name: "Ambulance", phone: "022-23667891", role: "Ambulance" },
    ],
  },
  {
    id: "h7",
    name: "Bombay Hospital",
    address: "New Marine Lines, Mumbai - 400020",
    distance: "2.1 km",
    distanceKm: 2.1,
    type: "hospital",
    speciality: "General",
    timing: "24 Hours",
    contacts: [
      { name: "Reception", phone: "022-22067676", role: "Reception" },
      { name: "Emergency", phone: "022-22067677", role: "Emergency" },
      { name: "Specialist", phone: "022-22067678", role: "Specialist" },
      { name: "Pharmacy", phone: "022-22067679", role: "Pharmacy" },
    ],
  },
  {
    id: "h8",
    name: "Jaslok Hospital",
    address: "15 Dr. G. Deshmukh Marg, Pedder Road, Mumbai - 400026",
    distance: "5.3 km",
    distanceKm: 5.3,
    type: "hospital",
    speciality: "Super-Specialty",
    timing: "24 Hours",
    contacts: [
      { name: "Main", phone: "022-66573333", role: "Main Line" },
      { name: "Emergency", phone: "022-66573334", role: "Emergency" },
      { name: "ICU", phone: "022-66573335", role: "ICU" },
      { name: "Ambulance", phone: "022-66573336", role: "Ambulance" },
    ],
  },
];

export const childHospitals: ServicePlace[] = [
  {
    id: "ch1",
    name: "BJ Wadia Hospital for Children",
    address: "Acharya Donde Marg, Parel, Mumbai - 400012",
    distance: "3.3 km",
    distanceKm: 3.3,
    type: "childHospital",
    speciality: "Pediatric Specialty",
    timing: "24 Hours",
    contacts: [
      { name: "Reception", phone: "022-24136051", role: "Reception" },
      { name: "Pediatric Emergency", phone: "022-24136052", role: "Emergency" },
      { name: "NICU", phone: "022-24136053", role: "NICU" },
      { name: "OPD", phone: "022-24136054", role: "OPD" },
    ],
  },
  {
    id: "ch2",
    name: "Hinduja Hospital — Pediatric Dept",
    address: "Veer Savarkar Marg, Mahim, Mumbai - 400016",
    distance: "5.8 km",
    distanceKm: 5.8,
    type: "childHospital",
    speciality: "Child Health",
    timing: "24 Hours",
    contacts: [
      { name: "Pediatric", phone: "022-24444444", role: "Main" },
      { name: "PICU", phone: "022-24445556", role: "PICU" },
      { name: "Emergency", phone: "022-24445555", role: "Emergency" },
      { name: "Neonatal", phone: "022-24445558", role: "Neonatal" },
    ],
  },
  {
    id: "ch3",
    name: "Nanavati Hospital — Child Care",
    address: "S.V. Road, Vile Parle (West), Mumbai - 400056",
    distance: "11.2 km",
    distanceKm: 11.2,
    type: "childHospital",
    speciality: "Pediatric Multi-Specialty",
    timing: "24 Hours",
    contacts: [
      { name: "Reception", phone: "022-26180100", role: "Reception" },
      { name: "Pediatric Emergency", phone: "022-26180101", role: "Emergency" },
      { name: "Appointment", phone: "022-26180102", role: "Appointment" },
      { name: "Pediatric OPD", phone: "022-26180103", role: "OPD" },
    ],
  },
  {
    id: "ch4",
    name: "Surya Children's Medicare",
    address: "Plot 400, Junction of 14th and 16th Road, Khar West, Mumbai",
    distance: "9.1 km",
    distanceKm: 9.1,
    type: "childHospital",
    speciality: "Pediatric Only",
    timing: "Mon-Sat 9AM-8PM",
    contacts: [
      { name: "Main", phone: "022-26050400", role: "Main" },
      { name: "Emergency", phone: "022-26050401", role: "Emergency" },
      { name: "Neonatal Care", phone: "022-26050402", role: "Neonatal" },
      { name: "Vaccination", phone: "022-26050403", role: "Vaccination" },
    ],
  },
];

export const clinics: ServicePlace[] = [
  {
    id: "cl1",
    name: "Dr. Sanjay Gupta Clinic",
    address: "Shop 4, Dadar West, Mumbai - 400028",
    distance: "1.2 km",
    distanceKm: 1.2,
    type: "clinic",
    speciality: "General Physician",
    timing: "Mon-Sat 9AM-1PM, 5PM-9PM",
    contacts: [
      { name: "Reception", phone: "022-24311200", role: "Reception" },
      { name: "Dr. Gupta", phone: "9820123456", role: "Doctor" },
      { name: "Emergency", phone: "9820123457", role: "Emergency" },
      { name: "Appointment", phone: "022-24311201", role: "Appointment" },
    ],
  },
  {
    id: "cl2",
    name: "BMC Urban Health Centre",
    address: "Dharavi, Mumbai - 400017",
    distance: "2.5 km",
    distanceKm: 2.5,
    type: "clinic",
    speciality: "Primary Healthcare",
    timing: "Mon-Sat 8AM-4PM",
    contacts: [
      { name: "Main", phone: "022-24011200", role: "Main" },
      { name: "Doctor On Call", phone: "022-24011201", role: "Doctor" },
      { name: "Vaccination", phone: "022-24011202", role: "Vaccination" },
      { name: "Lab", phone: "022-24011203", role: "Lab" },
    ],
  },
  {
    id: "cl3",
    name: "Apollo Pharmacy & Clinic",
    address: "Bandra West, Mumbai - 400050",
    distance: "7.4 km",
    distanceKm: 7.4,
    type: "clinic",
    speciality: "General + Pharmacy",
    timing: "Daily 8AM-10PM",
    contacts: [
      { name: "Reception", phone: "022-26441000", role: "Reception" },
      { name: "Pharmacy", phone: "022-26441001", role: "Pharmacy" },
      { name: "Doctor", phone: "022-26441002", role: "Doctor" },
      { name: "Lab Report", phone: "022-26441003", role: "Lab" },
    ],
  },
];

export const policeStations: ServicePlace[] = [
  {
    id: "ps1",
    name: "Dadar Police Station",
    address: "Dadar West, Mumbai - 400028",
    distance: "1.5 km",
    distanceKm: 1.5,
    type: "police",
    timing: "24 Hours",
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Station", phone: "022-24166017", role: "Station" },
      { name: "Inspector", phone: "022-24166018", role: "Inspector" },
      { name: "Women Helpline", phone: "1091", role: "Women Cell" },
    ],
  },
  {
    id: "ps2",
    name: "Bandra Police Station",
    address: "Chapel Road, Bandra West, Mumbai - 400050",
    distance: "8.1 km",
    distanceKm: 8.1,
    type: "police",
    timing: "24 Hours",
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Station", phone: "022-26400200", role: "Station" },
      { name: "Crime Branch", phone: "022-26400201", role: "Crime" },
      { name: "Women Cell", phone: "1091", role: "Women Cell" },
    ],
  },
  {
    id: "ps3",
    name: "Dharavi Police Station",
    address: "Dharavi, Mumbai - 400017",
    distance: "2.8 km",
    distanceKm: 2.8,
    type: "police",
    timing: "24 Hours",
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Station", phone: "022-24011777", role: "Station" },
      { name: "Sub-Inspector", phone: "022-24011778", role: "Sub-Inspector" },
      { name: "Helpline", phone: "1091", role: "Helpline" },
    ],
  },
];

export const banks: ServicePlace[] = [
  {
    id: "b1",
    name: "State Bank of India — Dadar Branch",
    address: "Dadar West, Mumbai - 400028",
    distance: "1.1 km",
    distanceKm: 1.1,
    type: "bank",
    timing: "Mon-Fri 10AM-4PM, Sat 10AM-1PM",
    contacts: [
      { name: "Branch", phone: "022-24306100", role: "Branch" },
      { name: "Manager", phone: "022-24306101", role: "Manager" },
      { name: "Helpline", phone: "1800-425-3800", role: "Helpline" },
      { name: "Fraud Helpline", phone: "1930", role: "Fraud" },
    ],
  },
  {
    id: "b2",
    name: "Bank of Maharashtra — Sion",
    address: "Sion East, Mumbai - 400022",
    distance: "4.2 km",
    distanceKm: 4.2,
    type: "bank",
    timing: "Mon-Fri 10AM-4PM, Sat 10AM-1PM",
    contacts: [
      { name: "Branch", phone: "022-24091200", role: "Branch" },
      { name: "Loan Dept", phone: "022-24091201", role: "Loans" },
      { name: "Helpline", phone: "1800-233-4526", role: "Helpline" },
      { name: "Fraud", phone: "1930", role: "Fraud" },
    ],
  },
  {
    id: "b3",
    name: "Canara Bank — Parel",
    address: "Parel, Mumbai - 400012",
    distance: "3.0 km",
    distanceKm: 3.0,
    type: "bank",
    timing: "Mon-Fri 10AM-4PM",
    contacts: [
      { name: "Branch", phone: "022-24120100", role: "Branch" },
      { name: "Manager", phone: "022-24120101", role: "Manager" },
      { name: "Helpline", phone: "1800-425-0018", role: "Helpline" },
      { name: "Fraud", phone: "1930", role: "Fraud" },
    ],
  },
];

export const postOffices: ServicePlace[] = [
  {
    id: "po1",
    name: "Dadar Head Post Office",
    address: "Dadar East, Mumbai - 400014",
    distance: "1.8 km",
    distanceKm: 1.8,
    type: "postOffice",
    timing: "Mon-Sat 9AM-5PM",
    contacts: [
      { name: "Main", phone: "022-24166100", role: "Main" },
      { name: "Speed Post", phone: "022-24166101", role: "Speed Post" },
      { name: "Passport", phone: "022-24166102", role: "Passport" },
      { name: "Helpline", phone: "1800-112-011", role: "Helpline" },
    ],
  },
  {
    id: "po2",
    name: "Sion Post Office",
    address: "Sion West, Mumbai - 400022",
    distance: "4.5 km",
    distanceKm: 4.5,
    type: "postOffice",
    timing: "Mon-Sat 9AM-5PM",
    contacts: [
      { name: "Main", phone: "022-24041200", role: "Main" },
      { name: "Money Order", phone: "022-24041201", role: "Money Order" },
      { name: "Insurance", phone: "022-24041202", role: "Insurance" },
      { name: "Helpline", phone: "1800-112-011", role: "Helpline" },
    ],
  },
];

export const schools: ServicePlace[] = [
  {
    id: "sc1",
    name: "BMC High School — Dadar",
    address: "Dadar West, Mumbai - 400028",
    distance: "0.9 km",
    distanceKm: 0.9,
    type: "school",
    timing: "Mon-Sat 7AM-1PM",
    contacts: [
      { name: "Principal", phone: "022-24312500", role: "Principal" },
      { name: "Office", phone: "022-24312501", role: "Office" },
      { name: "Admission", phone: "022-24312502", role: "Admission" },
      { name: "BMC Education", phone: "022-22694725", role: "BMC" },
    ],
  },
  {
    id: "sc2",
    name: "Dharavi Municipal School",
    address: "Dharavi, Mumbai - 400017",
    distance: "2.7 km",
    distanceKm: 2.7,
    type: "school",
    timing: "Mon-Sat 7AM-12PM",
    contacts: [
      { name: "Principal", phone: "022-24011300", role: "Principal" },
      { name: "Office", phone: "022-24011301", role: "Office" },
      { name: "Mid-Day Meal", phone: "022-24011302", role: "Meal" },
      { name: "BMC Education", phone: "022-22694725", role: "BMC" },
    ],
  },
];

export const shamshanbhumi: ServicePlace[] = [
  {
    id: "sb1",
    name: "Chandanwadi Crematorium",
    address: "Chandanwadi, Marine Lines, Mumbai - 400002",
    distance: "2.3 km",
    distanceKm: 2.3,
    type: "shamshanbhumi",
    timing: "24 Hours",
    contacts: [
      { name: "Office", phone: "022-22622100", role: "Office" },
      { name: "Manager", phone: "022-22622101", role: "Manager" },
      { name: "Booking", phone: "022-22622102", role: "Booking" },
      { name: "BMC", phone: "1916", role: "BMC Helpline" },
    ],
  },
  {
    id: "sb2",
    name: "Shivaji Park Crematorium",
    address: "Shivaji Park, Dadar West, Mumbai - 400028",
    distance: "1.4 km",
    distanceKm: 1.4,
    type: "shamshanbhumi",
    timing: "24 Hours",
    contacts: [
      { name: "Office", phone: "022-24311500", role: "Office" },
      { name: "Booking", phone: "022-24311501", role: "Booking" },
      { name: "Manager", phone: "022-24311502", role: "Manager" },
      { name: "BMC", phone: "1916", role: "BMC Helpline" },
    ],
  },
];

export type ServiceCategory = {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  data: ServicePlace[];
};

export const serviceCategories: ServiceCategory[] = [
  { id: "hospital", label: "Hospitals", icon: "activity", color: "#DC2626", bgColor: "#FEE2E2", data: hospitals },
  { id: "childHospital", label: "Child Hospitals", icon: "heart", color: "#7C3AED", bgColor: "#EDE9FE", data: childHospitals },
  { id: "clinic", label: "Clinics", icon: "plus-circle", color: "#059669", bgColor: "#D1FAE5", data: clinics },
  { id: "police", label: "Police Stations", icon: "shield", color: "#1E40AF", bgColor: "#DBEAFE", data: policeStations },
  { id: "bank", label: "Banks", icon: "credit-card", color: "#D97706", bgColor: "#FEF3C7", data: banks },
  { id: "postOffice", label: "Post Offices", icon: "mail", color: "#0EA5E9", bgColor: "#BAE6FD", data: postOffices },
  { id: "school", label: "Schools", icon: "book-open", color: "#7C3AED", bgColor: "#EDE9FE", data: schools },
  { id: "shamshanbhumi", label: "Crematoriums", icon: "wind", color: "#475569", bgColor: "#F1F5F9", data: shamshanbhumi },
];

export const emergencyContacts = [
  { name: "Police", number: "100", icon: "shield", color: "#1E40AF", bg: "#DBEAFE" },
  { name: "Ambulance", number: "108", icon: "activity", color: "#DC2626", bg: "#FEE2E2" },
  { name: "Fire Brigade", number: "101", icon: "alert-octagon", color: "#EA580C", bg: "#FFEDD5" },
  { name: "Disaster Mgmt", number: "1070", icon: "alert-triangle", color: "#D97706", bg: "#FEF3C7" },
  { name: "Women Helpline", number: "1091", icon: "user", color: "#7C3AED", bg: "#EDE9FE" },
  { name: "Child Helpline", number: "1098", icon: "heart", color: "#059669", bg: "#D1FAE5" },
  { name: "BMC Helpline", number: "1916", icon: "phone", color: "#0EA5E9", bg: "#BAE6FD" },
  { name: "Anti-Corruption", number: "1064", icon: "alert-circle", color: "#DC2626", bg: "#FEE2E2" },
];
