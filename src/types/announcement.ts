// src/types/announcement.ts

export type Announcement = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  badge?: string;
  linkUrl?: string;
  isActive: boolean;
  createdAt: string;
};

// Represents the shape inside Supabase table
export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  badge: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
};