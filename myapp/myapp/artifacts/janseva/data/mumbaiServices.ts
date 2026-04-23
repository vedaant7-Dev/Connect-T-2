export interface Contact {
  name: string;
  phone: string;
  role?: string;
}

export interface Review {
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
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
  govtType?: "Government" | "Private" | "Municipal" | "Trust";
  established?: number;
  beds?: number;
  bedsOccupied?: number;
  services?: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
}

// ─── HOSPITALS ───────────────────────────────────────────────────────────────

export const hospitals: ServicePlace[] = [
  {
    id: "h1",
    name: "Central Government Hospital",
    address: "Station Area, Near Railway Station, Ambernath – 421501",
    distance: "1.2 km",
    distanceKm: 1.2,
    type: "hospital",
    speciality: "General & Multi-Specialty",
    timing: "24 Hours",
    govtType: "Government",
    established: 1965,
    beds: 250,
    bedsOccupied: 178,
    rating: 3.9,
    reviewCount: 412,
    services: [
      "Emergency & Casualty", "General Medicine", "Surgery", "Orthopedics",
      "Gynecology & Obstetrics", "Pediatrics", "Radiology (X-Ray, USG)",
      "Pathology Lab", "Blood Bank", "Pharmacy",
    ],
    contacts: [
      { name: "Main Reception", phone: "0251-2731100", role: "Reception" },
      { name: "Emergency", phone: "0251-2731101", role: "Emergency" },
      { name: "Casualty Ward", phone: "0251-2731102", role: "Casualty" },
      { name: "Ambulance", phone: "108", role: "Ambulance" },
    ],
    reviews: [
      { reviewer: "Raju Motwani", rating: 4, comment: "Good government facility. Emergency response is fast.", date: "Mar 2024" },
      { reviewer: "Sunita Pawar", rating: 3, comment: "Waiting time is long but doctors are helpful.", date: "Feb 2024" },
      { reviewer: "Harish Thadani", rating: 4, comment: "Free treatment available. Staff cooperative.", date: "Jan 2024" },
    ],
  },
  {
    id: "h2",
    name: "Indira Gandhi Memorial Hospital (AMC)",
    address: "Shivaji Chowk, Ambernath – 421501",
    distance: "2.4 km",
    distanceKm: 2.4,
    type: "hospital",
    speciality: "Multi-Specialty",
    timing: "24 Hours",
    govtType: "Municipal",
    established: 1982,
    beds: 180,
    bedsOccupied: 124,
    rating: 3.7,
    reviewCount: 289,
    services: [
      "Emergency Care", "General Medicine", "Pediatrics", "Gynecology",
      "ENT", "Ophthalmology", "Dental", "Pathology Lab", "Pharmacy",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2731200", role: "Reception" },
      { name: "Emergency", phone: "0251-2731201", role: "Emergency" },
      { name: "OPD", phone: "0251-2731202", role: "OPD" },
      { name: "Blood Bank", phone: "0251-2731203", role: "Blood Bank" },
    ],
    reviews: [
      { reviewer: "Meena Bhatia", rating: 4, comment: "Municipal hospital with free services. Decent facilities.", date: "Apr 2024" },
      { reviewer: "Vinod Makhija", rating: 3, comment: "Staff helpful but infrastructure needs improvement.", date: "Mar 2024" },
      { reviewer: "Pooja Sharma", rating: 4, comment: "Blood bank is well maintained.", date: "Feb 2024" },
    ],
  },
  {
    id: "h3",
    name: "Chhabria Multi-Specialty Hospital",
    address: "Station Area, Station Road, Ambernath – 421501",
    distance: "1.0 km",
    distanceKm: 1.0,
    type: "hospital",
    speciality: "Multi-Specialty Private",
    timing: "24 Hours",
    govtType: "Private",
    established: 1998,
    beds: 120,
    bedsOccupied: 87,
    rating: 4.3,
    reviewCount: 537,
    services: [
      "ICU & Critical Care", "Cardiology", "Neurology", "Orthopedics",
      "Laparoscopic Surgery", "Maternity", "Dialysis", "Physiotherapy",
      "Imaging (CT/MRI)", "Pharmacy",
    ],
    contacts: [
      { name: "Main", phone: "0251-2731300", role: "Main Line" },
      { name: "Emergency", phone: "0251-2731301", role: "Emergency" },
      { name: "Ambulance", phone: "0251-2731302", role: "Ambulance" },
      { name: "Appointment", phone: "0251-2731303", role: "Appointment" },
    ],
    reviews: [
      { reviewer: "Deepak Punjabi", rating: 5, comment: "Best private hospital in Ambernath. Excellent doctors.", date: "Apr 2024" },
      { reviewer: "Rekha Keswani", rating: 4, comment: "Modern equipment and good nursing staff.", date: "Mar 2024" },
      { reviewer: "Ashok Lulla", rating: 4, comment: "ICU is well equipped. Quick response in emergencies.", date: "Jan 2024" },
    ],
  },
  {
    id: "h4",
    name: "Navjivan Hospital",
    address: "MIDC Area, Near MIDC Gate, Ambernath – 421501",
    distance: "2.1 km",
    distanceKm: 2.1,
    type: "hospital",
    speciality: "General",
    timing: "24 Hours",
    govtType: "Private",
    established: 2003,
    beds: 80,
    bedsOccupied: 52,
    rating: 4.1,
    reviewCount: 301,
    services: [
      "Emergency", "General Medicine", "Surgery", "Gynecology",
      "Pediatrics", "Orthopedics", "Lab & Pathology", "Pharmacy",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2731400", role: "Reception" },
      { name: "Emergency", phone: "0251-2731401", role: "Emergency" },
      { name: "Ambulance", phone: "0251-2731402", role: "Ambulance" },
      { name: "OPD", phone: "0251-2731403", role: "OPD" },
    ],
    reviews: [
      { reviewer: "Santosh Thakur", rating: 4, comment: "Affordable and reliable. Good doctors.", date: "Feb 2024" },
      { reviewer: "Asha Makhwani", rating: 4, comment: "Clean facility. Surgery department is good.", date: "Jan 2024" },
      { reviewer: "Ramesh Advani", rating: 4, comment: "Quick admission process in emergencies.", date: "Dec 2023" },
    ],
  },
  {
    id: "h5",
    name: "Horizon Multi-Specialty Hospital",
    address: "Vithalwadi, Near Vithalwadi Station, Ambernath – 421502",
    distance: "3.5 km",
    distanceKm: 3.5,
    type: "hospital",
    speciality: "Super-Specialty",
    timing: "24 Hours",
    govtType: "Private",
    established: 2010,
    beds: 150,
    bedsOccupied: 98,
    rating: 4.5,
    reviewCount: 683,
    services: [
      "Cardiology & Cath Lab", "Neurosurgery", "Oncology", "Joint Replacement",
      "IVF & Fertility", "Neonatology", "NICU", "Advanced Imaging (PET-CT, MRI)",
      "Robotic Surgery", "24x7 Pharmacy",
    ],
    contacts: [
      { name: "Main", phone: "0251-2731500", role: "Main Line" },
      { name: "Emergency", phone: "0251-2731501", role: "Emergency" },
      { name: "ICU", phone: "0251-2731502", role: "ICU" },
      { name: "Ambulance", phone: "0251-2731503", role: "Ambulance" },
    ],
    reviews: [
      { reviewer: "Priya Agarwal", rating: 5, comment: "World-class facility. Excellent cardiac team.", date: "Apr 2024" },
      { reviewer: "Kishore Malhotra", rating: 5, comment: "Best hospital in the region. Saved my father's life.", date: "Mar 2024" },
      { reviewer: "Sunita Choudhary", rating: 4, comment: "IVF treatment was successful. Very professional.", date: "Feb 2024" },
    ],
  },
  {
    id: "h6",
    name: "Life Care Hospital",
    address: "Shivaji Chowk, Gandhi Chowk, Ambernath – 421501",
    distance: "2.8 km",
    distanceKm: 2.8,
    type: "hospital",
    speciality: "General & Maternity",
    timing: "24 Hours",
    govtType: "Private",
    established: 2005,
    beds: 60,
    bedsOccupied: 38,
    rating: 4.0,
    reviewCount: 214,
    services: [
      "Emergency", "Maternity & Delivery", "NICU", "General Medicine",
      "Pediatrics", "Surgery", "Lab", "Pharmacy",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2731600", role: "Reception" },
      { name: "Emergency", phone: "0251-2731601", role: "Emergency" },
      { name: "Maternity", phone: "0251-2731602", role: "Maternity" },
      { name: "Ambulance", phone: "108", role: "Ambulance" },
    ],
    reviews: [
      { reviewer: "Kavita Ramnani", rating: 4, comment: "Excellent maternity care. Doctors very attentive.", date: "Mar 2024" },
      { reviewer: "Neeraj Wadhwa", rating: 4, comment: "Good for delivery and newborn care.", date: "Feb 2024" },
      { reviewer: "Sita Verma", rating: 4, comment: "Clean rooms and caring staff.", date: "Jan 2024" },
    ],
  },
  {
    id: "h7",
    name: "Sai Multi-Specialty Hospital",
    address: "Old Ambernath, Sahakar Nagar Road, Ambernath – 421502",
    distance: "3.8 km",
    distanceKm: 3.8,
    type: "hospital",
    speciality: "Multi-Specialty",
    timing: "24 Hours",
    govtType: "Private",
    established: 2007,
    beds: 100,
    bedsOccupied: 71,
    rating: 4.2,
    reviewCount: 376,
    services: [
      "Emergency", "Cardiology", "Orthopedics", "General Surgery",
      "Urology", "Gastroenterology", "Dialysis", "Imaging", "Pharmacy",
    ],
    contacts: [
      { name: "Main", phone: "0251-2731700", role: "Main Line" },
      { name: "Emergency", phone: "0251-2731701", role: "Emergency" },
      { name: "Ambulance", phone: "0251-2731702", role: "Ambulance" },
      { name: "Appointment", phone: "0251-2731703", role: "Appointment" },
    ],
    reviews: [
      { reviewer: "Mahesh Chandwani", rating: 4, comment: "Good orthopedic department. Hip replacement done well.", date: "Apr 2024" },
      { reviewer: "Neha Balani", rating: 5, comment: "Cardiology team is excellent. Stent done successfully.", date: "Mar 2024" },
      { reviewer: "Vinayak Raut", rating: 4, comment: "Dialysis centre is well managed.", date: "Feb 2024" },
    ],
  },
  {
    id: "h8",
    name: "Vasant General Hospital",
    address: "Station Area, Near Bus Stand, Ambernath – 421501",
    distance: "2.0 km",
    distanceKm: 2.0,
    type: "hospital",
    speciality: "General",
    timing: "Mon-Sat 8AM-10PM, Emergency 24H",
    govtType: "Private",
    established: 2000,
    beds: 50,
    bedsOccupied: 29,
    rating: 3.8,
    reviewCount: 167,
    services: [
      "Emergency", "General Medicine", "Pediatrics", "ENT", "Dental",
      "Gynecology", "Lab", "Pharmacy",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2731800", role: "Reception" },
      { name: "Emergency", phone: "0251-2731801", role: "Emergency" },
      { name: "Doctor On Call", phone: "0251-2731802", role: "Doctor" },
      { name: "Ambulance", phone: "108", role: "Ambulance" },
    ],
    reviews: [
      { reviewer: "Pradeep Nair", rating: 4, comment: "Affordable and clean. Good for routine checkups.", date: "Mar 2024" },
      { reviewer: "Seema Pillai", rating: 3, comment: "Decent facility. ENT department is good.", date: "Jan 2024" },
      { reviewer: "Gopal Menon", rating: 4, comment: "Doctor is very experienced. Quick diagnosis.", date: "Dec 2023" },
    ],
  },
];

