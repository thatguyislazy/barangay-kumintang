import heroImage from "../assets/images/hero-barangay-hall.png";
import sealLogo from "../assets/logo/barangay-seal.png";

export const barangayConfig = {
  name: "Barangay Kumintang Ilaya",
  shortName: "Kumintang Ilaya",
  municipality: "Batangas City",
  province: "Batangas",
  foundedYear: "1936",
  description:
    "A cloud-based and secured digital platform designed to modernize barangay operations and bring accessible services closer to every resident.",
  mission:
    "To deliver responsive, transparent, and efficient public service to every resident of Barangay Kumintang Ilaya through good governance and community partnership.",
  vision:
    "A safe, progressive, and empowered barangay where every family has access to accessible healthcare, transparent governance, and digital public service.",
  address: "Barangay Hall, Kumintang Ilaya, Batangas City, Batangas, Philippines",
  phone: "(043) 123-4567",
  email: "kumintangilaya.barangay@batangascity.gov.ph",
  officeHours: "Monday – Friday, 8:00 AM – 5:00 PM",
  socials: {
    facebook: "https://facebook.com",
  },
  logo: sealLogo,
  heroImage: heroImage,
  stats: [],
};

export type BarangayConfig = typeof barangayConfig;