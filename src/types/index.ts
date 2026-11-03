export type UserRole = "OWNER" | "ADMIN" | "STAFF_INPUT" | "VIEWER";

export type JobStatus =
  | "PENDING"
  | "DIJADWALKAN"
  | "DALAM_PENGERJAAN"
  | "SELESAI"
  | "DIBATALKAN";

export type PhotoType = "BEFORE" | "AFTER";

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
  status: JobStatus;
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