// ─── CHILD HOSPITALS ─────────────────────────────────────────────────────────

export const childHospitals: ServicePlace[] = [
  {
    id: "ch1",
    name: "Central Hospital — Pediatric Wing",
    address: "Station Area, Near Railway Station, Ambernath – 421501",
    distance: "1.2 km",
    distanceKm: 1.2,
    type: "childHospital",
    speciality: "Pediatric Specialty",
    timing: "24 Hours",
    govtType: "Government",
    beds: 40,
    bedsOccupied: 27,
    rating: 3.8,
    reviewCount: 201,
    services: [
      "Neonatology (NICU)", "Pediatric Emergency", "Immunization",
      "Child Nutrition", "Pediatric Surgery", "OPD",
    ],
    contacts: [
      { name: "Pediatric Dept", phone: "0251-2731100", role: "Reception" },
      { name: "Emergency", phone: "0251-2731101", role: "Emergency" },
      { name: "NICU", phone: "0251-2731104", role: "NICU" },
      { name: "Vaccination", phone: "0251-2731105", role: "Vaccination" },
    ],
    reviews: [
      { reviewer: "Priya Ramchandani", rating: 4, comment: "NICU staff is excellent. Saved my premature baby.", date: "Apr 2024" },
      { reviewer: "Vishal Thadani", rating: 3, comment: "Good but overcrowded at times.", date: "Feb 2024" },
      { reviewer: "Anita Keswani", rating: 4, comment: "Vaccination programme well organized.", date: "Jan 2024" },
    ],
  },
  {
    id: "ch2",
    name: "Mother & Child Care Centre",
    address: "New Ambernath, Gupte Colony, Ambernath – 421501",
    distance: "2.6 km",
    distanceKm: 2.6,
    type: "childHospital",
    speciality: "Pediatrics & Maternity",
    timing: "24 Hours",
    govtType: "Private",
    beds: 30,
    bedsOccupied: 18,
    rating: 4.2,
    reviewCount: 148,
    services: [
      "NICU", "Pediatric OPD", "Child Vaccination", "Growth Monitoring",
      "Maternity Care", "Newborn Screening",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2732100", role: "Reception" },
      { name: "Emergency", phone: "0251-2732101", role: "Emergency" },
      { name: "NICU", phone: "0251-2732102", role: "NICU" },
      { name: "Appointment", phone: "0251-2732103", role: "Appointment" },
    ],
    reviews: [
      { reviewer: "Deepa Motwani", rating: 5, comment: "Best child care centre in Ambernath. Very dedicated team.", date: "Mar 2024" },
      { reviewer: "Sanjay Lulla", rating: 4, comment: "Doctor is very patient with children.", date: "Feb 2024" },
      { reviewer: "Kavita Advani", rating: 4, comment: "Vaccination schedule maintained properly.", date: "Jan 2024" },
    ],
  },
  {
    id: "ch3",
    name: "Horizon Hospital — Pediatric Dept",
    address: "Vithalwadi, Near Vithalwadi Station, Ambernath – 421502",
    distance: "3.5 km",
    distanceKm: 3.5,
    type: "childHospital",
    speciality: "Pediatric Multi-Specialty",
    timing: "24 Hours",
    govtType: "Private",
    beds: 35,
    bedsOccupied: 22,
    rating: 4.5,
    reviewCount: 278,
    services: [
      "Level III NICU", "Pediatric ICU", "Neonatology", "Pediatric Surgery",
      "Child Neurology", "Developmental Pediatrics", "Vaccination",
    ],
    contacts: [
      { name: "Pediatric", phone: "0251-2731500", role: "Reception" },
      { name: "Emergency", phone: "0251-2731501", role: "Emergency" },
      { name: "PICU", phone: "0251-2731504", role: "PICU" },
      { name: "Neonatal", phone: "0251-2731505", role: "Neonatal" },
    ],
    reviews: [
      { reviewer: "Rekha Punjabi", rating: 5, comment: "Level III NICU saved our premature twins!", date: "Apr 2024" },
      { reviewer: "Mohan Chandiramani", rating: 4, comment: "Pediatric surgery team is excellent.", date: "Mar 2024" },
      { reviewer: "Geeta Shahani", rating: 5, comment: "Best NICU in the area. Very professional team.", date: "Feb 2024" },
    ],
  },
  {
    id: "ch4",
    name: "Navjivan Child Care Centre",
    address: "MIDC Area, Kala Patthar, Ambernath – 421501",
    distance: "2.1 km",
    distanceKm: 2.1,
    type: "childHospital",
    speciality: "General Pediatrics",
    timing: "Mon-Sat 9AM-9PM, Emergency 24H",
    govtType: "Private",
    beds: 20,
    bedsOccupied: 11,
    rating: 4.0,
    reviewCount: 112,
    services: [
      "General Pediatrics OPD", "Child Vaccination", "Nutrition Counseling",
      "Minor Pediatric Surgery", "Newborn Care",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2731400", role: "Reception" },
      { name: "Emergency", phone: "0251-2731401", role: "Emergency" },
      { name: "Appointment", phone: "0251-2731406", role: "Appointment" },
      { name: "Vaccination", phone: "0251-2731407", role: "Vaccination" },
    ],
    reviews: [
      { reviewer: "Sunita Malhotra", rating: 4, comment: "Very gentle with children. Highly recommend.", date: "Feb 2024" },
      { reviewer: "Ramesh Nagpal", rating: 4, comment: "Affordable vaccination packages.", date: "Jan 2024" },
      { reviewer: "Usha Bajaj", rating: 4, comment: "Doctor is very knowledgeable about child health.", date: "Dec 2023" },
    ],
  },
];

