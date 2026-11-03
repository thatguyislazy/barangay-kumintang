import { supabase } from "../supabase/supabase";
import type { RequisitionOrder, RequisitionFormData } from "../types/requisition";

function mapRowToRequisition(row: any): RequisitionOrder {
  return {
    id: String(row.id),
    requestNo: row.request_no || `MPR-2026-${String(row.id).slice(-3)}`,
    requestDate: row.request_date || new Date().toISOString().split("T")[0],
    requestedBy: row.requested_by || "Barangay Health Worker",
    position: row.position || "Barangay Health Worker",
    department: row.department || "Health Center",
    items: row.items || [],
    purpose: row.purpose || "",
    remarks: row.remarks || "",
    status: row.status || "Pending",
    approvedBy: row.approved_by || undefined,
    dateApproved: row.date_approved || undefined,
    adminRemarks: row.admin_remarks || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export const requisitionService = {
  async list(): Promise<RequisitionOrder[]> {
    const { data, error } = await supabase
      .from("medicine_requisitions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requisitions:", error.message);
      return [];
    }

    return (data || []).map(mapRowToRequisition);
  },

  async create(formData: RequisitionFormData): Promise<RequisitionOrder> {
    const requestNo = `MPR-2026-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split("T")[0];

    const payload = {
      request_no: requestNo,
      request_date: today,
      requested_by: formData.requestedBy,
      position: formData.position,
      department: formData.department,
      items: formData.items,
      purpose: formData.purpose,
      remarks: formData.remarks,
      status: "Pending",
    };

    const { data, error } = await supabase
      .from("medicine_requisitions")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("Error creating requisition:", error.message);
      throw error;
    }

    return mapRowToRequisition(data);
  },

  async updateStatus(id: string, status: "Approved" | "Rejected", adminRemarks?: string): Promise<RequisitionOrder> {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("medicine_requisitions")
      .update({
        status,
        date_approved: today,
        admin_remarks: adminRemarks || null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating requisition status:", error.message);
      throw error;
    }

    return mapRowToRequisition(data);
  },
};