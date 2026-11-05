export type UserRole = "OWNER" | "ADMIN" | "STAFF_INPUT" | "VIEWER";

export type JobStatus =
  | "MENUNGGU_DISPOSISI"
  | "DIDISPOSISIKAN"
  | "MENUJU_LOKASI"
  | "TIBA_DI_LOKASI"
  | "DALAM_PENGERJAAN"
  | "MENUNGGU_VALIDASI"
  | "SELESAI"
  | "DIBATALKAN"
  | "PENDING"
  | "DIJADWALKAN";

export type PhotoType = "CHECKIN" | "BEFORE" | "AFTER";

export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: UserRole;
  phone?: string | null;
}

export interface CustomerData {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes?: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface ServiceData {
  id: number;
  name: string;
  category: string;
  defaultPrice: number;
  isActive: boolean;
}

export interface JobPhotoData {
  id: string;
  jobId: string;
  photoType: PhotoType;
  filePath: string;
  fileName: string;
  fileSize?: number | null;
  caption?: string | null;
  uploadedById: string;
  uploadedBy?: {
    name: string;
  };
  createdAt: string;
}

export interface JobData {
  id: string;
  jobNumber: string;
  customerId: string;
  customer: CustomerData;
  serviceId: number;
  service: ServiceData;
  jobDetails?: string | null;
  scheduledDate: string;
  scheduledTime?: string | null;
  technicianName?: string | null;
  basePrice: number;
  extraFee: number;
  discount: number;
  totalPrice: number;
  technicianCommission: number;
  commissionStatus: "UNPAID" | "PAID";
  commissionPaidAt?: string | null;
  commissionPaymentMethod?: string | null;
  commissionProofPath?: string | null;
  commissionNotes?: string | null;
  status: JobStatus;
  isPool: boolean;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    name: string;
    username: string;
    phone?: string | null;
  } | null;
  checkinAt?: string | null;
  checkinNotes?: string | null;
  validatedAt?: string | null;
  validatedById?: string | null;
  validatedBy?: {
    id: string;
    name: string;
  } | null;
  notes?: string | null;
  createdById: string;
  createdBy: {
    id: string;
    name: string;
    username: string;
  };
  updatedById?: string | null;
  updatedBy?: {
    id: string;
    name: string;
  } | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  photos?: JobPhotoData[];
}

export interface PayrollSlipData {
  id: string;
  slipNumber: string;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    username: string;
    phone?: string | null;
  } | null;
  employeeName: string;
  employeeRole: string;
  month: number;
  year: number;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  jobCommission: number;
  allowance: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentStatus: PayrollStatus;
  paymentDate?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseData {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  receiptUrl?: string | null;
  notes?: string | null;
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CashflowSummary {
  totalRevenue: number;
  totalExpense: number;
  monthlySalesCount: number;
  currentBalance: number;
  sevenDaysTrend: {
    date: string;
    dayName: string;
    income: number;
    expense: number;
  }[];
}