// ─── CLINICS ─────────────────────────────────────────────────────────────────

export const clinics: ServicePlace[] = [
  {
    id: "cl1",
    name: "AMC Urban Health Centre – Old Ambernath",
    address: "Old Ambernath, Near Gaon Devi Mandir, Ambernath – 421502",
    distance: "3.8 km",
    distanceKm: 3.8,
    type: "clinic",
    speciality: "Primary Healthcare (Free)",
    timing: "Mon-Sat 8AM-4PM",
    govtType: "Municipal",
    rating: 3.5,
    reviewCount: 98,
    services: [
      "General OPD (Free)", "Vaccination", "Maternal Health",
      "TB Screening", "Malaria Testing", "Basic Lab",
    ],
    contacts: [
      { name: "Main", phone: "0251-2733100", role: "Main" },
      { name: "Doctor On Call", phone: "0251-2733101", role: "Doctor" },
      { name: "Vaccination", phone: "0251-2733102", role: "Vaccination" },
      { name: "AMC Helpline", phone: "1916", role: "Helpline" },
    ],
    reviews: [
      { reviewer: "Balu Pawar", rating: 3, comment: "Free treatment available. Waiting time is long.", date: "Mar 2024" },
      { reviewer: "Shakuntala Devi", rating: 4, comment: "Good for TB screening. Doctors cooperative.", date: "Jan 2024" },
      { reviewer: "Jagdish Nair", rating: 3, comment: "Basic services available at no cost.", date: "Dec 2023" },
    ],
  },
  {
    id: "cl2",
    name: "Dr. Ramesh Gupta's Clinic",
    address: "Station Area, Main Road, Ambernath – 421501",
    distance: "1.0 km",
    distanceKm: 1.0,
    type: "clinic",
    speciality: "General Physician & Diabetologist",
    timing: "Mon-Sat 9AM-1PM, 5PM-9PM",
    govtType: "Private",
    rating: 4.4,
    reviewCount: 342,
    services: [
      "General Medicine OPD", "Diabetes Management", "Hypertension",
      "Thyroid Disorders", "Minor Procedures", "Health Checkups",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2733200", role: "Reception" },
      { name: "Dr. Gupta", phone: "9820567890", role: "Doctor" },
      { name: "Emergency", phone: "9820567891", role: "Emergency" },
      { name: "Appointment", phone: "0251-2733201", role: "Appointment" },
    ],
    reviews: [
      { reviewer: "Kantilal Hiranandani", rating: 5, comment: "Excellent doctor. Very thorough in diagnosis.", date: "Apr 2024" },
      { reviewer: "Meera Motiramani", rating: 4, comment: "Best GP near Station Area. Always available.", date: "Mar 2024" },
      { reviewer: "Govind Chatani", rating: 4, comment: "Diabetes management done very professionally.", date: "Feb 2024" },
    ],
  },
  {
    id: "cl3",
    name: "Nandivali Primary Health Centre",
    address: "Nandivali Road, Near Talao, Ambernath – 421501",
    distance: "4.5 km",
    distanceKm: 4.5,
    type: "clinic",
    speciality: "Primary Healthcare",
    timing: "Mon-Fri 8AM-2PM",
    govtType: "Government",
    rating: 3.4,
    reviewCount: 67,
    services: [
      "General OPD", "Maternal & Child Health", "Family Planning",
      "Immunization", "Nutrition Programme",
    ],
    contacts: [
      { name: "Main", phone: "0251-2733300", role: "Main" },
      { name: "Medical Officer", phone: "0251-2733301", role: "Officer" },
      { name: "Vaccination", phone: "0251-2733302", role: "Vaccination" },
      { name: "State Helpline", phone: "104", role: "Helpline" },
    ],
    reviews: [
      { reviewer: "Seema Parab", rating: 3, comment: "Free services. Limited medicines available.", date: "Feb 2024" },
      { reviewer: "Dinesh Koli", rating: 3, comment: "Good for basic healthcare. Doctor is helpful.", date: "Jan 2024" },
      { reviewer: "Lata Kamble", rating: 4, comment: "Immunization programme is well organized.", date: "Dec 2023" },
    ],
  },
  {
    id: "cl4",
    name: "Apollo Pharmacy & Clinic",
    address: "Station Area, Station Road, Ambernath – 421501",
    distance: "1.3 km",
    distanceKm: 1.3,
    type: "clinic",
    speciality: "General + Pharmacy",
    timing: "Daily 8AM-10PM",
    govtType: "Private",
    rating: 4.2,
    reviewCount: 219,
    services: [
      "Doctor Consultation", "Pharmacy (24/7)", "Lab Tests",
      "Blood Pressure Check", "Sugar Testing", "Health Card",
    ],
    contacts: [
      { name: "Reception", phone: "0251-2733400", role: "Reception" },
      { name: "Pharmacy", phone: "0251-2733401", role: "Pharmacy" },
      { name: "Doctor", phone: "0251-2733402", role: "Doctor" },
      { name: "Lab Reports", phone: "0251-2733403", role: "Lab" },
    ],
    reviews: [
      { reviewer: "Kiran Wadhwani", rating: 4, comment: "Medicines always available. Doctor is good.", date: "Apr 2024" },
      { reviewer: "Rupa Kalwani", rating: 4, comment: "Open till late. Very convenient.", date: "Mar 2024" },
      { reviewer: "Ashish Sadhwani", rating: 4, comment: "Good lab services. Reports on time.", date: "Feb 2024" },
    ],
  },
];

