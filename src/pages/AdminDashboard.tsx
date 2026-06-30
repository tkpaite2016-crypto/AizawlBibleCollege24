import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Bell, BookOpen, Image, FileText,
  Plus, Trash2, CreditCard as EditIcon, Check, X, AlertCircle,
  MessageSquare, Upload, Loader, Mail, GraduationCap, Award,
  ShieldCheck, UserCheck, AlertTriangle, Pencil, Download,
  CreditCard, Settings, Save, Ban, Shield, Palette, Search,
  ExternalLink, Eye, EyeOff, Link as LinkIcon,
} from 'lucide-react';
import { supabase, Profile, Notice, Teacher, SiteSetting, ContactMessage, Download as DownloadType, Photo } from '../lib/supabase';
import { THEMES } from '../lib/themes';
import { useAuth } from '../contexts/AuthContext';
import { CertificateDocument } from '../components/CertificateDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';

type Tab = 'overview' | 'users' | 'students' | 'graduated' | 'faculty' | 'admins' | 'notices' | 'teachers' | 'applications' | 'downloads' | 'gallery' | 'settings' | 'payment' | 'messages';

type GraduationForm = {
  userId: string;
  userName: string;
  course: string;
  completionDate: string;
  pataRegNo: string;
};

type ConfirmConfig = {
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-serif font-bold text-navy-900">{value}</p>
        <p className="text-slate-500 text-sm">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { profile: adminProfile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<DownloadType[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSetting[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    total_users: 0, total_students: 0, total_admins: 0, total_faculty: 0,
    total_finance: 0, total_graduated: 0, total_banned: 0,
    pending_applications: 0, unread_messages: 0,
  });

  // Role-based themes
  const [roleThemes, setRoleThemes] = useState({
    theme_role_admin: 'royal-gold',
    theme_role_faculty: 'emerald',
    theme_role_student: 'classic',
    theme_role_standard: 'classic',
    theme_role_finance: 'sterling',
    theme_graduated: 'crimson',
    theme_banned: 'restricted',
  });
  const [roleThemesSaving, setRoleThemesSaving] = useState(false);
  const [roleThemesSaveSuccess, setRoleThemesSaveSuccess] = useState(false);

  // Transaction visibility
  const [showTransactionsPublic, setShowTransactionsPublic] = useState(false);
  const [transactionVisibilitySaving, setTransactionVisibilitySaving] = useState(false);

  // Graduated tab search
  const [graduatedSearch, setGraduatedSearch] = useState('');

  // Student search
  const [studentSearch, setStudentSearch] = useState('');

  // Site image settings
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingUploading, setSettingUploading] = useState<string | null>(null);

  // Hero opacity
  const [heroOpacity, setHeroOpacity] = useState(0.5);
  const [heroOpacitySaving, setHeroOpacitySaving] = useState(false);

  // Greeting
  const [greetingEnabled, setGreetingEnabled] = useState(true);
  const [greetingName, setGreetingName] = useState('');
  const [greetingTitle, setGreetingTitle] = useState('');
  const [greetingImageUrl, setGreetingImageUrl] = useState('');
  const [greetingImageUploading, setGreetingImageUploading] = useState(false);
  const [greetingSaving, setGreetingSaving] = useState(false);
  const [greetingSuccess, setGreetingSuccess] = useState(false);

  // Notice form
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '', content: '', category: 'general', priority: 'medium', expires_at: '', image_url: '',
  });
  const [savingNotice, setSavingNotice] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [noticeImageUploading, setNoticeImageUploading] = useState(false);

  // Teacher form
  const [showTeacherForm, setShowTeacherForm] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    full_name: '', qualification: '', subject_in_charge: '', address: '', bio: '',
    photo_url: '', is_current: true, display_order: 0, joined_at: '', left_at: '',
  });
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [teacherPhotoUploading, setTeacherPhotoUploading] = useState(false);
  const [facultyEditTarget, setFacultyEditTarget] = useState<Profile | null>(null);

  // Download form
  const [showDownloadForm, setShowDownloadForm] = useState(false);
  const [downloadForm, setDownloadForm] = useState({
    title: '', description: '', category: 'general', semester: '', is_active: true,
  });
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [savingDownload, setSavingDownload] = useState(false);

  // Gallery
  const [galleryLinkEditing, setGalleryLinkEditing] = useState<string | null>(null);
  const [galleryLinkValue, setGalleryLinkValue] = useState('');
  const [galleryLinkSaving, setGalleryLinkSaving] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState('All');

  // Gallery upload form
  const [showGalleryUpload, setShowGalleryUpload] = useState(false);
  const [galleryUploadForm, setGalleryUploadForm] = useState({ title: '', album: 'General', link_url: '' });
  const [galleryUploadFile, setGalleryUploadFile] = useState<File | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Board members
  const [showBoardMemberForm, setShowBoardMemberForm] = useState(false);
  const [boardMemberForm, setBoardMemberForm] = useState({ name: '', designation: '', photo_url: '', display_order: 0 });
  const [savingBoardMember, setSavingBoardMember] = useState(false);
  const [boardPhotoUploading, setBoardPhotoUploading] = useState(false);
  const [editingBoardMember, setEditingBoardMember] = useState<any | null>(null);
  const [boardEditForm, setBoardEditForm] = useState({ name: '', designation: '', photo_url: '', display_order: 0 });
  const [savingBoardEdit, setSavingBoardEdit] = useState(false);
  const [boardEditPhotoUploading, setBoardEditPhotoUploading] = useState(false);

  // Graduation modal
  const [showGraduationModal, setShowGraduationModal] = useState(false);
  const [graduationForm, setGraduationForm] = useState<GraduationForm | null>(null);
  const [processingGraduation, setProcessingGraduation] = useState(false);
  const [graduationError, setGraduationError] = useState('');

  // Confirm modal
  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);

  // Payment settings
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [razorpayWebhookSecret, setRazorpayWebhookSecret] = useState('');
  const [paymentSettingsSaving, setPaymentSettingsSaving] = useState(false);
  const [paymentSettingsSuccess, setPaymentSettingsSuccess] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [
      { data: usersData },
      { data: noticesData },
      { data: teachersData },
      { data: appsData },
      { data: dlData },
      { data: photosData },
      { data: settingsData },
      { data: messagesData },
      { data: boardData },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('notices').select('*').order('created_at', { ascending: false }),
      supabase.from('teachers').select('*').order('display_order'),
      supabase.from('applications').select('*').order('submitted_at', { ascending: false }),
      supabase.from('downloads').select('*').order('created_at', { ascending: false }),
      supabase.from('photos').select('*').order('created_at', { ascending: false }),
      supabase.from('site_settings').select('*'),
      supabase.from('contact_messages').select('*').order('submitted_at', { ascending: false }),
      supabase.from('board_members').select('*').order('display_order'),
    ]);

    const u = usersData ?? [];
    const s = settingsData ?? [];

    setUsers(u);
    setNotices(noticesData ?? []);
    setTeachers(teachersData ?? []);
    setApplications(appsData ?? []);
    setDownloads(dlData ?? []);
    setPhotos(photosData ?? []);
    setSiteSettings(s);
    setContactMessages(messagesData ?? []);
    setBoardMembers(boardData ?? []);

    // Compute stats
    setStats({
      total_users: u.length,
      total_students: u.filter((x) => x.role === 'student').length,
      total_admins: u.filter((x) => x.role === 'admin').length,
      total_faculty: u.filter((x) => x.role === 'faculty').length,
      total_finance: u.filter((x) => x.role === 'finance').length,
      total_graduated: u.filter((x) => x.graduated).length,
      total_banned: u.filter((x) => x.is_banned).length,
      pending_applications: (appsData ?? []).filter((a) => a.status === 'pending').length,
      unread_messages: (messagesData ?? []).filter((m) => !m.is_read).length,
    });

    // Load site settings values
    const getSetting = (key: string) => s.find((x) => x.setting_key === key)?.setting_value ?? '';
    setHeroOpacity(parseFloat(getSetting('hero_opacity') || '0.5'));
    setGreetingEnabled(getSetting('principal_greeting_enabled') !== 'false');
    setGreetingName(getSetting('principal_greeting_name'));
    setGreetingTitle(getSetting('principal_greeting_title'));
    setGreetingImageUrl(getSetting('principal_greeting_image'));
    setShowTransactionsPublic(getSetting('show_transactions_public') === 'true');

    // Razorpay
    setRazorpayEnabled(getSetting('razorpay_enabled') === 'true');
    setRazorpayKeyId(getSetting('razorpay_key_id'));
    setRazorpayKeySecret(getSetting('razorpay_key_secret'));
    setRazorpayWebhookSecret(getSetting('razorpay_webhook_secret'));

    // Role themes
    const loadedThemes = { ...roleThemes };
    const themeKeys = Object.keys(loadedThemes) as (keyof typeof loadedThemes)[];
    for (const key of themeKeys) {
      const val = getSetting(key);
      if (val) loadedThemes[key] = val;
    }
    setRoleThemes(loadedThemes);

    setLoading(false);
  }

  // ── Role themes ──────────────────────────────────────────────
  async function saveRoleThemes() {
    setRoleThemesSaving(true);
    setRoleThemesSaveSuccess(false);
    for (const [key, value] of Object.entries(roleThemes)) {
      await supabase.from('site_settings').update({ setting_value: value }).eq('setting_key', key);
    }
    setSiteSettings((prev) => prev.map((s) => {
      const k = s.setting_key as keyof typeof roleThemes;
      if (k in roleThemes) return { ...s, setting_value: roleThemes[k] };
      return s;
    }));
    // Apply to users who have no personal theme
    const roleMap: Record<string, string> = {
      admin: roleThemes.theme_role_admin, faculty: roleThemes.theme_role_faculty,
      student: roleThemes.theme_role_student, standard: roleThemes.theme_role_standard,
      finance: roleThemes.theme_role_finance,
    };
    for (const [role, themeId] of Object.entries(roleMap)) {
      await supabase.from('profiles').update({ profile_theme: themeId }).eq('role', role).is('profile_theme', null);
    }
    await supabase.from('profiles').update({ profile_theme: roleThemes.theme_graduated }).eq('graduated', true).is('profile_theme', null);
    await supabase.from('profiles').update({ profile_theme: roleThemes.theme_banned }).eq('is_banned', true).is('profile_theme', null);
    setUsers((prev) => prev.map((u) => {
      if (u.profile_theme) return u;
      let t = 'classic';
      if (u.graduated) t = roleThemes.theme_graduated;
      else if (u.is_banned) t = roleThemes.theme_banned;
      else if (u.role === 'admin') t = roleThemes.theme_role_admin;
      else if (u.role === 'faculty') t = roleThemes.theme_role_faculty;
      else if (u.role === 'student') t = roleThemes.theme_role_student;
      else if (u.role === 'standard') t = roleThemes.theme_role_standard;
      else if (u.role === 'finance') t = roleThemes.theme_role_finance;
      return { ...u, profile_theme: t };
    }));
    setRoleThemesSaving(false);
    setRoleThemesSaveSuccess(true);
    setTimeout(() => setRoleThemesSaveSuccess(false), 3000);
  }

  // ── Transaction visibility ───────────────────────────────────
  async function saveTransactionVisibility(val: boolean) {
    setTransactionVisibilitySaving(true);
    await supabase.from('site_settings').update({ setting_value: val ? 'true' : 'false' }).eq('setting_key', 'show_transactions_public');
    setShowTransactionsPublic(val);
    setTransactionVisibilitySaving(false);
  }

  // ── Site image upload ────────────────────────────────────────
  async function uploadSiteImage(settingKey: string, file: File) {
    setSettingUploading(settingKey);
    setSettingsError('');
    setSettingsSuccess(false);
    const ext = file.name.split('.').pop();
    const fileName = `site/${settingKey}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('photos').upload(fileName, file, { upsert: true });
    if (upErr) { setSettingsError(upErr.message); setSettingUploading(null); return; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
    await supabase.from('site_settings').update({ setting_value: publicUrl }).eq('setting_key', settingKey);
    setSiteSettings((prev) => prev.map((s) => s.setting_key === settingKey ? { ...s, setting_value: publicUrl } : s));
    setSettingUploading(null);
    setSettingsSuccess(true);
    setTimeout(() => setSettingsSuccess(false), 2500);
  }

  // ── Hero opacity ─────────────────────────────────────────────
  async function saveHeroOpacity() {
    setHeroOpacitySaving(true);
    await supabase.from('site_settings').update({ setting_value: String(heroOpacity) }).eq('setting_key', 'hero_opacity');
    setHeroOpacitySaving(false);
  }

  // ── Greeting ─────────────────────────────────────────────────
  async function saveGreeting() {
    setGreetingSaving(true);
    const updates = [
      { key: 'principal_greeting_enabled', value: greetingEnabled ? 'true' : 'false' },
      { key: 'principal_greeting_name', value: greetingName },
      { key: 'principal_greeting_title', value: greetingTitle },
    ];
    for (const u of updates) {
      await supabase.from('site_settings').update({ setting_value: u.value }).eq('setting_key', u.key);
    }
    setGreetingSaving(false);
    setGreetingSuccess(true);
    setTimeout(() => setGreetingSuccess(false), 2500);
  }

  async function uploadGreetingImage(file: File) {
    setGreetingImageUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `site/greeting_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(fileName, file, { upsert: true });
    if (error) { setGreetingImageUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
    setGreetingImageUrl(publicUrl);
    await supabase.from('site_settings').update({ setting_value: publicUrl }).eq('setting_key', 'principal_greeting_image');
    setGreetingImageUploading(false);
  }

  // ── User CRUD ────────────────────────────────────────────────
  function getEffectiveTheme(u: Profile): string {
    if (u.profile_theme) return u.profile_theme;
    if (u.graduated) return roleThemes.theme_graduated;
    if (u.is_banned) return roleThemes.theme_banned;
    if (u.role === 'admin') return roleThemes.theme_role_admin;
    if (u.role === 'faculty') return roleThemes.theme_role_faculty;
    if (u.role === 'student') return roleThemes.theme_role_student;
    if (u.role === 'standard') return roleThemes.theme_role_standard;
    if (u.role === 'finance') return roleThemes.theme_role_finance;
    return 'classic';
  }

  async function updateUserRole(userId: string, role: string) {
    await supabase.from('profiles').update({ role: role as Profile['role'] }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as Profile['role'] } : u));
  }

  async function updateUserTheme(userId: string, theme: string) {
    await supabase.from('profiles').update({ profile_theme: theme }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, profile_theme: theme } : u));
  }

  async function updateUserCourse(userId: string, course: string) {
    await supabase.from('profiles').update({ course: course || null }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, course: course || null } : u));
  }

  async function updateUserYear(userId: string, year: string) {
    await supabase.from('profiles').update({ student_year: year as Profile['student_year'] || null }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, student_year: year as Profile['student_year'] } : u));
  }

  async function updateUserPataRegNo(userId: string, pataRegNo: string) {
    await supabase.from('profiles').update({ pata_reg_no: pataRegNo || null }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, pata_reg_no: pataRegNo || null } : u));
  }

  async function banUser(userId: string) {
    await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: true } : u));
  }

  async function unbanUser(userId: string) {
    await supabase.from('profiles').update({ is_banned: false }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_banned: false } : u));
  }

  async function deleteUser(userId: string) {
    const { error } = await supabase.functions.invoke('delete-user-auth', { body: { userId } });
    if (!error) {
      await supabase.from('profiles').delete().eq('id', userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setConfirmConfig(null);
  }

  function confirmBanUser(u: Profile) {
    setConfirmConfig({
      title: 'Ban User',
      message: `Are you sure you want to ban ${u.full_name || u.email}?`,
      confirmLabel: 'Ban User', danger: true,
      onConfirm: () => { banUser(u.id); setConfirmConfig(null); },
    });
  }

  function confirmDeleteUser(u: Profile) {
    setConfirmConfig({
      title: 'Delete User',
      message: `Permanently delete ${u.full_name || u.email}? This cannot be undone.`,
      detail: 'All their data will be removed.',
      confirmLabel: 'Delete User', danger: true,
      onConfirm: () => deleteUser(u.id),
    });
  }

  // ── Graduation ───────────────────────────────────────────────
  function openGraduationModal(u: Profile) {
    setGraduationForm({
      userId: u.id,
      userName: u.full_name || u.email || 'User',
      course: u.course || '',
      completionDate: u.completion_date || new Date().toISOString().split('T')[0],
      pataRegNo: u.pata_reg_no || '',
    });
    setGraduationError('');
    setShowGraduationModal(true);
  }

  async function processGraduation(e: React.FormEvent) {
    e.preventDefault();
    if (!graduationForm) return;
    setProcessingGraduation(true);
    setGraduationError('');
    try {
      const { data: user } = await supabase.from('profiles').select('*').eq('id', graduationForm.userId).single();
      if (!user) throw new Error('User not found');

      // Generate certificate
      const certFileName = `certificates/${graduationForm.userId}_${Date.now()}.pdf`;
      // Mark as graduated
      const { error } = await supabase.from('profiles').update({
        graduated: true,
        completion_date: graduationForm.completionDate,
        pata_reg_no: graduationForm.pataRegNo || null,
        course: graduationForm.course || user.course,
      }).eq('id', graduationForm.userId);
      if (error) throw error;

      setUsers((prev) => prev.map((u) => u.id === graduationForm.userId ? {
        ...u, graduated: true,
        completion_date: graduationForm.completionDate,
        pata_reg_no: graduationForm.pataRegNo || null,
      } : u));
      setShowGraduationModal(false);
      setGraduationForm(null);
    } catch (err: any) {
      setGraduationError(err.message || 'Failed to process graduation');
    }
    setProcessingGraduation(false);
  }

  async function revokeGraduation(userId: string) {
    await supabase.from('profiles').update({ graduated: false, completion_date: null, certificate_url: null }).eq('id', userId);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, graduated: false, completion_date: null, certificate_url: null } : u));
    setConfirmConfig(null);
  }

  // ── Notices ──────────────────────────────────────────────────
  async function uploadNoticeImage(file: File): Promise<string | null> {
    setNoticeImageUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `notices/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(fileName, file, { upsert: true });
    if (error) { setNoticeImageUploading(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
    setNoticeImageUploading(false);
    return publicUrl;
  }

  async function saveNotice(e: React.FormEvent) {
    e.preventDefault();
    setSavingNotice(true);
    const payload = {
      title: noticeForm.title, content: noticeForm.content,
      category: noticeForm.category as Notice['category'],
      priority: noticeForm.priority as Notice['priority'],
      expires_at: noticeForm.expires_at || null,
      image_url: noticeForm.image_url || null,
      author_id: adminProfile?.id || null, is_published: true,
    };
    if (editingNotice) {
      const { data } = await supabase.from('notices').update(payload).eq('id', editingNotice.id).select().single();
      if (data) setNotices((prev) => prev.map((n) => n.id === editingNotice.id ? data : n));
    } else {
      const { data } = await supabase.from('notices').insert(payload).select().single();
      if (data) setNotices((prev) => [data, ...prev]);
    }
    setNoticeForm({ title: '', content: '', category: 'general', priority: 'medium', expires_at: '', image_url: '' });
    setEditingNotice(null);
    setShowNoticeForm(false);
    setSavingNotice(false);
  }

  async function deleteNotice(id: string) {
    await supabase.from('notices').delete().eq('id', id);
    setNotices((prev) => prev.filter((n) => n.id !== id));
    setConfirmConfig(null);
  }

  async function toggleNoticePublished(notice: Notice) {
    const { data } = await supabase.from('notices').update({ is_published: !notice.is_published }).eq('id', notice.id).select().single();
    if (data) setNotices((prev) => prev.map((n) => n.id === notice.id ? data : n));
  }

  // ── Teachers ─────────────────────────────────────────────────
  async function uploadTeacherPhoto(file: File): Promise<string | null> {
    setTeacherPhotoUploading(true);
    const ext = file.name.split('.').pop();
    const { error } = await supabase.storage.from('photos').upload(`faculty/${Date.now()}.${ext}`, file, { upsert: true });
    if (error) { setTeacherPhotoUploading(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(`faculty/${Date.now()}.${ext}`);
    setTeacherPhotoUploading(false);
    return publicUrl;
  }

  async function saveTeacher(e: React.FormEvent) {
    e.preventDefault();
    setSavingTeacher(true);
    const payload = {
      full_name: teacherForm.full_name,
      qualification: teacherForm.qualification || null,
      subject_in_charge: teacherForm.subject_in_charge || null,
      address: teacherForm.address || null,
      bio: teacherForm.bio || null,
      photo_url: teacherForm.photo_url || null,
      is_current: teacherForm.is_current,
      display_order: teacherForm.display_order,
      joined_at: teacherForm.joined_at || null,
      left_at: teacherForm.left_at || null,
    };
    const { data } = await supabase.from('teachers').insert(payload).select().single();
    if (data) setTeachers((prev) => [...prev, data]);
    setTeacherForm({ full_name: '', qualification: '', subject_in_charge: '', address: '', bio: '', photo_url: '', is_current: true, display_order: 0, joined_at: '', left_at: '' });
    setShowTeacherForm(false);
    setSavingTeacher(false);
  }

  async function deleteTeacher(id: string) {
    await supabase.from('teachers').delete().eq('id', id);
    setTeachers((prev) => prev.filter((t) => t.id !== id));
    setConfirmConfig(null);
  }

  // ── Applications ─────────────────────────────────────────────
  async function updateApplicationStatus(id: string, status: string, notes?: string) {
    const { data } = await supabase.from('applications').update({ status, review_notes: notes || null, reviewed_at: new Date().toISOString() }).eq('id', id).select().single();
    if (data) setApplications((prev) => prev.map((a) => a.id === id ? data : a));
  }

  // ── Downloads ────────────────────────────────────────────────
  async function saveDownload(e: React.FormEvent) {
    e.preventDefault();
    if (!downloadFile) return;
    setSavingDownload(true);
    const ext = downloadFile.name.split('.').pop();
    const fileName = `downloads/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('downloads').upload(fileName, downloadFile, { upsert: true });
    if (error) { setSavingDownload(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('downloads').getPublicUrl(fileName);
    const payload = {
      title: downloadForm.title,
      description: downloadForm.description || null,
      file_url: publicUrl,
      category: downloadForm.category as DownloadType['category'],
      semester: downloadForm.semester || null,
      file_size_kb: Math.round(downloadFile.size / 1024),
      uploaded_by: adminProfile?.id || null,
      is_active: downloadForm.is_active,
    };
    const { data } = await supabase.from('downloads').insert(payload).select().single();
    if (data) setDownloads((prev) => [data, ...prev]);
    setDownloadForm({ title: '', description: '', category: 'general', semester: '', is_active: true });
    setDownloadFile(null);
    setShowDownloadForm(false);
    setSavingDownload(false);
  }

  async function deleteDownload(id: string) {
    await supabase.from('downloads').delete().eq('id', id);
    setDownloads((prev) => prev.filter((d) => d.id !== id));
    setConfirmConfig(null);
  }

  // ── Gallery ──────────────────────────────────────────────────
  async function saveGalleryLink(photoId: string) {
    setGalleryLinkSaving(true);
    await supabase.from('photos').update({ link_url: galleryLinkValue || null }).eq('id', photoId);
    setPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, link_url: galleryLinkValue || null } : p));
    setGalleryLinkEditing(null);
    setGalleryLinkValue('');
    setGalleryLinkSaving(false);
  }

  async function uploadGalleryPhoto() {
    if (!galleryUploadFile) return;
    setGalleryUploading(true);
    try {
      const ext = galleryUploadFile.name.split('.').pop();
      const fileName = `gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, galleryUploadFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);

      const { data, error: insertError } = await supabase
        .from('photos')
        .insert({
          title: galleryUploadForm.title || null,
          album: galleryUploadForm.album || 'General',
          image_url: publicUrl,
          link_url: galleryUploadForm.link_url || null,
          is_published: true,
          uploaded_by: adminProfile?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) setPhotos((prev) => [data, ...prev]);

      setShowGalleryUpload(false);
      setGalleryUploadForm({ title: '', album: 'General', link_url: '' });
      setGalleryUploadFile(null);
    } catch (err) {
      console.error('Gallery upload error:', err);
    } finally {
      setGalleryUploading(false);
    }
  }

  async function togglePhotoPublished(photo: Photo) {
    const { data } = await supabase.from('photos').update({ is_published: !photo.is_published }).eq('id', photo.id).select().single();
    if (data) setPhotos((prev) => prev.map((p) => p.id === photo.id ? data : p));
  }

  async function deletePhoto(id: string) {
    await supabase.from('photos').delete().eq('id', id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setConfirmConfig(null);
  }

  // ── Board members ────────────────────────────────────────────
  async function uploadBoardPhoto(file: File): Promise<string | null> {
    setBoardPhotoUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `board/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('photos').upload(fileName, file, { upsert: true });
    if (error) { setBoardPhotoUploading(false); return null; }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
    setBoardPhotoUploading(false);
    return publicUrl;
  }

  async function saveBoardMember(e: React.FormEvent) {
    e.preventDefault();
    setSavingBoardMember(true);
    const { data } = await supabase.from('board_members').insert({
      name: boardMemberForm.name, designation: boardMemberForm.designation || null,
      photo_url: boardMemberForm.photo_url || null, display_order: boardMemberForm.display_order || 0,
    }).select().single();
    if (data) setBoardMembers((prev) => [...prev, data]);
    setBoardMemberForm({ name: '', designation: '', photo_url: '', display_order: 0 });
    setShowBoardMemberForm(false);
    setSavingBoardMember(false);
  }

  async function deleteBoardMember(id: string) {
    await supabase.from('board_members').delete().eq('id', id);
    setBoardMembers((prev) => prev.filter((b) => b.id !== id));
    setConfirmConfig(null);
  }

  async function saveBoardMemberEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingBoardMember) return;
    setSavingBoardEdit(true);
    const { data } = await supabase.from('board_members').update({
      name: boardEditForm.name, designation: boardEditForm.designation || null,
      photo_url: boardEditForm.photo_url || null, display_order: boardEditForm.display_order || 0,
    }).eq('id', editingBoardMember.id).select().single();
    if (data) setBoardMembers((prev) => prev.map((b) => b.id === editingBoardMember.id ? data : b));
    setEditingBoardMember(null);
    setSavingBoardEdit(false);
  }

  // ── Messages ─────────────────────────────────────────────────
  async function markMessageRead(id: string) {
    await supabase.from('contact_messages').update({ is_read: true }).eq('id', id);
    setContactMessages((prev) => prev.map((m) => m.id === id ? { ...m, is_read: true } : m));
    setStats((s) => ({ ...s, unread_messages: Math.max(0, s.unread_messages - 1) }));
  }

  async function deleteMessage(id: string) {
    await supabase.from('contact_messages').delete().eq('id', id);
    setContactMessages((prev) => prev.filter((m) => m.id !== id));
  }

  // ── Payment settings ─────────────────────────────────────────
  async function savePaymentSettings(e: React.FormEvent) {
    e.preventDefault();
    setPaymentSettingsSaving(true);
    setPaymentSettingsSuccess(false);
    const updates = [
      { key: 'razorpay_enabled', value: razorpayEnabled ? 'true' : 'false' },
      { key: 'razorpay_key_id', value: razorpayKeyId },
      { key: 'razorpay_key_secret', value: razorpayKeySecret },
      { key: 'razorpay_webhook_secret', value: razorpayWebhookSecret },
    ];
    for (const u of updates) {
      await supabase.from('site_settings').update({ setting_value: u.value }).eq('setting_key', u.key);
    }
    setPaymentSettingsSaving(false);
    setPaymentSettingsSuccess(true);
    setTimeout(() => setPaymentSettingsSuccess(false), 2500);
  }

  // ── Render helpers ───────────────────────────────────────────
  function renderUserTable(list: Profile[], isStudentView = false) {
    if (list.length === 0) return <div className="py-16 text-center text-slate-400 text-sm">No users in this group.</div>;
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name / Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Theme</th>
              {isStudentView && <th className="px-4 py-3 text-left">Course</th>}
              {isStudentView && <th className="px-4 py-3 text-left">Year</th>}
              {isStudentView && <th className="px-4 py-3 text-left">Graduated</th>}
              {isStudentView && <th className="px-4 py-3 text-left">PATA Reg No</th>}
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                        <span className="text-xs font-bold text-navy-700">{(u.full_name ?? u.email ?? 'U')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <Link to={`/admin/users/${u.id}`} className="font-medium text-navy-900 hover:text-gold-600 transition-colors">
                        {u.full_name || '—'}
                      </Link>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white"
                  >
                    <option value="standard">Standard</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {u.is_banned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                      <Ban className="w-3 h-3" /> Banned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      <Shield className="w-3 h-3" /> Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={getEffectiveTheme(u)}
                    onChange={(e) => updateUserTheme(u.id, e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white"
                    title={u.profile_theme ? 'Personal theme set' : 'Role-based theme (default)'}
                  >
                    {THEMES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}{t.animated ? ' ✨' : ''}</option>
                    ))}
                  </select>
                  {!u.profile_theme && <p className="text-xs text-slate-400 mt-0.5">Role default</p>}
                </td>
                {isStudentView && (
                  <td className="px-4 py-3">
                    <input type="text" value={u.course ?? ''} onChange={(e) => updateUserCourse(u.id, e.target.value)}
                      placeholder="e.g., BTh" className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white w-24" />
                  </td>
                )}
                {isStudentView && (
                  <td className="px-4 py-3">
                    <select value={u.student_year ?? ''} onChange={(e) => updateUserYear(u.id, e.target.value)}
                      className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white">
                      <option value="">Not set</option>
                      <option value="1st_year">1st Year</option>
                      <option value="2nd_year">2nd Year</option>
                      <option value="final_year">Final Year</option>
                    </select>
                  </td>
                )}
                {isStudentView && (
                  <td className="px-4 py-3">
                    {u.graduated ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <GraduationCap className="w-3 h-3" /> Yes
                      </span>
                    ) : <span className="text-slate-400 text-xs">No</span>}
                  </td>
                )}
                {isStudentView && (
                  <td className="px-4 py-3">
                    <input type="text" value={u.pata_reg_no ?? ''} onChange={(e) => updateUserPataRegNo(u.id, e.target.value)}
                      placeholder="PATA-2024-001" className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white w-28" />
                  </td>
                )}
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 flex-wrap">
                    {u.role === 'student' && !u.graduated && (
                      <button onClick={() => openGraduationModal(u)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors" title="Graduate">
                        <GraduationCap className="w-4 h-4" />
                      </button>
                    )}
                    {u.graduated && (
                      <button onClick={() => setConfirmConfig({ title: 'Revoke Graduation', message: `Revoke graduation for ${u.full_name}?`, confirmLabel: 'Revoke', danger: true, onConfirm: () => revokeGraduation(u.id) })}
                        className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors" title="Revoke Graduation">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {u.is_banned ? (
                      <button onClick={() => unbanUser(u.id)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors" title="Unban User">
                          <Shield className="w-4 h-4" />
                        </button>
                    ) : (
                      <button onClick={() => confirmBanUser(u)}
                        className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors" title="Ban User">
                          <Ban className="w-4 h-4" />
                        </button>
                    )}
                    {u.graduated && (
                      <Link to={`/certificate/${u.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors" title="View Certificate">
                          <Award className="w-4 h-4" />
                        </Link>
                    )}
                    <Link to={`/admin/users/${u.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" title="View Profile">
                        <Users className="w-4 h-4" />
                      </Link>
                    <button onClick={() => confirmDeleteUser(u)}
                      className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Tabs config ──────────────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'students', label: 'Students', icon: UserCheck },
    { id: 'graduated', label: 'Graduated', icon: GraduationCap },
    { id: 'faculty', label: 'Faculty Users', icon: BookOpen },
    { id: 'admins', label: 'Admins', icon: ShieldCheck },
    { id: 'notices', label: 'Notices', icon: Bell },
    { id: 'teachers', label: 'Faculty Profiles', icon: BookOpen },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'downloads', label: 'Downloads', icon: Download },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'settings', label: 'Site Images', icon: Settings },
    { id: 'payment', label: 'Payment', icon: CreditCard },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: stats.unread_messages },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-navy-700 animate-spin" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const students = users.filter((u) => u.role === 'student');
  const filteredStudents = studentSearch
    ? students.filter((u) => (u.full_name ?? '').toLowerCase().includes(studentSearch.toLowerCase()) || (u.email ?? '').toLowerCase().includes(studentSearch.toLowerCase()))
    : students;
  const adminsOnly = users.filter((u) => u.role === 'admin');
  const facultyUsers = users.filter((u) => u.role === 'faculty');

  // ── Gallery helpers ──────────────────────────────────────────
  const galleryAlbums = ['All', ...Array.from(new Set(photos.map((p) => p.album ?? 'General')))];
  const filteredPhotos = galleryFilter === 'All' ? photos : photos.filter((p) => (p.album ?? 'General') === galleryFilter);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-navy-900">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Manage users, content, and site settings</p>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-6 scrollbar-none">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                tab === id ? 'bg-navy-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {badge && badge > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
                  {badge > 9 ? '9+' : badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <>
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={stats.total_users} icon={Users} color="bg-navy-700" />
                <StatCard label="Students" value={stats.total_students} icon={UserCheck} color="bg-blue-600" />
                <StatCard label="Faculty" value={stats.total_faculty} icon={BookOpen} color="bg-emerald-600" />
                <StatCard label="Finance" value={stats.total_finance} icon={CreditCard} color="bg-teal-600" />
                <StatCard label="Graduated" value={stats.total_graduated} icon={GraduationCap} color="bg-gold-600" />
                <StatCard label="Admins" value={stats.total_admins} icon={ShieldCheck} color="bg-red-600" />
                <StatCard label="Banned" value={stats.total_banned} icon={Ban} color="bg-slate-600" />
                <StatCard label="Pending Apps" value={stats.pending_applications} icon={FileText} color="bg-orange-500" />
              </div>
              <div className="card p-6">
                <h2 className="font-serif font-bold text-navy-900 mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => setTab('notices')} className="btn-primary"><Bell className="w-4 h-4" /> New Notice</button>
                  <button onClick={() => setTab('users')} className="btn-secondary"><Users className="w-4 h-4" /> Manage Users</button>
                  <button onClick={() => setTab('applications')} className="btn-secondary"><FileText className="w-4 h-4" /> Applications</button>
                  <button onClick={() => setTab('messages')} className="btn-secondary">
                    <MessageSquare className="w-4 h-4" /> Messages
                    {stats.unread_messages > 0 && <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{stats.unread_messages}</span>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-serif font-bold text-navy-900">All Users ({users.length})</h2>
              </div>
              {renderUserTable(users)}
            </div>
          )}

          {/* STUDENTS */}
          {tab === 'students' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <h2 className="font-serif font-bold text-navy-900">Students ({filteredStudents.length})</h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students..." className="input-field pl-9 text-sm"
                    />
                  </div>
                </div>
              </div>
              {renderUserTable(filteredStudents, true)}
            </div>
          )}

          {/* GRADUATED */}
          {tab === 'graduated' && (() => {
            const graduated = users.filter((u) => u.graduated);
            const query = graduatedSearch.toLowerCase().trim();
            const filtered = query
              ? graduated.filter((u) =>
                  (u.full_name ?? '').toLowerCase().includes(query) ||
                  (u.email ?? '').toLowerCase().includes(query) ||
                  (u.id ?? '').toLowerCase().includes(query) ||
                  (u.pata_reg_no ?? '').toLowerCase().includes(query) ||
                  (u.course ?? '').toLowerCase().includes(query)
                )
              : graduated;
            const byYear: Record<string, typeof filtered> = {};
            filtered.forEach((u) => {
              const yr = u.completion_date ? new Date(u.completion_date).getFullYear().toString() : 'Unknown Year';
              if (!byYear[yr]) byYear[yr] = [];
              byYear[yr].push(u);
            });
            const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
            return (
              <div className="space-y-6">
                <div className="card p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-serif font-bold text-navy-900 text-lg flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-gold-500" /> Graduated Students
                      </h2>
                      <p className="text-slate-500 text-sm">{graduated.length} total graduates</p>
                    </div>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" value={graduatedSearch} onChange={(e) => setGraduatedSearch(e.target.value)}
                        placeholder="Search by name, ID, certificate ID..." className="input-field pl-9 text-sm" />
                      {graduatedSearch && (
                        <button onClick={() => setGraduatedSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="py-16 text-center">
                      <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500">{query ? 'No graduates match your search.' : 'No graduated students yet.'}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {years.map((year) => (
                        <div key={year}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-px flex-1 bg-gold-200" />
                            <span className="text-sm font-bold text-gold-700 bg-gold-50 border border-gold-200 px-3 py-1 rounded-full">Class of {year}</span>
                            <div className="h-px flex-1 bg-gold-200" />
                            <span className="text-xs text-slate-400">{byYear[year].length} graduate{byYear[year].length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                              <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
                                <tr>
                                  <th className="px-4 py-3 text-left">Name</th>
                                  <th className="px-4 py-3 text-left">User ID</th>
                                  <th className="px-4 py-3 text-left">Certificate ID</th>
                                  <th className="px-4 py-3 text-left">Course</th>
                                  <th className="px-4 py-3 text-left">PATA Reg No</th>
                                  <th className="px-4 py-3 text-left">Date Issued</th>
                                  <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {byYear[year].map((u) => {
                                  const certYear = u.completion_date ? new Date(u.completion_date).getFullYear() : new Date().getFullYear();
                                  const certId = `ABC-${certYear}-${u.id.slice(0, 8).toUpperCase()}`;
                                  return (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                            {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                                              <span className="text-xs font-bold text-gold-700">{(u.full_name ?? u.email ?? 'U')[0].toUpperCase()}</span>
                                            )}
                                          </div>
                                          <div>
                                            <Link to={`/admin/users/${u.id}`} className="font-semibold text-navy-900 text-sm hover:text-gold-600 transition-colors">
                                              {u.full_name || '—'}
                                            </Link>
                                            <p className="text-xs text-slate-500">{u.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3"><span className="font-mono text-xs text-slate-500">{u.id.slice(0, 8).toUpperCase()}</span></td>
                                      <td className="px-4 py-3"><span className="font-mono text-xs font-semibold text-navy-700 bg-navy-50 px-2 py-0.5 rounded">{certId}</span></td>
                                      <td className="px-4 py-3 text-sm text-slate-700">{u.course || '—'}</td>
                                      <td className="px-4 py-3 text-xs text-slate-600">{u.pata_reg_no || '—'}</td>
                                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                                        {u.completion_date ? new Date(u.completion_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                          <Link to={`/certificate/${u.id}`} className="inline-flex items-center justify-center w-8 h-8 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors" title="View Certificate">
                                            <Award className="w-4 h-4" />
                                          </Link>
                                          <Link to={`/admin/users/${u.id}`} className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" title="View Profile">
                                            <Users className="w-4 h-4" />
                                          </Link>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* FACULTY USERS */}
          {tab === 'faculty' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-serif font-bold text-navy-900">Faculty Users ({facultyUsers.length})</h2>
                <p className="text-slate-500 text-sm mt-1">Users with faculty role from the Users tab</p>
              </div>
              {facultyUsers.length === 0 ? (
                <div className="py-16 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-400">No faculty users found.</p>
                  <p className="text-sm text-slate-400 mt-1">Set a user's role to "Faculty" in the Users tab to see them here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Name / Email</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Theme</th>
                        <th className="px-4 py-3 text-left">Qualification</th>
                        <th className="px-4 py-3 text-left">Subject</th>
                        <th className="px-4 py-3 text-left">Joined</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facultyUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : (
                                  <span className="text-xs font-bold text-emerald-700">{(u.full_name ?? u.email ?? 'U')[0].toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <Link to={`/admin/users/${u.id}`} className="font-medium text-navy-900 hover:text-gold-600 transition-colors">
                                  {u.full_name || '—'}
                                </Link>
                                <p className="text-xs text-slate-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {u.is_banned ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                <Ban className="w-3 h-3" /> Banned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                <Shield className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={getEffectiveTheme(u)}
                              onChange={(e) => updateUserTheme(u.id, e.target.value)}
                              className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy-500 bg-white">
                              {THEMES.map((t) => (
                                <option key={t.id} value={t.id}>{t.label}{t.animated ? ' ✨' : ''}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{u.qualification || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{u.subject_in_charge || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {u.is_banned ? (
                                <button onClick={() => unbanUser(u.id)}
                                  className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors" title="Unban User">
                                  <Shield className="w-4 h-4" />
                                </button>
                              ) : (
                                <button onClick={() => confirmBanUser(u)}
                                  className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors" title="Ban User">
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                              <Link to={`/admin/users/${u.id}`}
                                className="inline-flex items-center justify-center w-8 h-8 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" title="View Profile">
                                <Users className="w-4 h-4" />
                              </Link>
                              <button onClick={() => confirmDeleteUser(u)}
                                className="inline-flex items-center justify-center w-8 h-8 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Delete User">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ADMINS */}
          {tab === 'admins' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h2 className="font-serif font-bold text-navy-900">Admins ({adminsOnly.length})</h2>
              </div>
              {renderUserTable(adminsOnly)}
            </div>
          )}

          {/* NOTICES */}
          {tab === 'notices' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => { setEditingNotice(null); setNoticeForm({ title: '', content: '', category: 'general', priority: 'medium', expires_at: '', image_url: '' }); setShowNoticeForm(true); }} className="btn-primary">
                  <Plus className="w-4 h-4" /> New Notice
                </button>
              </div>
              {showNoticeForm && (
                <div className="card p-6">
                  <h2 className="font-serif font-bold text-navy-900 mb-4">{editingNotice ? 'Edit Notice' : 'New Notice'}</h2>
                  <form onSubmit={saveNotice} className="space-y-4">
                    <div><label className="label">Title *</label><input value={noticeForm.title} onChange={(e) => setNoticeForm((f) => ({ ...f, title: e.target.value }))} className="input-field" required /></div>
                    <div><label className="label">Content *</label><textarea value={noticeForm.content} onChange={(e) => setNoticeForm((f) => ({ ...f, content: e.target.value }))} className="input-field min-h-24 resize-none" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="label">Category</label>
                        <select value={noticeForm.category} onChange={(e) => setNoticeForm((f) => ({ ...f, category: e.target.value }))} className="input-field">
                          {['academic', 'event', 'general', 'urgent', 'financial'].map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                      <div><label className="label">Priority</label>
                        <select value={noticeForm.priority} onChange={(e) => setNoticeForm((f) => ({ ...f, priority: e.target.value }))} className="input-field">
                          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div><label className="label">Expires At (optional)</label><input type="date" value={noticeForm.expires_at} onChange={(e) => setNoticeForm((f) => ({ ...f, expires_at: e.target.value }))} className="input-field" /></div>
                    <div>
                      <label className="label">Notice Image</label>
                      {noticeForm.image_url && <img src={noticeForm.image_url} alt="" className="h-24 rounded-lg object-cover mb-2" />}
                      <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer w-fit ${noticeImageUploading ? 'bg-slate-100 text-slate-400' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
                        {noticeImageUploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Image</>}
                        <input type="file" accept="image/*" className="hidden" disabled={noticeImageUploading} onChange={async (e) => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const url = await uploadNoticeImage(f);
                          if (url) setNoticeForm((nf) => ({ ...nf, image_url: url }));
                        }} />
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={savingNotice} className="btn-primary">{savingNotice ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}</button>
                      <button type="button" onClick={() => { setShowNoticeForm(false); setEditingNotice(null); }} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="card overflow-hidden">
                {notices.length === 0 ? (
                  <div className="py-16 text-center text-slate-400"><Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No notices yet.</p></div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notices.map((n) => (
                      <div key={n.id} className="p-4 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-navy-900">{n.title}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${n.priority === 'high' ? 'bg-red-100 text-red-700' : n.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {n.priority}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-navy-100 text-navy-700 font-medium capitalize">{n.category}</span>
                            {!n.is_published && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Draft</span>}
                          </div>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{n.content}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => toggleNoticePublished(n)} className="p-1.5 text-slate-500 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors" title={n.is_published ? 'Unpublish' : 'Publish'}>
                            {n.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setEditingNotice(n); setNoticeForm({ title: n.title, content: n.content, category: n.category, priority: n.priority, expires_at: n.expires_at ?? '', image_url: n.image_url ?? '' }); setShowNoticeForm(true); }}
                            className="p-1.5 text-navy-600 hover:text-navy-800 rounded hover:bg-navy-50 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmConfig({ title: 'Delete Notice', message: `Delete "${n.title}"?`, confirmLabel: 'Delete', danger: true, onConfirm: () => deleteNotice(n.id) })}
                            className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FACULTY */}
          {tab === 'teachers' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowTeacherForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Faculty</button>
              </div>
              {showTeacherForm && (
                <div className="card p-6">
                  <h2 className="font-serif font-bold text-navy-900 mb-4">Add Faculty Member</h2>
                  <form onSubmit={saveTeacher} className="space-y-4">
                    <div><label className="label">Full Name *</label><input value={teacherForm.full_name} onChange={(e) => setTeacherForm((f) => ({ ...f, full_name: e.target.value }))} className="input-field" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="label">Qualification</label><input value={teacherForm.qualification} onChange={(e) => setTeacherForm((f) => ({ ...f, qualification: e.target.value }))} className="input-field" /></div>
                      <div><label className="label">Subject in Charge</label><input value={teacherForm.subject_in_charge} onChange={(e) => setTeacherForm((f) => ({ ...f, subject_in_charge: e.target.value }))} className="input-field" /></div>
                    </div>
                    <div><label className="label">Address</label><input value={teacherForm.address} onChange={(e) => setTeacherForm((f) => ({ ...f, address: e.target.value }))} className="input-field" /></div>
                    <div><label className="label">Bio</label><textarea value={teacherForm.bio} onChange={(e) => setTeacherForm((f) => ({ ...f, bio: e.target.value }))} className="input-field min-h-20 resize-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="label">Joined</label><input type="date" value={teacherForm.joined_at} onChange={(e) => setTeacherForm((f) => ({ ...f, joined_at: e.target.value }))} className="input-field" /></div>
                      <div><label className="label">Display Order</label><input type="number" value={teacherForm.display_order} onChange={(e) => setTeacherForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="input-field" /></div>
                    </div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="is_current" checked={teacherForm.is_current} onChange={(e) => setTeacherForm((f) => ({ ...f, is_current: e.target.checked }))} className="rounded" /><label htmlFor="is_current" className="text-sm text-slate-700">Currently Active</label></div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={savingTeacher} className="btn-primary">{savingTeacher ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Add Faculty</>}</button>
                      <button type="button" onClick={() => setShowTeacherForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="card overflow-hidden">
                {teachers.length === 0 ? (
                  <div className="py-16 text-center text-slate-400"><BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No faculty members yet.</p></div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {teachers.map((t) => (
                      <div key={t.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                          {t.photo_url ? <img src={t.photo_url} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-5 h-5 text-slate-400 m-auto mt-2.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-navy-900">{t.full_name}</p>
                          <p className="text-sm text-slate-500">{t.qualification || '—'} {t.subject_in_charge ? `· ${t.subject_in_charge}` : ''}</p>
                          <p className="text-xs text-slate-400">{t.is_current ? 'Current' : 'Former'}</p>
                        </div>
                        <button onClick={() => setConfirmConfig({ title: 'Delete Faculty', message: `Delete ${t.full_name}?`, confirmLabel: 'Delete', danger: true, onConfirm: () => deleteTeacher(t.id) })}
                          className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPLICATIONS */}
          {tab === 'applications' && (
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-serif font-bold text-navy-900">Applications ({applications.length})</h2>
                <span className="text-sm text-slate-500">{stats.pending_applications} pending</span>
              </div>
              {applications.length === 0 ? (
                <div className="py-16 text-center text-slate-400"><FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No applications yet.</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Applicant</th>
                        <th className="px-4 py-3 text-left">Course</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-navy-900">{a.full_name}</p>
                            <p className="text-xs text-slate-500">{a.email}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{a.course_applied || a.applying_for || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.status === 'pending' ? 'bg-amber-100 text-amber-700' : a.status === 'accepted' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{new Date(a.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {a.status === 'pending' && (
                                <>
                                  <button onClick={() => updateApplicationStatus(a.id, 'accepted')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Accept</button>
                                  <button onClick={() => updateApplicationStatus(a.id, 'rejected')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">Reject</button>
                                </>
                              )}
                              {a.status !== 'pending' && (
                                <button onClick={() => updateApplicationStatus(a.id, 'pending')} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">Reset</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* DOWNLOADS */}
          {tab === 'downloads' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowDownloadForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add File</button>
              </div>
              {showDownloadForm && (
                <div className="card p-6">
                  <h2 className="font-serif font-bold text-navy-900 mb-4">Add Download</h2>
                  <form onSubmit={saveDownload} className="space-y-4">
                    <div><label className="label">Title *</label><input value={downloadForm.title} onChange={(e) => setDownloadForm((f) => ({ ...f, title: e.target.value }))} className="input-field" required /></div>
                    <div><label className="label">Description</label><textarea value={downloadForm.description} onChange={(e) => setDownloadForm((f) => ({ ...f, description: e.target.value }))} className="input-field resize-none min-h-16" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="label">Category</label>
                        <select value={downloadForm.category} onChange={(e) => setDownloadForm((f) => ({ ...f, category: e.target.value }))} className="input-field">
                          {['academic_calendar', 'syllabus', 'application_form', 'result', 'general', 'policy'].map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                        </select>
                      </div>
                      <div><label className="label">Semester</label><input value={downloadForm.semester} onChange={(e) => setDownloadForm((f) => ({ ...f, semester: e.target.value }))} className="input-field" placeholder="e.g., 2024-25" /></div>
                    </div>
                    <div>
                      <label className="label">File *</label>
                      <input type="file" onChange={(e) => setDownloadFile(e.target.files?.[0] ?? null)} className="input-field" required />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={savingDownload} className="btn-primary">{savingDownload ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}</button>
                      <button type="button" onClick={() => setShowDownloadForm(false)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              )}
              <div className="card overflow-hidden">
                {downloads.length === 0 ? (
                  <div className="py-16 text-center text-slate-400"><Download className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No downloads yet.</p></div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {downloads.map((d) => (
                      <div key={d.id} className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-navy-900">{d.title}</p>
                          <p className="text-xs text-slate-500">{d.category.replace(/_/g, ' ')} {d.semester ? `· ${d.semester}` : ''} {d.file_size_kb ? `· ${d.file_size_kb} KB` : ''}</p>
                        </div>
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-navy-600 hover:text-navy-800 rounded hover:bg-navy-50"><ExternalLink className="w-4 h-4" /></a>
                        <button onClick={() => setConfirmConfig({ title: 'Delete Download', message: `Delete "${d.title}"?`, confirmLabel: 'Delete', danger: true, onConfirm: () => deleteDownload(d.id) })}
                          className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GALLERY */}
          {tab === 'gallery' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button onClick={() => setShowGalleryUpload(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Photo</button>
              </div>
              {showGalleryUpload && (
                <div className="card p-6">
                  <h2 className="font-serif font-bold text-navy-900 mb-4">Add Gallery Photo</h2>
                  <div className="space-y-4">
                    <div><label className="label">Title (optional)</label><input value={galleryUploadForm.title} onChange={(e) => setGalleryUploadForm((f) => ({ ...f, title: e.target.value }))} className="input-field" placeholder="Photo title..." /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="label">Album</label>
                        <select value={galleryUploadForm.album} onChange={(e) => setGalleryUploadForm((f) => ({ ...f, album: e.target.value }))} className="input-field">
                          <option value="General">General</option>
                          <option value="Events">Events</option>
                          <option value="Campus">Campus</option>
                          <option value="Graduation">Graduation</option>
                          <option value="Guests">Guests</option>
                        </select>
                      </div>
                      <div><label className="label">Link URL (optional)</label><input type="url" value={galleryUploadForm.link_url} onChange={(e) => setGalleryUploadForm((f) => ({ ...f, link_url: e.target.value }))} className="input-field" placeholder="https://facebook.com/..." />
                        <p className="text-xs text-slate-400 mt-1">Link to Facebook album, YouTube video, etc.</p>
                      </div>
                    </div>
                    <div>
                      <label className="label">Photo *</label>
                      <input type="file" accept="image/*" onChange={(e) => setGalleryUploadFile(e.target.files?.[0] ?? null)} className="input-field" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={uploadGalleryPhoto} disabled={galleryUploading || !galleryUploadFile} className="btn-primary">
                        {galleryUploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
                      </button>
                      <button type="button" onClick={() => { setShowGalleryUpload(false); setGalleryUploadForm({ title: '', album: 'General', link_url: '' }); setGalleryUploadFile(null); }} className="btn-secondary">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif font-bold text-navy-900">Gallery Management ({photos.length} photos)</h2>
                  <div className="flex items-center gap-2">
                    {galleryAlbums.map((album) => (
                      <button key={album} onClick={() => setGalleryFilter(album)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${galleryFilter === album ? 'bg-navy-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {album}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredPhotos.length === 0 ? (
                  <div className="py-16 text-center text-slate-400"><Image className="w-10 h-10 mx-auto mb-3 text-slate-300" /><p>No photos in this album.</p></div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredPhotos.map((photo) => (
                      <div key={photo.id} className="border border-slate-200 rounded-xl overflow-hidden group relative">
                        <div className="aspect-square bg-slate-100">
                          <img src={photo.image_url} alt={photo.title || ''} className="w-full h-full object-cover" />
                        </div>
                        {!photo.is_published && (
                          <div className="absolute top-1 left-1 bg-slate-900/70 text-white text-xs px-1.5 py-0.5 rounded">Draft</div>
                        )}
                        <div className="p-2 space-y-1.5">
                          <p className="text-xs font-medium text-navy-900 truncate">{photo.title || 'Untitled'}</p>
                          <p className="text-xs text-slate-400">{photo.album ?? 'General'}</p>

                          {/* Link URL */}
                          {galleryLinkEditing === photo.id ? (
                            <div className="space-y-1">
                              <input
                                type="url" value={galleryLinkValue}
                                onChange={(e) => setGalleryLinkValue(e.target.value)}
                                placeholder="https://..." autoFocus
                                className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy-500"
                              />
                              <div className="flex gap-1">
                                <button onClick={() => saveGalleryLink(photo.id)} disabled={galleryLinkSaving}
                                  className="flex-1 text-xs py-1 bg-navy-800 text-white rounded hover:bg-navy-700 transition-colors">
                                  {galleryLinkSaving ? <Loader className="w-3 h-3 animate-spin mx-auto" /> : 'Save'}
                                </button>
                                <button onClick={() => { setGalleryLinkEditing(null); setGalleryLinkValue(''); }}
                                  className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs rounded border border-slate-200">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setGalleryLinkEditing(photo.id); setGalleryLinkValue(photo.link_url ?? ''); }}
                              className="w-full flex items-center gap-1 text-xs text-slate-500 hover:text-navy-700 transition-colors">
                              <LinkIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{photo.link_url ? photo.link_url : 'Add link...'}</span>
                            </button>
                          )}

                          <div className="flex gap-1 pt-1">
                            <button onClick={() => togglePhotoPublished(photo)} title={photo.is_published ? 'Unpublish' : 'Publish'}
                              className="flex-1 text-xs py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
                              {photo.is_published ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                            </button>
                            <button onClick={() => setConfirmConfig({ title: 'Delete Photo', message: 'Delete this photo?', confirmLabel: 'Delete', danger: true, onConfirm: () => deletePhoto(photo.id) })}
                              className="px-2 py-1 text-red-500 hover:text-red-700 rounded border border-slate-200 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SITE IMAGES / SETTINGS */}
          {tab === 'settings' && (
            <div className="space-y-6">
              {/* Principal Greeting Settings */}
              <div className="card p-6">
                <h2 className="font-serif font-bold text-navy-900 text-lg mb-1">Principal Greeting</h2>
                <p className="text-slate-500 text-sm mb-5">Configure the principal greeting modal shown to first-time visitors.</p>
                {greetingSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-green-700 text-sm">
                    <Check className="w-4 h-4" /> Greeting settings saved!
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setGreetingEnabled(!greetingEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${greetingEnabled ? 'bg-navy-700' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${greetingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <label className="text-sm font-medium text-slate-700">Show greeting modal to first-time visitors</label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="label text-xs">Principal Name</label><input value={greetingName} onChange={(e) => setGreetingName(e.target.value)} className="input-field" placeholder="Rev. John Doe" /></div>
                    <div><label className="label text-xs">Principal Title</label><input value={greetingTitle} onChange={(e) => setGreetingTitle(e.target.value)} className="input-field" placeholder="Principal, ABC" /></div>
                  </div>
                  <div>
                    <label className="label text-xs">Principal Photo</label>
                    {greetingImageUrl && <img src={greetingImageUrl} alt="Principal" className="h-20 w-20 rounded-full object-cover mb-2 border-2 border-gold-300" />}
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer w-fit ${greetingImageUploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
                      {greetingImageUploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload Photo</>}
                      <input type="file" accept="image/*" className="hidden" disabled={greetingImageUploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadGreetingImage(f); }} />
                    </label>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button onClick={saveGreeting} disabled={greetingSaving} className="btn-primary">
                      {greetingSaving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Greeting</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hero Opacity */}
              <div className="card p-6">
                <h2 className="font-serif font-bold text-navy-900 text-lg mb-1">Hero Banner Opacity</h2>
                <p className="text-slate-500 text-sm mb-5">Control how dark the hero banner overlay is (0 = transparent, 1 = fully dark).</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <input type="range" min="0" max="1" step="0.05" value={heroOpacity} onChange={(e) => setHeroOpacity(parseFloat(e.target.value))} className="flex-1" />
                    <span className="text-sm font-mono text-slate-700 w-12 text-right">{heroOpacity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={saveHeroOpacity} disabled={heroOpacitySaving} className="btn-primary">
                      {heroOpacitySaving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction Visibility */}
              <div className="card p-6">
                <h2 className="font-serif font-bold text-navy-900 text-lg mb-1">Transaction History Visibility</h2>
                <p className="text-slate-500 text-sm mb-5">Control whether the public can see a user's transaction history when visiting their profile.</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveTransactionVisibility(!showTransactionsPublic)}
                      disabled={transactionVisibilitySaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showTransactionsPublic ? 'bg-navy-700' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showTransactionsPublic ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{showTransactionsPublic ? 'Public — visible to everyone' : 'Private — only visible to the user and admins'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Toggle to change visibility</p>
                    </div>
                    {transactionVisibilitySaving && <Loader className="w-4 h-4 text-slate-400 animate-spin" />}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg ${showTransactionsPublic ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {showTransactionsPublic ? <><Eye className="w-3.5 h-3.5" /> Public</> : <><EyeOff className="w-3.5 h-3.5" /> Private</>}
                  </div>
                </div>
              </div>

              {/* Role-Based Themes */}
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <Palette className="w-5 h-5 text-navy-700" />
                  <div>
                    <h2 className="font-serif font-bold text-navy-900">Role-Based Profile Themes</h2>
                    <p className="text-slate-500 text-sm">Set default themes for each role. Applied to users without a personal theme override.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: 'theme_role_admin', label: 'Admin Theme' },
                    { key: 'theme_role_faculty', label: 'Faculty Theme' },
                    { key: 'theme_role_student', label: 'Student Theme' },
                    { key: 'theme_role_standard', label: 'Standard User Theme' },
                    { key: 'theme_role_finance', label: 'Finance User Theme' },
                    { key: 'theme_graduated', label: 'Graduated Student Theme' },
                    { key: 'theme_banned', label: 'Banned User Theme' },
                  ] as { key: keyof typeof roleThemes; label: string }[]).map(({ key, label }) => (
                    <div key={key}>
                      <label className="label text-xs">{label}</label>
                      <select value={roleThemes[key]} onChange={(e) => setRoleThemes((t) => ({ ...t, [key]: e.target.value }))} className="input-field">
                        {THEMES.map((t) => <option key={t.id} value={t.id}>{t.label}{t.animated ? ' ✨' : ''}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {roleThemesSaveSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mt-4 animate-fade-in">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>Theme settings saved and synced successfully! All users without a personal theme override have been updated.</span>
                  </div>
                )}
                <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
                  <button onClick={saveRoleThemes} disabled={roleThemesSaving} className="btn-primary flex items-center gap-2">
                    {roleThemesSaving ? <><Loader className="w-4 h-4 animate-spin" /> Saving & Syncing...</> : <><Save className="w-4 h-4" /> Save & Sync Theme Settings</>}
                  </button>
                </div>
              </div>

              {/* Site Image Settings */}
              <div className="card p-6">
                <h2 className="font-serif font-bold text-navy-900 text-lg mb-1">Site Image Settings</h2>
                <p className="text-slate-500 text-sm mb-5">Upload photos directly to update images displayed on the site.</p>
                {settingsError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 mt-0.5" />{settingsError}
                  </div>
                )}
                {settingsSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-green-700 text-sm">
                    <Check className="w-4 h-4" /> Image updated successfully!
                  </div>
                )}
                <div className="space-y-5">
                  {siteSettings.filter((s) => s.setting_type === 'image').map((setting) => (
                    <div key={setting.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-36 h-24 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                          <img src={setting.setting_value} alt={setting.description || setting.setting_key}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-navy-900 mb-0.5">
                            {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-slate-500 mb-3">{setting.description}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <label htmlFor={`upload-${setting.setting_key}`}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${settingUploading === setting.setting_key ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-navy-800 text-white hover:bg-navy-700'}`}>
                              {settingUploading === setting.setting_key
                                ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</>
                                : <><Upload className="w-4 h-4" /> Upload New Image</>}
                            </label>
                            <input id={`upload-${setting.setting_key}`} type="file" accept="image/*" className="hidden"
                              disabled={settingUploading !== null}
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSiteImage(setting.setting_key, f); e.target.value = ''; }} />
                            <span className="text-xs text-slate-400">JPG, PNG, WebP recommended</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Board Members */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-serif font-bold text-navy-900">Board of Management</h2>
                  <button onClick={() => setShowBoardMemberForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Member</button>
                </div>
                {showBoardMemberForm && (
                  <form onSubmit={saveBoardMember} className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="label text-xs">Full Name *</label><input value={boardMemberForm.name} onChange={(e) => setBoardMemberForm((f) => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
                      <div><label className="label text-xs">Designation</label><input value={boardMemberForm.designation} onChange={(e) => setBoardMemberForm((f) => ({ ...f, designation: e.target.value }))} className="input-field" /></div>
                      <div><label className="label text-xs">Display Order</label><input type="number" value={boardMemberForm.display_order} onChange={(e) => setBoardMemberForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="input-field" /></div>
                      <div>
                        <label className="label text-xs">Photo</label>
                        <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer w-fit border border-slate-300 ${boardPhotoUploading ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}>
                          {boardPhotoUploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Photo</>}
                          <input type="file" accept="image/*" className="hidden" disabled={boardPhotoUploading} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const url = await uploadBoardPhoto(f); if (url) setBoardMemberForm((bf) => ({ ...bf, photo_url: url })); } }} />
                        </label>
                        {boardMemberForm.photo_url && <p className="text-xs text-green-600 mt-1">Photo uploaded</p>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingBoardMember} className="btn-primary text-sm">{savingBoardMember ? 'Saving...' : 'Add Member'}</button>
                      <button type="button" onClick={() => setShowBoardMemberForm(false)} className="btn-secondary text-sm">Cancel</button>
                    </div>
                  </form>
                )}
                <div className="divide-y divide-slate-100">
                  {boardMembers.map((b) => (
                    <div key={b.id} className="py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                        {b.photo_url ? <img src={b.photo_url} alt="" className="w-full h-full object-cover" /> : <Award className="w-5 h-5 text-slate-400 m-auto mt-2.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-navy-900 text-sm">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.designation || '—'}</p>
                      </div>
                      <button onClick={() => { setEditingBoardMember(b); setBoardEditForm({ name: b.name, designation: b.designation ?? '', photo_url: b.photo_url ?? '', display_order: b.display_order ?? 0 }); }}
                        className="p-1.5 text-navy-600 hover:text-navy-800 rounded hover:bg-navy-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmConfig({ title: 'Delete Board Member', message: `Delete ${b.name}?`, confirmLabel: 'Delete', danger: true, onConfirm: () => deleteBoardMember(b.id) })}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {boardMembers.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No board members added yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT */}
          {tab === 'payment' && (
            <div className="space-y-6">
              <div className="card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-5 h-5 text-navy-700" />
                  <h2 className="font-serif font-bold text-navy-900">Razorpay Payment Settings</h2>
                </div>
                {paymentSettingsSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4 text-green-700 text-sm">
                    <Check className="w-4 h-4" /> Payment settings saved successfully!
                  </div>
                )}
                <form onSubmit={savePaymentSettings} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <button type="button" onClick={() => setRazorpayEnabled(!razorpayEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${razorpayEnabled ? 'bg-navy-700' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${razorpayEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div>
                      <p className="font-medium text-navy-900 text-sm">Enable Razorpay Payments</p>
                      <p className="text-xs text-slate-500">{razorpayEnabled ? 'Online payments are active' : 'Online payments are disabled'}</p>
                    </div>
                  </div>
                  <div><label className="label">Key ID</label><input type="text" value={razorpayKeyId} onChange={(e) => setRazorpayKeyId(e.target.value)} className="input-field font-mono" placeholder="rzp_live_..." /></div>
                  <div><label className="label">Key Secret</label><input type="password" value={razorpayKeySecret} onChange={(e) => setRazorpayKeySecret(e.target.value)} className="input-field font-mono" placeholder="••••••••••••" /></div>
                  <div><label className="label">Webhook Secret</label><input type="password" value={razorpayWebhookSecret} onChange={(e) => setRazorpayWebhookSecret(e.target.value)} className="input-field font-mono" placeholder="••••••••••••" /></div>
                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" disabled={paymentSettingsSaving} className="btn-primary flex items-center gap-2">
                      {paymentSettingsSaving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Settings</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {tab === 'messages' && (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-serif font-bold text-navy-900">Contact Messages ({contactMessages.length})</h2>
                  {stats.unread_messages > 0 && (
                    <span className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">{stats.unread_messages} unread</span>
                  )}
                </div>
                {contactMessages.length === 0 ? (
                  <div className="text-center py-16"><Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No messages yet.</p></div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {contactMessages.map((msg) => (
                      <div key={msg.id} className={`p-5 transition-colors ${msg.is_read ? 'bg-white' : 'bg-blue-50/40'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.is_read ? 'bg-slate-100' : 'bg-navy-100'}`}>
                              <span className={`text-sm font-bold ${msg.is_read ? 'text-slate-600' : 'text-navy-700'}`}>{msg.name[0].toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-navy-900 text-sm">{msg.name}</p>
                                {!msg.is_read && <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full font-medium">New</span>}
                                {msg.subject && <span className="text-xs text-slate-500 capitalize">· {msg.subject.replace(/_/g, ' ')}</span>}
                              </div>
                              <a href={`mailto:${msg.email}`} className="text-xs text-navy-600 hover:text-navy-800 transition-colors">{msg.email}</a>
                              <p className="text-slate-700 text-sm mt-2 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                              <p className="text-slate-400 text-xs mt-2">{new Date(msg.submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!msg.is_read && (
                              <button onClick={() => markMessageRead(msg.id)} className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 transition-colors" title="Mark as read">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => deleteMessage(msg.id)} className="p-1.5 text-red-500 hover:text-red-700 rounded hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      </div>

      {/* Board Member Edit Modal */}
      {editingBoardMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingBoardMember(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-serif font-bold text-navy-900">Edit Board Member</h2>
              <button onClick={() => setEditingBoardMember(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveBoardMemberEdit} className="space-y-4">
              <div><label className="label text-xs">Full Name *</label><input value={boardEditForm.name} onChange={(e) => setBoardEditForm((f) => ({ ...f, name: e.target.value }))} className="input-field" required /></div>
              <div><label className="label text-xs">Designation</label><input value={boardEditForm.designation} onChange={(e) => setBoardEditForm((f) => ({ ...f, designation: e.target.value }))} className="input-field" /></div>
              <div><label className="label text-xs">Display Order</label><input type="number" value={boardEditForm.display_order} onChange={(e) => setBoardEditForm((f) => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="input-field" /></div>
              <div>
                <label className="label text-xs">Photo</label>
                <label className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer w-fit border border-slate-300 ${boardEditPhotoUploading ? 'text-slate-400' : 'text-slate-700 hover:bg-slate-50'}`}>
                  {boardEditPhotoUploading ? <><Loader className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Change Photo</>}
                  <input type="file" accept="image/*" className="hidden" disabled={boardEditPhotoUploading} onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setBoardEditPhotoUploading(true);
                    const ext = f.name.split('.').pop();
                    const fileName = `board/${Date.now()}.${ext}`;
                    const { error } = await supabase.storage.from('photos').upload(fileName, f, { upsert: true });
                    if (!error) {
                      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
                      setBoardEditForm((bf) => ({ ...bf, photo_url: publicUrl }));
                    }
                    setBoardEditPhotoUploading(false);
                  }} />
                </label>
                {boardEditForm.photo_url && <img src={boardEditForm.photo_url} alt="" className="w-16 h-16 rounded-full object-cover mt-2" />}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={savingBoardEdit} className="btn-primary">{savingBoardEdit ? 'Saving...' : 'Save Changes'}</button>
                <button type="button" onClick={() => setEditingBoardMember(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Graduation Modal */}
      {showGraduationModal && graduationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGraduationModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-gold-600" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-navy-900">Graduate Student</h2>
                <p className="text-sm text-slate-500">{graduationForm.userName}</p>
              </div>
              <button onClick={() => setShowGraduationModal(false)} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            {graduationError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4" /> {graduationError}
              </div>
            )}
            <form onSubmit={processGraduation} className="space-y-4">
              <div><label className="label text-xs">Course</label><input value={graduationForm.course} onChange={(e) => setGraduationForm((f) => f ? { ...f, course: e.target.value } : f)} className="input-field" placeholder="BTh, DipTh, CTh..." /></div>
              <div><label className="label text-xs">Completion Date *</label><input type="date" value={graduationForm.completionDate} onChange={(e) => setGraduationForm((f) => f ? { ...f, completionDate: e.target.value } : f)} className="input-field" required /></div>
              <div><label className="label text-xs">PATA Registration No.</label><input value={graduationForm.pataRegNo} onChange={(e) => setGraduationForm((f) => f ? { ...f, pataRegNo: e.target.value } : f)} className="input-field font-mono" placeholder="PATA-2024-001" /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={processingGraduation} className="btn-primary">
                  {processingGraduation ? <><Loader className="w-4 h-4 animate-spin" /> Processing...</> : <><GraduationCap className="w-4 h-4" /> Confirm Graduation</>}
                </button>
                <button type="button" onClick={() => setShowGraduationModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmConfig(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${confirmConfig.danger ? 'bg-red-100' : 'bg-navy-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${confirmConfig.danger ? 'text-red-600' : 'text-navy-600'}`} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-navy-900">{confirmConfig.title}</h3>
                <p className="text-sm text-slate-600 mt-1">{confirmConfig.message}</p>
                {confirmConfig.detail && <p className="text-xs text-slate-400 mt-1">{confirmConfig.detail}</p>}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmConfig(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={confirmConfig.onConfirm} className={`text-sm px-4 py-2 rounded-lg font-medium text-white transition-colors ${confirmConfig.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-navy-800 hover:bg-navy-700'}`}>
                {confirmConfig.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
