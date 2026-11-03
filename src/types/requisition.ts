export type RequisitionStatus = "Pending" | "Approved" | "Rejected";

export interface RequisitionItem {
  id?: string;
  medicineName: string;
  dosage?: string;
  quantity: number;
  unit: string;
}

export interface RequisitionOrder {
  id: string;
  requestNo: string;
  requestDate: string;
  requestedBy: string;
  position: string;
  department: string;
  items: RequisitionItem[];
  purpose: string;
  remarks: string;
  status: RequisitionStatus;
  approvedBy?: string;
  dateApproved?: string;
  adminRemarks?: string;
  createdAt: string;
}

export interface RequisitionFormData {
  requestedBy: string;
  position: string;
  department: string;
  items: RequisitionItem[];
  purpose: string;
  remarks: string;
}