// ─── POLICE STATIONS ─────────────────────────────────────────────────────────

export const policeStations: ServicePlace[] = [
  {
    id: "ps1",
    name: "Ambernath City Police Station",
    address: "Station Area, Near Court, Ambernath – 421501",
    distance: "1.1 km",
    distanceKm: 1.1,
    type: "police",
    timing: "24 Hours",
    govtType: "Government",
    rating: 3.6,
    reviewCount: 187,
    services: [
      "FIR Registration", "Non-Cognizable Complaint", "Missing Person",
      "Traffic Violations", "Cyber Crime", "Women Safety Cell",
    ],
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Station", phone: "0251-2731900", role: "Station" },
      { name: "Inspector", phone: "0251-2731901", role: "Inspector" },
      { name: "Women Helpline", phone: "1091", role: "Women Cell" },
    ],
    reviews: [
      { reviewer: "Suresh Kasab", rating: 4, comment: "FIR process is smooth. Staff cooperative.", date: "Mar 2024" },
      { reviewer: "Lata Bhoir", rating: 3, comment: "Helpful in emergencies. Cyber cell available.", date: "Feb 2024" },
      { reviewer: "Rajan Tiwari", rating: 4, comment: "Women cell very helpful for domestic issues.", date: "Jan 2024" },
    ],
  },
  {
    id: "ps2",
    name: "Shanti Nagar Police Station",
    address: "Vithalwadi, Near Railway Station, Ambernath – 421502",
    distance: "4.2 km",
    distanceKm: 4.2,
    type: "police",
    timing: "24 Hours",
    govtType: "Government",
    rating: 3.5,
    reviewCount: 112,
    services: [
      "FIR Registration", "Patrolling", "Traffic Mgmt",
      "Crime Prevention", "Beat Constable Service",
    ],
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Station", phone: "0251-2732000", role: "Station" },
      { name: "Sub-Inspector", phone: "0251-2732001", role: "Sub-Inspector" },
      { name: "Women Cell", phone: "1091", role: "Women Cell" },
    ],
    reviews: [
      { reviewer: "Mahesh Rane", rating: 3, comment: "Responsive to emergencies in Old Ambernath area.", date: "Feb 2024" },
      { reviewer: "Geeta Sawant", rating: 4, comment: "Constables helpful for small complaints.", date: "Jan 2024" },
      { reviewer: "Tushar Patil", rating: 3, comment: "Average response time but staff is polite.", date: "Dec 2023" },
    ],
  },
  {
    id: "ps3",
    name: "Hill Line Police Station",
    address: "MIDC Area, Hill Line Road, Ambernath – 421501",
    distance: "2.3 km",
    distanceKm: 2.3,
    type: "police",
    timing: "24 Hours",
    govtType: "Government",
    rating: 3.7,
    reviewCount: 134,
    services: [
      "FIR Registration", "Missing Person", "Anti-Theft",
      "Public Order", "Night Patrolling",
    ],
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Station", phone: "0251-2732100", role: "Station" },
      { name: "Crime Branch", phone: "0251-2732101", role: "Crime" },
      { name: "Helpline", phone: "1091", role: "Helpline" },
    ],
    reviews: [
      { reviewer: "Vijay Kosambi", rating: 4, comment: "Good night patrolling in MIDC Area.", date: "Mar 2024" },
      { reviewer: "Anita More", rating: 3, comment: "Helpful but sometimes slow in non-emergency.", date: "Feb 2024" },
      { reviewer: "Pratap Deshpande", rating: 4, comment: "Anti-theft team very active.", date: "Jan 2024" },
    ],
  },
  {
    id: "ps4",
    name: "Manpada Police Outpost",
    address: "Station Road, Near Ganesh Temple, Ambernath – 421501",
    distance: "3.0 km",
    distanceKm: 3.0,
    type: "police",
    timing: "6AM – 10PM (Emergency 24H via 100)",
    govtType: "Government",
    rating: 3.6,
    reviewCount: 78,
    services: [
      "Basic Complaint Registration", "Traffic Control",
      "Public Safety", "Chowki Services",
    ],
    contacts: [
      { name: "Control Room", phone: "100", role: "Emergency" },
      { name: "Outpost", phone: "0251-2732200", role: "Outpost" },
      { name: "Constable", phone: "0251-2732201", role: "Constable" },
      { name: "Women Cell", phone: "1091", role: "Women Cell" },
    ],
    reviews: [
      { reviewer: "Renu Chaudhari", rating: 4, comment: "Accessible outpost. Good for day-to-day issues.", date: "Feb 2024" },
      { reviewer: "Sunil Mhatre", rating: 3, comment: "Only available till 10PM. For 24H call 100.", date: "Jan 2024" },
      { reviewer: "Nanda Koli", rating: 4, comment: "Helpful constable resolved our local dispute.", date: "Dec 2023" },
    ],
  },
];

