import React, { useState, useEffect } from "react";
import { useSupabaseAuth } from "@/lib/SupabaseAuthContext";
import { filesApi, authApi } from "@/api";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Check, UploadCloud } from "lucide-react";
import { initials, displayName } from "@/lib/biz";
import { toast } from "@/components/ui/use-toast";

export default function EditProfile() {
  const { user, checkUserAuth } = useSupabaseAuth();
  const [form, setForm] = useState({ full_name: "", phone: "", photo_url: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Cache-busting version for the profile image. Derived from the user's
  // updated_date so it survives reload/login, and bumped locally on every
  // upload so a freshly uploaded image renders immediately even when the
  // storage URL is reused (browser would otherwise serve stale cached bytes).
  const [photoVersion, setPhotoVersion] = useState(() => (user?.updated_date ? Date.parse(user.updated_date) : Date.now()));

  useEffect(() => {
    setForm({
      full_name: displayName(user),
      phone: user?.phone || "",
      photo_url: user?.photo_url || "",
    });
    setPhotoVersion(user?.updated_date ? Date.parse(user.updated_date) : Date.now());
  }, [user]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const previousUrl = form.photo_url;
    try {
      const file_url = await filesApi.uploadPublic(file);
      set("photo_url", file_url);
      // Bump version so the new bytes render immediately (bypass cached old image).
      setPhotoVersion(Date.now());
    } catch (err) {
      // Keep the previous image on upload failure.
      set("photo_url", previousUrl);
      toast({ title: "Upload failed", description: "Your previous photo was kept. Please try again.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const previousPhoto = user?.photo_url || "";
    const previousName = displayName(user);
    const previousPhone = user?.phone || "";
    try {
      await authApi.updateMe({ display_name: form.full_name, phone: form.phone, photo_url: form.photo_url });
      // Re-fetch the authoritative user record so the UI (and cache-bust
      // version) reflect the server-side state immediately.
      await checkUserAuth();
      setPhotoVersion(Date.now());
      setSaved(true);
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      // On save failure, revert the form to the last-saved values so the UI
      // does not show an unsaved/invalid photo, and keep the previous image.
      setForm({ full_name: previousName, phone: previousPhone, photo_url: previousPhoto });
      setPhotoVersion(user?.updated_date ? Date.parse(user.updated_date) : Date.now());
      toast({ title: "Could not save profile", description: e?.message || "Your previous photo was kept. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle="Edit your personal details" />
      <div className="px-4 pt-4 space-y-4 pb-4">
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-2xl bg-primary/15 flex items-center justify-center text-primary font-bold text-3xl overflow-hidden">
              {form.photo_url ? (
                <img
                  src={`${form.photo_url}${form.photo_url.includes("?") ? "&" : "?"}v=${encodeURIComponent(photoVersion)}`}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                initials(form.full_name) || "?"
              )}
            </div>
            <label className="text-xs text-primary flex items-center gap-1 cursor-pointer">
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3" />}
              {form.photo_url ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} className="bg-background border-border" placeholder="Your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="bg-background border-border" placeholder="01XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted border-border text-muted-foreground" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-12 font-semibold glow-cyan">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <Check className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving…" : saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}