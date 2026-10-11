import { 
  useState, 
  useEffect, 
  useCallback, 
  type ChangeEvent, 
  type FormEvent 
} from "react";
import {
  Megaphone,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { AdminLayout } from "../../components/admin/AdminLayout";
import { announcementService } from "../../services/announcementService";
import type { Announcement } from "../../types/announcement";

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [badge, setBadge] = useState("Community Announcement");
  const [linkUrl, setLinkUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string>("");

  const loadAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await announcementService.getAll();
      setAnnouncements(data);
      setErrorMessage(null);
    } catch (err) {
      console.error("Error loading announcements from Supabase:", err);
      setErrorMessage("Failed to load announcements from the database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please upload an image smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setBadge("Community Announcement");
    setLinkUrl("");
    setImagePreview("");
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      setIsSubmitting(true);
      await announcementService.save({
        title: title.trim(),
        content: content.trim(),
        badge: badge.trim() || "Community Announcement",
        linkUrl: linkUrl.trim() || undefined,
        imageUrl: imagePreview || undefined,
        isActive: true,
      });

      resetForm();
      await loadAnnouncements();
    } catch (err) {
      console.error("Failed to save announcement:", err);
      alert("Failed to save announcement. Please check your Supabase connection and RLS policies.");
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (item: Announcement) => {
    try {
      await announcementService.toggleStatus(item.id, item.isActive);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, isActive: !a.isActive } : a))
      );
    } catch (err) {
      console.error("Failed to toggle status:", err);
      alert("Failed to update status on Supabase.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this announcement?")) return;

    try {
      await announcementService.delete(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      alert("Failed to delete announcement from Supabase.");
    }
  };

  return (
    <AdminLayout 
      title="Announcements & Advisories"
      description="Publish news, alerts, and graphics to the homepage hero banner."
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-900 dark:text-white">
              Announcements & Advisories
            </h1>
            <p className="text-sm text-ink-500 dark:text-white/60">
              Publish news, alerts, and graphics to the homepage hero banner.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-800 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5 hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Announcement
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-2xl border border-navy-100 bg-white/50 dark:border-white/10 dark:bg-navy-900/40">
            <Loader2 className="h-7 w-7 animate-spin text-navy-800 dark:text-white" />
            <span className="text-xs font-medium text-ink-500 dark:text-white/60">
              Loading announcements from Supabase...
            </span>
          </div>
        ) : (
          /* Grid List */
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-navy-900"
              >
                {item.imageUrl ? (
                  <div className="relative h-44 w-full bg-navy-950/10">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-navy-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      {item.badge ? item.badge : "Community Announcement"}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center bg-navy-50 p-4 text-navy-300 dark:bg-white/5 dark:text-white/20">
                    <Megaphone className="h-8 w-8" />
                  </div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between text-xs text-ink-400 dark:text-white/40">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        item.isActive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h3 className="mt-2 font-display text-lg font-bold text-navy-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-ink-600 dark:text-white/70">
                    {item.content}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-navy-100 pt-4 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => handleToggle(item)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 dark:text-white/80 dark:hover:text-white cursor-pointer"
                    >
                      {item.isActive ? (
                        <>
                          <XCircle className="h-4 w-4 text-amber-500" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          Activate
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                      title="Delete announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {announcements.length === 0 && (
              <div className="col-span-full rounded-2xl border border-dashed border-navy-200 p-12 text-center text-ink-500 dark:border-white/10 dark:text-white/40">
                <Megaphone className="mx-auto h-10 w-10 stroke-1" />
                <p className="mt-3 font-medium">No announcements published yet.</p>
                <p className="text-sm">Click &quot;New Announcement&quot; above to add one.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
              onClick={!isSubmitting ? resetForm : undefined}
            />
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-900">
              <h2 className="font-display text-xl font-bold text-navy-900 dark:text-white">
                Create Announcement
              </h2>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Clean-Up Drive Schedule"
                    className="mt-1 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                      Tag / Badge
                    </label>
                    <input
                      type="text"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="e.g. Community Announcement"
                      className="mt-1 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                      Link URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="#services or https://..."
                      className="mt-1 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Content / Details *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Describe the announcement, dates, and instructions..."
                    className="mt-1 w-full rounded-xl border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none focus:border-navy-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-600 dark:text-white/70">
                    Banner Graphic / Photo (Optional)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-navy-300 px-4 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50 dark:border-white/20 dark:text-white/80 dark:hover:bg-white/5">
                      <ImageIcon className="h-4 w-4" />
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => setImagePreview("")}
                        className="text-xs text-rose-500 hover:underline cursor-pointer"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>
                  {imagePreview && (
                    <div className="mt-2 h-28 w-full overflow-hidden rounded-xl border border-navy-100 dark:border-white/10">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2.5 pt-4">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={resetForm}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-600 hover:bg-surface-soft dark:text-white/70 dark:hover:bg-white/10 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-xl bg-navy-800 px-5 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-navy-700 dark:bg-navy-600 dark:hover:bg-navy-500 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSubmitting ? "Publishing..." : "Publish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}