// ─── BANKS ───────────────────────────────────────────────────────────────────

export const banks: ServicePlace[] = [
  {
    id: "b1",
    name: "State Bank of India — Ambernath Station",
    address: "Station Area, Station Road, Ambernath – 421501",
    distance: "1.0 km",
    distanceKm: 1.0,
    type: "bank",
    timing: "Mon-Fri 10AM-4PM, Sat 10AM-1PM",
    govtType: "Government",
    rating: 3.7,
    reviewCount: 287,
    services: [
      "Savings & Current Accounts", "Home & Personal Loans",
      "Fixed Deposits", "PMJDY Accounts", "ATM", "Internet Banking",
    ],
    contacts: [
      { name: "Branch", phone: "0251-2734100", role: "Branch" },
      { name: "Manager", phone: "0251-2734101", role: "Manager" },
      { name: "Helpline", phone: "1800-425-3800", role: "Helpline" },
      { name: "Fraud Helpline", phone: "1930", role: "Fraud" },
    ],
    reviews: [
      { reviewer: "Chandru Mahbubani", rating: 3, comment: "Government bank. Pension services available.", date: "Mar 2024" },
      { reviewer: "Pushpa Vaswani", rating: 4, comment: "Manager helpful for senior citizen services.", date: "Feb 2024" },
      { reviewer: "Ramesh Gulwani", rating: 4, comment: "Good for PMJDY and government scheme benefits.", date: "Jan 2024" },
    ],
  },
  {
    id: "b2",
    name: "Dombivli Nagari Sahakari Bank — Ambernath",
    address: "Shivaji Chowk, Ambernath – 421501",
    distance: "2.5 km",
    distanceKm: 2.5,
    type: "bank",
    timing: "Mon-Fri 10AM-4PM, Sat 10AM-1PM",
    govtType: "Trust",
    rating: 4.0,
    reviewCount: 198,
    services: [
      "Savings Accounts", "Personal & Business Loans",
      "Fixed & Recurring Deposits", "Locker Facility", "ATM",
    ],
    contacts: [
      { name: "Branch", phone: "0251-2734200", role: "Branch" },
      { name: "Loan Dept", phone: "0251-2734201", role: "Loans" },
      { name: "Helpline", phone: "1800-233-4526", role: "Helpline" },
      { name: "Fraud", phone: "1930", role: "Fraud" },
    ],
    reviews: [
      { reviewer: "Naresh Hingorani", rating: 4, comment: "Local cooperative bank. Easy loan process.", date: "Mar 2024" },
      { reviewer: "Vimla Butani", rating: 4, comment: "FD rates are good. Staff very helpful.", date: "Feb 2024" },
      { reviewer: "Harjit Chawla", rating: 4, comment: "Locker facility available at reasonable cost.", date: "Jan 2024" },
    ],
  },
  {
    id: "b3",
    name: "Bank of Maharashtra — Station Area",
    address: "Station Area, Near Bus Stand, Ambernath – 421501",
    distance: "1.2 km",
    distanceKm: 1.2,
    type: "bank",
    timing: "Mon-Fri 10AM-4PM",
    govtType: "Government",
    rating: 3.6,
    reviewCount: 143,
    services: [
      "Savings & Current Accounts", "Education Loans",
      "Home Loans", "PMJDY", "Kisan Credit Card", "ATM",
    ],
    contacts: [
      { name: "Branch", phone: "0251-2734300", role: "Branch" },
      { name: "Manager", phone: "0251-2734301", role: "Manager" },
      { name: "Helpline", phone: "1800-233-4526", role: "Helpline" },
      { name: "Fraud", phone: "1930", role: "Fraud" },
    ],
    reviews: [
      { reviewer: "Suman Kamble", rating: 3, comment: "Government bank. Long queues but reliable.", date: "Feb 2024" },
      { reviewer: "Vikas Pawar", rating: 4, comment: "Education loan process smooth. Manager helpful.", date: "Jan 2024" },
      { reviewer: "Pramod Chavan", rating: 4, comment: "PMJDY account opened in 10 minutes.", date: "Dec 2023" },
    ],
  },
  {
    id: "b4",
    name: "Thane Bharat Sahakari Bank",
    address: "MIDC Area, Kala Patthar Market, Ambernath – 421501",
    distance: "2.1 km",
    distanceKm: 2.1,
    type: "bank",
    timing: "Mon-Sat 10AM-4PM",
    govtType: "Trust",
    rating: 4.1,
    reviewCount: 167,
    services: [
      "Savings & Business Accounts", "Short-term Loans",
      "Gold Loans", "Insurance", "ATM", "Online Banking",
    ],
    contacts: [
      { name: "Branch", phone: "0251-2734400", role: "Branch" },
      { name: "Gold Loan", phone: "0251-2734401", role: "Gold Loan" },
      { name: "Helpline", phone: "1800-103-4533", role: "Helpline" },
      { name: "Fraud", phone: "1930", role: "Fraud" },
    ],
    reviews: [
      { reviewer: "Bhavna Sindhi", rating: 4, comment: "Gold loan process very fast. Same day disbursement.", date: "Mar 2024" },
      { reviewer: "Santosh Borkar", rating: 4, comment: "Good cooperative bank. Loans at fair interest.", date: "Feb 2024" },
      { reviewer: "Nanda Sonar", rating: 4, comment: "Friendly staff. Saturday banking is convenient.", date: "Jan 2024" },
    ],
  },
];

