export interface Supplier {
  id: string; // e.g. "SUP-101"
  name: string; // Contact Person / Manager
  companyName: string; // Registered Business / Enterprise Name
  phone: string;
  email: string;
  city: 'Gondar' | 'Bahir Dar' | 'Addis Ababa';
  category: string; // e.g. "Grains & Teff", "Specialty Coffee", "Edible Oils", "Honey & Dairy"
  tinNumber: string; // Ethiopian Tax Identification Number
  address: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  productCount: number;
  registeredAt: string;
  bankAccount?: {
    bankName: string;
    accountNumber: string;
  };
}
