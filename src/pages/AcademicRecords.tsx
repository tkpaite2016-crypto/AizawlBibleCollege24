import { useEffect, useState } from 'react';
import { Search, Plus, Trash2, Save, X, Loader, GraduationCap, BookOpen, ArrowUp, ArrowDown, FileText, Award, AlertCircle, ChevronDown, ChevronRight, Download, Sparkles, Ban, Pencil } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { supabase } from '../lib/supabase';
import type { Profile, AcademicSubject, StudentMarksheet, StudentMark } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MarksheetDocument } from '../components/MarksheetDocument';

type SubjectForm = {
  id?: string;
  academic_year: string;
  year_of_study: number;
  semester: number;
  subject_name: string;
  credit_hours: number;
  display_order: number;
};

export default function AcademicRecords() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'subjects' | 'marksheets'>('subjects');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Profile | null>(null);
  const [marksheet, setMarksheet] = useState<StudentMarksheet | null>(null);
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [marksLoading, setMarksLoading] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectForm | null>(null);
  const [savingMarksheet, setSavingMarksheet] = useState(false);
  const [marksheetError, setMarksheetError] = useState('');
  const [expandedYear, setExpandedYear] = useState<string>('');
  const [revoking, setRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [editingMarksheet, setEditingMarksheet] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: subData }, { data: gradData }] = await Promise.all([
      supabase.from('academic_subjects').select('*').order('academic_year', { ascending: false }).order('year_of_study').order('semester').order('display_order'),
      supabase.from('profiles').select('*').eq('graduated', true).order('full_name', { ascending: true }),
    ]);
    setSubjects(subData ?? []);
    setStudents(gradData ?? []);
    setLoading(false);
  }

  const filteredStudents = studentSearch.trim().length < 2
    ? students
    : students.filter((s) => (s.full_name ?? '').toLowerCase().includes(studentSearch.toLowerCase()) || (s.email ?? '').toLowerCase().includes(studentSearch.toLowerCase()));

  function groupSubjects() {
    const groups: Record<string, AcademicSubject[]> = {};
    for (const s of subjects) {
      const key = `${s.academic_year} · Year ${s.year_of_study} · Sem ${s.semester}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }

  async function saveSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSubject || !editingSubject.subject_name.trim()) return;
    setSavingSubject(true);
    const payload = {
      academic_year: editingSubject.academic_year,
      year_of_study: editingSubject.year_of_study,
      semester: editingSubject.semester,
      subject_name: editingSubject.subject_name.trim(),
      credit_hours: editingSubject.credit_hours,
      display_order: editingSubject.display_order,
      created_by: profile?.id,
    };
    if (editingSubject.id) {
      const { data } = await supabase.from('academic_subjects').update(payload).eq('id', editingSubject.id).select().single();
      if (data) setSubjects((prev) => prev.map((s) => s.id === data.id ? data : s));
    } else {
      const { data } = await supabase.from('academic_subjects').insert(payload).select().single();
      if (data) setSubjects((prev) => [...prev, data]);
    }
    setEditingSubject(null);
    setSavingSubject(false);
  }

  async function deleteSubject(id: string) {
    await supabase.from('academic_subjects').delete().eq('id', id);
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }

  async function moveSubject(id: string, dir: -1 | 1) {
    const sub = subjects.find((s) => s.id === id);
    if (!sub) return;
    const newOrder = sub.display_order + dir;
    const { data } = await supabase.from('academic_subjects').update({ display_order: newOrder }).eq('id', id).select().single();
    if (data) setSubjects((prev) => prev.map((s) => s.id === id ? data : s));
  }

  async function selectStudentForMarksheet(student: Profile) {
    setSelectedStudent(student);
    setMarksheetError('');
    setMarksLoading(true);
    setEditingMarksheet(false);
    const { data: ms } = await supabase.from('student_marksheets').select('*').eq('student_id', student.id).maybeSingle();
    if (ms) {
      setMarksheet(ms as StudentMarksheet);
      const { data: mk } = await supabase.from('student_marks').select('*').eq('marksheet_id', ms.id).order('year_of_study').order('semester').order('display_order');
      setMarks((mk as StudentMark[]) ?? []);
    } else {
      setMarksheet(null);
      setMarks([]);
    }
    setMarksLoading(false);
  }

  async function revokeMarksheet() {
    if (!marksheet || !selectedStudent) return;
    setRevoking(true);
    await supabase.from('student_marks').delete().eq('marksheet_id', marksheet.id);
    const { error } = await supabase.from('student_marksheets').delete().eq('id', marksheet.id);
    if (!error) {
      setMarksheet(null);
      setMarks([]);
      setEditingMarksheet(false);
    } else {
      setMarksheetError('Could not revoke marksheet.');
    }
    setRevoking(false);
    setShowRevokeConfirm(false);
  }

  function addMarkRow(year: number, semester: number) {
    setMarks((prev) => [...prev, { academic_year: '', year_of_study: year, semester, subject_name: '', credit_hours: 3, marks: 0, grade: '', display_order: prev.length }]);
  }

  async function autoFetchSubjects(year: number, semester: number) {
    const { data } = await supabase
      .from('academic_subjects')
      .select('*')
      .eq('year_of_study', year)
      .eq('semester', semester)
      .order('display_order');
    if (!data || data.length === 0) return;
    const existing = new Set(marks.filter((m) => m.year_of_study === year && m.semester === semester).map((m) => m.subject_name));
    const newRows: StudentMark[] = (data as AcademicSubject[])
      .filter((s) => !existing.has(s.subject_name))
      .map((s, i) => ({
        academic_year: s.academic_year,
        year_of_study: s.year_of_study,
        semester: s.semester,
        subject_name: s.subject_name,
        credit_hours: s.credit_hours,
        marks: 0,
        grade: '',
        display_order: marks.length + i,
      }));
    if (newRows.length > 0) {
      setMarks((prev) => [...prev, ...newRows]);
    }
  }

  function updateMark(index: number, field: keyof StudentMark, value: any) {
    setMarks((prev) => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  }

  function removeMark(index: number) {
    setMarks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveMark(index: number, dir: -1 | 1) {
    setMarks((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveMarksheet() {
    if (!selectedStudent) return;
    setMarksheetError('');
    setSavingMarksheet(true);

    if (!marksheet) {
      const { data: newMs, error } = await supabase.from('student_marksheets').insert({
        student_id: selectedStudent.id,
        course: selectedStudent.course,
        issued_by: profile?.id,
      }).select().single();
      if (error) { setMarksheetError('Could not create marksheet.'); setSavingMarksheet(false); return; }
      setMarksheet(newMs as StudentMarksheet);
    }

    const msId = marksheet?.id;
    if (msId) {
      const { error: delErr } = await supabase.from('student_marks').delete().eq('marksheet_id', msId);
      if (delErr) { setMarksheetError('Could not clear old marks.'); setSavingMarksheet(false); return; }

      const validMarks = marks.filter((m) => m.subject_name.trim());
      if (validMarks.length > 0) {
        const { error: insErr } = await supabase.from('student_marks').insert(
          validMarks.map((m, i) => ({
            marksheet_id: msId,
            academic_year: m.academic_year || null,
            year_of_study: m.year_of_study,
            semester: m.semester,
            subject_name: m.subject_name.trim(),
            credit_hours: m.credit_hours,
            marks: m.marks,
            grade: m.grade || null,
            display_order: i,
          }))
        );
        if (insErr) { setMarksheetError('Could not save marks.'); setSavingMarksheet(false); return; }
      }

      const { data: updated } = await supabase.from('student_marksheets').update({
        course: selectedStudent.course,
        student_name: marksheet?.student_name || null,
        course_override: marksheet?.course_override || null,
        updated_at: new Date().toISOString(),
      }).eq('id', msId).select().single();
      if (updated) setMarksheet(updated as StudentMarksheet);
    }

    setSavingMarksheet(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader className="w-7 h-7 animate-spin text-gold-500" />
      </div>
    );
  }

  const grouped = groupSubjects();

  return (
    <div className="page-enter min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-serif font-bold text-navy-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-gold-500" /> Academic Records
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage subjects and student marksheets. Visible to faculty and admin only.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('subjects')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'subjects' ? 'bg-navy-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <BookOpen className="w-4 h-4 inline mr-1.5" /> Subjects
          </button>
          <button onClick={() => setTab('marksheets')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'marksheets' ? 'bg-navy-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
            <FileText className="w-4 h-4 inline mr-1.5" /> Marksheets
          </button>
        </div>

        {/* SUBJECTS TAB */}
        {tab === 'subjects' && (
          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif font-bold text-navy-900">Academic Subjects</h2>
                <button onClick={() => setEditingSubject({ academic_year: new Date().getFullYear().toString(), year_of_study: 1, semester: 1, subject_name: '', credit_hours: 3, display_order: subjects.length })} className="btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add Subject
                </button>
              </div>

              {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p>No subjects added yet. Click "Add Subject" to create one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([key, subs]) => (
                    <div key={key} className="border border-slate-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedYear(expandedYear === key ? '' : key)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <span className="font-medium text-navy-900 text-sm flex items-center gap-2">
                          {expandedYear === key ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {key}
                        </span>
                        <span className="text-xs text-slate-500">{subs.length} subject{subs.length !== 1 ? 's' : ''}</span>
                      </button>
                      {expandedYear === key && (
                        <div className="divide-y divide-slate-100">
                          {subs.map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-navy-900">{s.subject_name}</p>
                                <p className="text-xs text-slate-500">{s.credit_hours} credit hours · Order {s.display_order}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => moveSubject(s.id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => moveSubject(s.id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-navy-700 hover:bg-slate-100 rounded-lg transition-colors" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setEditingSubject({ id: s.id, academic_year: s.academic_year, year_of_study: s.year_of_study, semester: s.semester, subject_name: s.subject_name, credit_hours: s.credit_hours, display_order: s.display_order })} className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors" title="Edit"><FileText className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteSubject(s.id)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subject edit modal */}
            {editingSubject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingSubject(null)}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-serif font-bold text-navy-900">{editingSubject.id ? 'Edit Subject' : 'Add Subject'}</h2>
                    <button onClick={() => setEditingSubject(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                  </div>
                  <form onSubmit={saveSubject} className="space-y-3">
                    <div>
                      <label className="label">Subject Name</label>
                      <input value={editingSubject.subject_name} onChange={(e) => setEditingSubject((f) => f ? { ...f, subject_name: e.target.value } : f)} className="input-field" placeholder="e.g., Old Testament Survey" required />
                    </div>
                    <div>
                      <label className="label">Academic Year</label>
                      <input value={editingSubject.academic_year} onChange={(e) => setEditingSubject((f) => f ? { ...f, academic_year: e.target.value } : f)} className="input-field" placeholder="e.g., 2024-2025" required />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="label">Year</label>
                        <select value={editingSubject.year_of_study} onChange={(e) => setEditingSubject((f) => f ? { ...f, year_of_study: parseInt(e.target.value) } : f)} className="input-field">
                          <option value={1}>Year 1</option>
                          <option value={2}>Year 2</option>
                          <option value={3}>Year 3</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Semester</label>
                        <select value={editingSubject.semester} onChange={(e) => setEditingSubject((f) => f ? { ...f, semester: parseInt(e.target.value) } : f)} className="input-field">
                          <option value={1}>Sem 1</option>
                          <option value={2}>Sem 2</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Credits</label>
                        <input type="number" step="0.5" min="1" max="20" value={editingSubject.credit_hours} onChange={(e) => setEditingSubject((f) => f ? { ...f, credit_hours: parseFloat(e.target.value) } : f)} className="input-field" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" disabled={savingSubject} className="btn-primary flex-1 justify-center">
                        {savingSubject ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
                      </button>
                      <button type="button" onClick={() => setEditingSubject(null)} className="btn-secondary">Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKSHEETS TAB */}
        {tab === 'marksheets' && (
          <div className="space-y-4">
            {/* Student search */}
            <div className="card p-4">
              <h2 className="font-serif font-bold text-navy-900 mb-3">Select Graduated Student</h2>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="input-field pl-10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredStudents.slice(0, 20).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => selectStudentForMarksheet(s)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${selectedStudent?.id === s.id ? 'bg-navy-100 text-navy-900' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-navy-200 flex items-center justify-center text-xs font-bold text-navy-700 flex-shrink-0">
                      {(s.full_name ?? 'U')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{s.full_name ?? 'No name'}</p>
                      <p className="text-xs text-slate-500 truncate">{s.email}</p>
                    </div>
                    {s.graduated && <Award className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  </button>
                ))}
                {filteredStudents.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No graduated students found.</p>}
              </div>
            </div>

            {/* Marksheet editor */}
            {selectedStudent && (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-serif font-bold text-navy-900">Marksheet: {selectedStudent.full_name ?? 'Unknown'}</h2>
                    <p className="text-xs text-slate-500">{selectedStudent.course || 'No course'} · {selectedStudent.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {marksheet && marks.length > 0 && marks.some((m) => m.subject_name.trim()) && (
                      <PDFDownloadLink
                        document={
                          <MarksheetDocument
                            studentName={marksheet.student_name || selectedStudent.full_name || 'Student'}
                            course={marksheet.course_override || selectedStudent.course || ''}
                            abNumber={(selectedStudent as any).ab_number}
                            pataRegNo={(selectedStudent as any).pata_reg_no}
                            marks={marks.filter((m) => m.subject_name.trim())}
                            finalGrade={marksheet.final_grade ?? undefined}
                            gpa={marksheet.gpa}
                            classResult={marksheet.class_result ?? undefined}
                            remarks={marksheet.remarks ?? undefined}
                            generatedDate={new Date().toISOString()}
                          />
                        }
                        fileName={`${selectedStudent.full_name?.replace(/\s+/g, '_') || 'Student'}_Marksheet.pdf`}
                        className="btn-secondary text-sm flex items-center gap-2"
                      >
                        {({ loading: l }) => (
                          <>{l ? <><Loader className="w-4 h-4 animate-spin" /> Preparing...</> : <><Download className="w-4 h-4" /> Download PDF</>}</>
                        )}
                      </PDFDownloadLink>
                    )}
                    {marksheet && (
                      <button
                        onClick={() => setEditingMarksheet((v) => !v)}
                        className={`text-sm px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${editingMarksheet ? 'bg-gold-100 text-gold-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        <Pencil className="w-4 h-4" /> {editingMarksheet ? 'Done Editing' : 'Edit'}
                      </button>
                    )}
                    <button onClick={saveMarksheet} disabled={savingMarksheet} className="btn-primary text-sm">
                      {savingMarksheet ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Marksheet</>}
                    </button>
                    {marksheet && (
                      <button
                        onClick={() => setShowRevokeConfirm(true)}
                        disabled={revoking}
                        className="text-sm px-3 py-2 rounded-lg flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        <Ban className="w-4 h-4" /> Revoke
                      </button>
                    )}
                  </div>
                </div>

                {marksheetError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{marksheetError}
                  </div>
                )}

                {marksLoading ? (
                  <div className="flex justify-center py-8"><Loader className="w-6 h-6 animate-spin text-gold-500" /></div>
                ) : (
                  <div className="space-y-4">
                  {!editingMarksheet && marksheet && marks.length > 0 ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm font-medium">
                      <Award className="w-4 h-4" /> Marksheet issued. Click "Edit" to modify marks or summary.
                    </div>
                  ) : (
                    <>
                    {/* Summary fields */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl">
                      <div>
                        <label className="label text-xs">Student Name (override)</label>
                        <input value={marksheet?.student_name ?? ''} onChange={(e) => setMarksheet((m) => m ? { ...m, student_name: e.target.value } : m)} className="input-field text-sm" placeholder="Use profile name if empty" />
                      </div>
                      <div>
                        <label className="label text-xs">Course (override)</label>
                        <input value={marksheet?.course_override ?? ''} onChange={(e) => setMarksheet((m) => m ? { ...m, course_override: e.target.value } : m)} className="input-field text-sm" placeholder="Use profile course if empty" />
                      </div>
                      <div>
                        <label className="label text-xs">Final Grade</label>
                        <input value={marksheet?.final_grade ?? ''} onChange={(e) => setMarksheet((m) => m ? { ...m, final_grade: e.target.value } : m)} className="input-field text-sm" placeholder="A" />
                      </div>
                      <div>
                        <label className="label text-xs">GPA</label>
                        <input type="number" step="0.01" min="0" max="4" value={marksheet?.gpa ?? ''} onChange={(e) => setMarksheet((m) => m ? { ...m, gpa: parseFloat(e.target.value) || null } : m)} className="input-field text-sm" placeholder="3.50" />
                      </div>
                      <div>
                        <label className="label text-xs">Class Result</label>
                        <input value={marksheet?.class_result ?? ''} onChange={(e) => setMarksheet((m) => m ? { ...m, class_result: e.target.value } : m)} className="input-field text-sm" placeholder="First Class" />
                      </div>
                      <div>
                        <label className="label text-xs">Remarks</label>
                        <input value={marksheet?.remarks ?? ''} onChange={(e) => setMarksheet((m) => m ? { ...m, remarks: e.target.value } : m)} className="input-field text-sm" placeholder="Excellent" />
                      </div>
                    </div>

                    {/* Marks table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-slate-200 rounded-lg">
                        <thead className="bg-navy-50 text-navy-800 text-xs uppercase">
                          <tr>
                            <th className="px-3 py-2 text-left">Year</th>
                            <th className="px-3 py-2 text-left">Sem</th>
                            <th className="px-3 py-2 text-left">Academic Year</th>
                            <th className="px-3 py-2 text-left">Subject</th>
                            <th className="px-3 py-2 text-left">Credits</th>
                            <th className="px-3 py-2 text-left">Marks</th>
                            <th className="px-3 py-2 text-left">Grade</th>
                            <th className="px-3 py-2 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {marks.map((m, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-2 py-1.5">
                                <select value={m.year_of_study} onChange={(e) => updateMark(i, 'year_of_study', parseInt(e.target.value))} className="w-16 text-xs border border-slate-200 rounded px-1 py-1">
                                  <option value={1}>Y1</option><option value={2}>Y2</option><option value={3}>Y3</option>
                                </select>
                              </td>
                              <td className="px-2 py-1.5">
                                <select value={m.semester} onChange={(e) => updateMark(i, 'semester', parseInt(e.target.value))} className="w-16 text-xs border border-slate-200 rounded px-1 py-1">
                                  <option value={1}>S1</option><option value={2}>S2</option>
                                </select>
                              </td>
                              <td className="px-2 py-1.5"><input value={m.academic_year} onChange={(e) => updateMark(i, 'academic_year', e.target.value)} className="w-24 text-xs border border-slate-200 rounded px-1 py-1" placeholder="2024" /></td>
                              <td className="px-2 py-1.5"><input value={m.subject_name} onChange={(e) => updateMark(i, 'subject_name', e.target.value)} className="w-40 text-xs border border-slate-200 rounded px-1 py-1" placeholder="Subject name" /></td>
                              <td className="px-2 py-1.5"><input type="number" step="0.5" min="1" max="20" value={m.credit_hours} onChange={(e) => updateMark(i, 'credit_hours', parseFloat(e.target.value))} className="w-14 text-xs border border-slate-200 rounded px-1 py-1" /></td>
                              <td className="px-2 py-1.5"><input type="number" min="0" max="100" value={m.marks} onChange={(e) => updateMark(i, 'marks', parseFloat(e.target.value))} className="w-14 text-xs border border-slate-200 rounded px-1 py-1" /></td>
                              <td className="px-2 py-1.5"><input value={m.grade} onChange={(e) => updateMark(i, 'grade', e.target.value)} className="w-12 text-xs border border-slate-200 rounded px-1 py-1" placeholder="A" /></td>
                              <td className="px-2 py-1.5">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button onClick={() => moveMark(i, -1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-navy-700 rounded"><ArrowUp className="w-3 h-3" /></button>
                                  <button onClick={() => moveMark(i, 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-navy-700 rounded"><ArrowDown className="w-3 h-3" /></button>
                                  <button onClick={() => removeMark(i)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-600 rounded"><X className="w-3 h-3" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Auto-fetch and add mark row buttons */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1"><Sparkles className="w-3 h-3 text-gold-500" /> Auto-fetch subjects:</span>
                        <button onClick={() => autoFetchSubjects(1, 1)} className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors">Y1 S1</button>
                        <button onClick={() => autoFetchSubjects(1, 2)} className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors">Y1 S2</button>
                        <button onClick={() => autoFetchSubjects(2, 1)} className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors">Y2 S1</button>
                        <button onClick={() => autoFetchSubjects(2, 2)} className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors">Y2 S2</button>
                        <button onClick={() => autoFetchSubjects(3, 1)} className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors">Y3 S1</button>
                        <button onClick={() => autoFetchSubjects(3, 2)} className="text-xs px-3 py-1.5 bg-gold-100 text-gold-700 rounded-lg hover:bg-gold-200 transition-colors">Y3 S2</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => addMarkRow(1, 1)} className="text-xs px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors"><Plus className="w-3 h-3 inline" /> Y1 S1</button>
                        <button onClick={() => addMarkRow(1, 2)} className="text-xs px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors"><Plus className="w-3 h-3 inline" /> Y1 S2</button>
                        <button onClick={() => addMarkRow(2, 1)} className="text-xs px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors"><Plus className="w-3 h-3 inline" /> Y2 S1</button>
                        <button onClick={() => addMarkRow(2, 2)} className="text-xs px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors"><Plus className="w-3 h-3 inline" /> Y2 S2</button>
                        <button onClick={() => addMarkRow(3, 1)} className="text-xs px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors"><Plus className="w-3 h-3 inline" /> Y3 S1</button>
                        <button onClick={() => addMarkRow(3, 2)} className="text-xs px-3 py-1.5 bg-navy-100 text-navy-700 rounded-lg hover:bg-navy-200 transition-colors"><Plus className="w-3 h-3 inline" /> Y3 S2</button>
                      </div>
                    </div>
                    </>
                  )}
                  </div>
                )}

                {/* Revoke confirmation modal */}
                {showRevokeConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowRevokeConfirm(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Ban className="w-5 h-5 text-red-600" />
                        </div>
                        <h3 className="text-lg font-serif font-bold text-navy-900">Revoke Marksheet</h3>
                      </div>
                      <p className="text-sm text-slate-600 mb-5">
                        This will permanently delete the marksheet and all its marks for {selectedStudent?.full_name ?? 'this student'}. This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowRevokeConfirm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                        <button onClick={revokeMarksheet} disabled={revoking} className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                          {revoking ? <><Loader className="w-4 h-4 animate-spin" /> Revoking...</> : <><Ban className="w-4 h-4" /> Revoke</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