// ─── POST OFFICES ─────────────────────────────────────────────────────────────

export const postOffices: ServicePlace[] = [
  {
    id: "po1",
    name: "Ambernath Head Post Office",
    address: "Station Area, Near Central School, Ambernath – 421501",
    distance: "1.3 km",
    distanceKm: 1.3,
    type: "postOffice",
    timing: "Mon-Sat 9AM-5PM",
    govtType: "Government",
    rating: 3.6,
    reviewCount: 112,
    services: [
      "Speed Post", "Registered Post", "Passport (PSK Lite)",
      "PLI/RPLI Insurance", "Savings Account", "Money Order",
    ],
    contacts: [
      { name: "Main", phone: "0251-2735100", role: "Main" },
      { name: "Speed Post", phone: "0251-2735101", role: "Speed Post" },
      { name: "Passport", phone: "0251-2735102", role: "Passport" },
      { name: "Helpline", phone: "1800-112-011", role: "Helpline" },
    ],
    reviews: [
      { reviewer: "Pratibha More", rating: 3, comment: "Passport service now available. Very helpful.", date: "Mar 2024" },
      { reviewer: "Sanjay Meshram", rating: 4, comment: "Speed post reliable. Tracking works well.", date: "Feb 2024" },
      { reviewer: "Yamini Jadhav", rating: 3, comment: "Savings accounts available at good interest.", date: "Jan 2024" },
    ],
  },
  {
    id: "po2",
    name: "Ambernath Old Ambernath Post Office",
    address: "Old Ambernath, Sahakar Nagar, Ambernath – 421502",
    distance: "3.9 km",
    distanceKm: 3.9,
    type: "postOffice",
    timing: "Mon-Sat 9AM-3PM",
    govtType: "Government",
    rating: 3.4,
    reviewCount: 67,
    services: [
      "Post & Letters", "Money Order", "PLI Insurance", "Savings Account",
    ],
    contacts: [
      { name: "Main", phone: "0251-2735200", role: "Main" },
      { name: "Postmaster", phone: "0251-2735201", role: "Postmaster" },
      { name: "Money Order", phone: "0251-2735202", role: "Money Order" },
      { name: "Helpline", phone: "1800-112-011", role: "Helpline" },
    ],
    reviews: [
      { reviewer: "Mangesh Gholap", rating: 3, comment: "Small post office but useful for basic services.", date: "Feb 2024" },
      { reviewer: "Kamal Randev", rating: 3, comment: "Money order service works fine.", date: "Jan 2024" },
      { reviewer: "Sita Mane", rating: 4, comment: "Staff polite and helpful.", date: "Dec 2023" },
    ],
  },
  {
    id: "po3",
    name: "Ambernath MIDC Area Post Office",
    address: "MIDC Area, Kala Patthar, Ambernath – 421501",
    distance: "2.2 km",
    distanceKm: 2.2,
    type: "postOffice",
    timing: "Mon-Sat 9AM-3PM",
    govtType: "Government",
    rating: 3.5,
    reviewCount: 54,
    services: [
      "Post & Parcels", "Money Order", "Savings Account",
    ],
    contacts: [
      { name: "Main", phone: "0251-2735300", role: "Main" },
      { name: "Postmaster", phone: "0251-2735301", role: "Postmaster" },
      { name: "Insurance", phone: "0251-2735302", role: "Insurance" },
      { name: "Helpline", phone: "1800-112-011", role: "Helpline" },
    ],
    reviews: [
      { reviewer: "Deepak Rane", rating: 3, comment: "Small but functional. Good for sending parcels.", date: "Jan 2024" },
      { reviewer: "Meena Salve", rating: 4, comment: "Staff is friendly.", date: "Dec 2023" },
      { reviewer: "Ashok Mahale", rating: 3, comment: "Basic post office services available.", date: "Nov 2023" },
    ],
  },
];

