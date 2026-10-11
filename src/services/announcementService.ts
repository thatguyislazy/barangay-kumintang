// src/services/announcementService.ts
import { supabase } from "../supabase/supabase";
import type { Announcement, AnnouncementRow } from "../types/announcement";

function mapRowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url ?? undefined,
    badge: row.badge ?? undefined,
    linkUrl: row.link_url ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export const announcementService = {
  async getAll(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching announcements:", error.message);
      throw error;
    }

    return (data as AnnouncementRow[]).map(mapRowToAnnouncement);
  },

  async getActive(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching active announcements:", error.message);
      throw error;
    }

    return (data as AnnouncementRow[]).map(mapRowToAnnouncement);
  },

  async save(
    announcement: Omit<Announcement, "id" | "createdAt"> & { id?: string }
  ): Promise<Announcement> {
    const payload = {
      title: announcement.title,
      content: announcement.content,
      image_url: announcement.imageUrl || null,
      badge: announcement.badge || null,
      link_url: announcement.linkUrl || null,
      is_active: announcement.isActive,
    };

    if (announcement.id) {
      // Update existing record
      const { data, error } = await supabase
        .from("announcements")
        .update(payload)
        .eq("id", announcement.id)
        .select()
        .single();

      if (error) throw error;
      return mapRowToAnnouncement(data as AnnouncementRow);
    }

    // Insert new record
    const { data, error } = await supabase
      .from("announcements")
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return mapRowToAnnouncement(data as AnnouncementRow);
  },

  async toggleStatus(id: string, currentStatus: boolean): Promise<void> {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};