// ─── SCHOOLS ─────────────────────────────────────────────────────────────────

export const schools: ServicePlace[] = [
  {
    id: "sc1",
    name: "MNCS High School — Ambernath",
    address: "Station Area, Near Vithal Mandir, Ambernath – 421501",
    distance: "1.1 km",
    distanceKm: 1.1,
    type: "school",
    timing: "Mon-Sat 7:30AM-1:30PM",
    govtType: "Municipal",
    rating: 3.8,
    reviewCount: 243,
    services: [
      "Primary (1st–7th Std)", "Secondary (8th–10th Std)",
      "SSC Board", "Mid-Day Meal", "Sports", "Library",
    ],
    contacts: [
      { name: "Principal", phone: "0251-2736100", role: "Principal" },
      { name: "Office", phone: "0251-2736101", role: "Office" },
      { name: "Admission", phone: "0251-2736102", role: "Admission" },
      { name: "AMC Education", phone: "0251-2731000", role: "AMC" },
    ],
    reviews: [
      { reviewer: "Manisha Pawar", rating: 4, comment: "Good SSC results every year. Dedicated teachers.", date: "Apr 2024" },
      { reviewer: "Dhananjay Gaikwad", rating: 3, comment: "Affordable. Mid-day meal programme is good.", date: "Feb 2024" },
      { reviewer: "Sushma Bhosale", rating: 4, comment: "Sports facilities are decent.", date: "Jan 2024" },
    ],
  },
  {
    id: "sc2",
    name: "Balaji International School",
    address: "Vithalwadi, Millennium Park, Ambernath – 421502",
    distance: "3.6 km",
    distanceKm: 3.6,
    type: "school",
    timing: "Mon-Sat 7AM-2PM",
    govtType: "Private",
    rating: 4.4,
    reviewCount: 387,
    services: [
      "CBSE Curriculum (LKG–12th)", "Science & Commerce Streams",
      "Computer Lab", "Smart Classes", "Sports Complex",
      "Extracurricular Activities", "School Bus",
    ],
    contacts: [
      { name: "Principal", phone: "0251-2736200", role: "Principal" },
      { name: "Office", phone: "0251-2736201", role: "Office" },
      { name: "Admission", phone: "0251-2736202", role: "Admission" },
      { name: "Bus Enquiry", phone: "0251-2736203", role: "Bus" },
    ],
    reviews: [
      { reviewer: "Reena Khatri", rating: 5, comment: "Best CBSE school in Ambernath. Excellent faculty.", date: "Apr 2024" },
      { reviewer: "Suresh Malhotra", rating: 4, comment: "Smart classes and labs are very modern.", date: "Mar 2024" },
      { reviewer: "Kavita Surana", rating: 4, comment: "Good extracurricular programme. My child loves it.", date: "Feb 2024" },
    ],
  },
  {
    id: "sc3",
    name: "St. Anne's High School",
    address: "Shivaji Chowk, Bapuji Nagar, Ambernath – 421501",
    distance: "2.7 km",
    distanceKm: 2.7,
    type: "school",
    timing: "Mon-Sat 7:30AM-1:30PM",
    govtType: "Trust",
    rating: 4.2,
    reviewCount: 312,
    services: [
      "English Medium SSC (1st–10th)", "Science Lab",
      "Computer Lab", "Library", "Sports Ground",
    ],
    contacts: [
      { name: "Principal", phone: "0251-2736300", role: "Principal" },
      { name: "Office", phone: "0251-2736301", role: "Office" },
      { name: "Admission", phone: "0251-2736302", role: "Admission" },
      { name: "Diocese", phone: "0251-2736303", role: "Diocese" },
    ],
    reviews: [
      { reviewer: "Priya Fernandes", rating: 4, comment: "Great discipline and quality education.", date: "Mar 2024" },
      { reviewer: "John D'Souza", rating: 5, comment: "Best English medium school in Shivaji Chowk area.", date: "Feb 2024" },
      { reviewer: "Rita Rodrigues", rating: 4, comment: "Good values and academic excellence.", date: "Jan 2024" },
    ],
  },
  {
    id: "sc4",
    name: "Dr. Ambedkar Municipal School",
    address: "Old Ambernath, Ambedkar Nagar, Ambernath – 421502",
    distance: "4.0 km",
    distanceKm: 4.0,
    type: "school",
    timing: "Mon-Sat 7AM-1PM",
    govtType: "Municipal",
    rating: 3.5,
    reviewCount: 156,
    services: [
      "Primary to Secondary (1st–10th)", "Free Education",
      "Scholarship Programme", "Mid-Day Meal", "Free Uniforms & Books",
    ],
    contacts: [
      { name: "Principal", phone: "0251-2736400", role: "Principal" },
      { name: "Office", phone: "0251-2736401", role: "Office" },
      { name: "Scholarship", phone: "0251-2736402", role: "Scholarship" },
      { name: "AMC Education", phone: "0251-2731000", role: "AMC" },
    ],
    reviews: [
      { reviewer: "Rajesh Kamble", rating: 3, comment: "Free education with meals. Teachers are dedicated.", date: "Mar 2024" },
      { reviewer: "Sunita Jagtap", rating: 4, comment: "Good scholarship support for students.", date: "Feb 2024" },
      { reviewer: "Hari Thorat", rating: 3, comment: "Affordable option with government benefits.", date: "Jan 2024" },
    ],
  },
];

// ─── SHAMSHANBHUMI ───────────────────────────────────────────────────────────

export const shamshanbhumi: ServicePlace[] = [
  {
    id: "sb1",
    name: "AMC Municipal Crematorium — Station Area",
    address: "Station Area, Behind Municipal Ground, Ambernath – 421501",
    distance: "1.5 km",
    distanceKm: 1.5,
    type: "shamshanbhumi",
    timing: "24 Hours",
    govtType: "Municipal",
    rating: 3.5,
    reviewCount: 48,
    services: [
      "Electric Cremation", "Wood Pyre Cremation",
      "Cold Storage (48 hrs)", "Purohit Arrangement", "Flower Arrangement",
    ],
    contacts: [
      { name: "Office", phone: "0251-2737100", role: "Office" },
      { name: "Manager", phone: "0251-2737101", role: "Manager" },
      { name: "Booking", phone: "0251-2737102", role: "Booking" },
      { name: "AMC", phone: "1916", role: "AMC Helpline" },
    ],
    reviews: [
      { reviewer: "Ramesh Parab", rating: 3, comment: "Municipal facility. Electric cremation available.", date: "Mar 2024" },
      { reviewer: "Savita More", rating: 4, comment: "Staff respectful and cooperative during difficult time.", date: "Jan 2024" },
      { reviewer: "Vinod Chavan", rating: 3, comment: "Basic facilities. Booking is smooth.", date: "Dec 2023" },
    ],
  },
  {
    id: "sb2",
    name: "Shiv Smashanbhumi — Shivaji Chowk",
    address: "Shivaji Chowk, Near Shiv Mandir, Ambernath – 421501",
    distance: "2.9 km",
    distanceKm: 2.9,
    type: "shamshanbhumi",
    timing: "24 Hours",
    govtType: "Trust",
    rating: 3.7,
    reviewCount: 36,
    services: [
      "Hindu Cremation Rituals", "Wood & Electric Pyre",
      "Priest Arrangement", "Last Rites Support",
    ],
    contacts: [
      { name: "Office", phone: "0251-2737200", role: "Office" },
      { name: "Trustee", phone: "0251-2737201", role: "Trustee" },
      { name: "Booking", phone: "0251-2737202", role: "Booking" },
      { name: "AMC", phone: "1916", role: "AMC Helpline" },
    ],
    reviews: [
      { reviewer: "Ashok Bhosale", rating: 4, comment: "Trust managed facility. Clean and well maintained.", date: "Feb 2024" },
      { reviewer: "Shantabai Desai", rating: 3, comment: "Priest arrangement is helpful.", date: "Jan 2024" },
      { reviewer: "Yashwant Gaikwad", rating: 4, comment: "Dignified facility. Staff very respectful.", date: "Dec 2023" },
    ],
  },
];

// ─── CATEGORY MAP ─────────────────────────────────────────────────────────────

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
  { id: "childHospital", label: "Child Care", icon: "heart", color: "#7C3AED", bgColor: "#EDE9FE", data: childHospitals },
  { id: "clinic", label: "Clinics", icon: "plus-circle", color: "#059669", bgColor: "#D1FAE5", data: clinics },
  { id: "police", label: "Police", icon: "shield", color: "#1E40AF", bgColor: "#DBEAFE", data: policeStations },
  { id: "bank", label: "Banks", icon: "credit-card", color: "#D97706", bgColor: "#FEF3C7", data: banks },
  { id: "postOffice", label: "Post Office", icon: "mail", color: "#0EA5E9", bgColor: "#BAE6FD", data: postOffices },
  { id: "school", label: "Schools", icon: "book-open", color: "#7C3AED", bgColor: "#EDE9FE", data: schools },
  { id: "shamshanbhumi", label: "Crematorium", icon: "wind", color: "#475569", bgColor: "#F1F5F9", data: shamshanbhumi },
];

// ─── EMERGENCY CONTACTS (ULHASNAGAR) ─────────────────────────────────────────

export const emergencyContacts = [
  { name: "Police", number: "100", icon: "shield", color: "#1E40AF", bg: "#DBEAFE" },
  { name: "Ambulance", number: "108", icon: "activity", color: "#DC2626", bg: "#FEE2E2" },
  { name: "Fire Brigade", number: "101", icon: "alert-octagon", color: "#EA580C", bg: "#FFEDD5" },
  { name: "Disaster Mgmt", number: "1070", icon: "alert-triangle", color: "#D97706", bg: "#FEF3C7" },
  { name: "Women Helpline", number: "1091", icon: "user", color: "#7C3AED", bg: "#EDE9FE" },
  { name: "Child Helpline", number: "1098", icon: "heart", color: "#059669", bg: "#D1FAE5" },
  { name: "AMC Helpline", number: "1916", icon: "phone", color: "#0EA5E9", bg: "#BAE6FD" },
  { name: "Anti-Corruption", number: "1064", icon: "alert-circle", color: "#DC2626", bg: "#FEE2E2" },
];

// ─── ULHASNAGAR WARDS (for registration) ─────────────────────────────────────

export const ambernathWards = Array.from({ length: 29 }, (_, i) => `Ward ${i + 1}`);

export const ulhasnagarWards = ambernathWards;
