import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

type MarkRow = {
  year_of_study: number;
  semester: number;
  academic_year: string;
  subject_name: string;
  credit_hours: number;
  marks: number;
  grade: string;
  display_order: number;
};

type Props = {
  studentName: string;
  course: string;
  abNumber?: string;
  pataRegNo?: string;
  marks: MarkRow[];
  finalGrade?: string;
  gpa?: number | null;
  classResult?: string;
  remarks?: string;
  generatedDate: string;
};

type SemesterRow = MarkRow & { serialNumber: number };

const BLUE = '#0d5ca8';
const INK = '#111111';
const PAPER = '#ffffff';
const BORDER = '#333333';
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CONTENT_WIDTH = 515;
const SEMESTER_WIDTH = CONTENT_WIDTH / 2;
const SERIAL_WIDTH = 26;
const SUBJECT_WIDTH = 130;
const CREDIT_WIDTH = 50;
const MARK_WIDTH = 51;

const S = StyleSheet.create({
  page: {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    backgroundColor: PAPER,
    color: INK,
    fontFamily: 'Times-Roman',
    paddingTop: 18,
    paddingHorizontal: 40,
    paddingBottom: 14,
  },
  header: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: 'contain',
    marginRight: 10,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  collegeName: {
    color: BLUE,
    fontFamily: 'Times-Bold',
    fontSize: 14,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  registration: {
    fontFamily: 'Times-Bold',
    fontSize: 7.5,
    marginTop: 2,
    textAlign: 'center',
  },
  institution: {
    fontFamily: 'Times-BoldItalic',
    fontSize: 7.2,
    marginTop: 2,
    textAlign: 'center',
  },
  accreditation: {
    fontFamily: 'Times-Bold',
    fontSize: 6.8,
    marginTop: 1.5,
    textAlign: 'center',
  },
  address: {
    fontFamily: 'Times-Bold',
    fontSize: 6.8,
    marginTop: 1.5,
    textAlign: 'center',
  },
  rule: {
    width: CONTENT_WIDTH,
    height: 0.8,
    backgroundColor: BORDER,
    marginTop: 4,
  },
  transcriptTitle: {
    width: CONTENT_WIDTH,
    fontFamily: 'Times-Bold',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 3,
    marginBottom: 6,
  },
  studentInfo: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  infoLine: {
    flexDirection: 'row',
    fontSize: 8.5,
    fontFamily: 'Times-Bold',
  },
  infoValue: {
    fontFamily: 'Times-Roman',
    marginLeft: 20,
  },
  infoValueCourse: {
    fontFamily: 'Times-Bold',
    marginLeft: 16,
  },
  yearSection: {
    width: CONTENT_WIDTH,
    borderWidth: 0.6,
    borderColor: BORDER,
    marginTop: 2,
  },
  yearTitle: {
    width: CONTENT_WIDTH,
    height: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.6,
    borderBottomColor: BORDER,
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
  },
  semesterHeaderRow: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    height: 13,
    borderBottomWidth: 0.6,
    borderBottomColor: BORDER,
  },
  semesterHeader: {
    width: SEMESTER_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 7.8,
  },
  leftBorder: {
    borderLeftWidth: 0.6,
    borderLeftColor: BORDER,
  },
  columnHeaderRow: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    height: 13,
    borderBottomWidth: 0.6,
    borderBottomColor: BORDER,
  },
  semesterColumnHeader: {
    width: SEMESTER_WIDTH,
    flexDirection: 'row',
  },
  cellHeader: {
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: 'Times-Bold',
    fontSize: 6.8,
    textAlign: 'center',
    borderRightWidth: 0.6,
    borderRightColor: BORDER,
  },
  serialCell: { width: SERIAL_WIDTH },
  subjectCell: { width: SUBJECT_WIDTH, paddingHorizontal: 2 },
  creditCell: { width: CREDIT_WIDTH },
  markCell: { width: MARK_WIDTH, borderRightWidth: 0 },
  marksRow: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    minHeight: 13,
    borderBottomWidth: 0.6,
    borderBottomColor: BORDER,
  },
  semesterMarks: {
    width: SEMESTER_WIDTH,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cell: {
    justifyContent: 'center',
    fontSize: 7,
    borderRightWidth: 0.6,
    borderRightColor: BORDER,
    paddingVertical: 1.5,
  },
  serialText: { width: SERIAL_WIDTH, textAlign: 'center' },
  subjectText: { width: SUBJECT_WIDTH, paddingHorizontal: 3, textAlign: 'left' },
  creditText: { width: CREDIT_WIDTH, textAlign: 'center' },
  markText: { width: MARK_WIDTH, textAlign: 'center', borderRightWidth: 0 },
  remarkTitle: {
    width: CONTENT_WIDTH,
    height: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.6,
    borderColor: BORDER,
    marginTop: 2,
    fontFamily: 'Times-Bold',
    fontSize: 8,
  },
  resultRow: {
    width: CONTENT_WIDTH,
    height: 26,
    flexDirection: 'row',
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: BORDER,
  },
  resultCell: {
    width: CONTENT_WIDTH / 3,
    justifyContent: 'center',
    paddingHorizontal: 6,
    fontFamily: 'Times-Bold',
    fontSize: 8,
    textAlign: 'center',
    borderRightWidth: 0.6,
    borderRightColor: BORDER,
  },
  lastResultCell: { borderRightWidth: 0 },
  gradingTitle: {
    width: CONTENT_WIDTH,
    height: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 0.6,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: BORDER,
    fontFamily: 'Times-Bold',
    fontSize: 8,
  },
  gradingTable: {
    width: CONTENT_WIDTH,
    borderLeftWidth: 0.6,
    borderTopWidth: 0.6,
    borderColor: BORDER,
  },
  gradingRow: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    minHeight: 13,
  },
  gradingCell: {
    width: CONTENT_WIDTH / 6,
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: BORDER,
    fontSize: 6.8,
    textAlign: 'center',
  },
  gradingHeader: { fontFamily: 'Times-Bold', fontSize: 7 },
  footer: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  seal: {
    width: 64,
    height: 64,
    objectFit: 'contain',
    marginLeft: 150,
  },
  signatureBlock: {
    flex: 1,
    alignItems: 'center',
    marginTop: 28,
    marginLeft: 30,
  },
  signatureLine: {
    width: 100,
    borderBottomWidth: 0.7,
    borderBottomColor: INK,
    marginBottom: 2,
  },
  signatureText: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
  },
});

function getSemesterRows(marks: MarkRow[], year: number, semester: number): SemesterRow[] {
  return marks
    .filter((mark) => mark.year_of_study === year && mark.semester === semester)
    .sort((a, b) => a.display_order - b.display_order)
    .map((mark, index) => ({ ...mark, serialNumber: index + 1 }));
}

function renderSemesterRow(mark: SemesterRow | undefined) {
  return (
    <View style={S.semesterMarks}>
      <Text style={[S.cell, S.serialText]}>{mark?.serialNumber ?? ''}</Text>
      <Text style={[S.cell, S.subjectText]}>{mark?.subject_name ?? ''}</Text>
      <Text style={[S.cell, S.creditText]}>{mark?.credit_hours ?? ''}</Text>
      <Text style={[S.cell, S.markText]}>{mark?.marks ?? ''}</Text>
    </View>
  );
}

function YearSection({ year, marks }: { year: number; marks: MarkRow[] }) {
  const firstSemester = getSemesterRows(marks, year, 1);
  const secondSemester = getSemesterRows(marks, year, 2);
  const rowCount = Math.max(firstSemester.length, secondSemester.length, 1);

  return (
    <View style={S.yearSection} wrap={false}>
      <Text style={S.yearTitle}>{year === 1 ? 'FIRST YEAR' : year === 2 ? 'SECOND YEAR' : 'THIRD YEAR'}</Text>
      <View style={S.semesterHeaderRow}>
        <Text style={S.semesterHeader}>FIRST SEMESTER</Text>
        <Text style={[S.semesterHeader, S.leftBorder]}>SECOND SEMESTER</Text>
      </View>
      <View style={S.columnHeaderRow}>
        <View style={S.semesterColumnHeader}>
          <Text style={[S.cellHeader, S.serialCell]}>Sl. No</Text>
          <Text style={[S.cellHeader, S.subjectCell]}>SUBJECTS</Text>
          <Text style={[S.cellHeader, S.creditCell]}>Credit Hr</Text>
          <Text style={[S.cellHeader, S.markCell]}>Marks</Text>
        </View>
        <View style={[S.semesterColumnHeader, S.leftBorder]}>
          <Text style={[S.cellHeader, S.serialCell]}>Sl. No</Text>
          <Text style={[S.cellHeader, S.subjectCell]}>SUBJECTS</Text>
          <Text style={[S.cellHeader, S.creditCell]}>Credit Hr</Text>
          <Text style={[S.cellHeader, S.markCell]}>Marks</Text>
        </View>
      </View>
      {Array.from({ length: rowCount }).map((_, index) => (
        <View key={index} style={S.marksRow}>
          <View style={{ width: SEMESTER_WIDTH }}>{renderSemesterRow(firstSemester[index])}</View>
          <View style={[{ width: SEMESTER_WIDTH }, S.leftBorder]}>{renderSemesterRow(secondSemester[index])}</View>
        </View>
      ))}
    </View>
  );
}

export function MarksheetDocument({
  studentName,
  course,
  abNumber,
  marks,
  finalGrade,
  gpa,
  classResult,
  remarks,
  generatedDate,
}: Props) {
  const generated = new Date(generatedDate);
  const academicYear = marks.find((mark) => mark.academic_year)?.academic_year || '2023-2026';
  const displayCourse = course || 'Bachelor of Theology';
  const displayClass = classResult || '—';
  const displayGrade = finalGrade || '—';
  const displayGpa = gpa != null ? gpa.toFixed(1) : '—';

  return (
    <Document title={`${studentName} Transcript`} author="Aizawl Bible College">
      <Page size={[PAGE_WIDTH, PAGE_HEIGHT]} style={S.page}>
        <View style={S.header}>
          <Image src="/logo.png" style={S.logo} />
          <View style={S.headerText}>
            <Text style={S.collegeName}>AIZAWL BIBLE COLLEGE</Text>
            <Text style={S.registration}>Regd No: MSR 1801 of 29.07.2025</Text>
            <Text style={S.institution}>A Theological Institution of Assemblies of God Mizoram District</Text>
            <Text style={S.accreditation}>Accredited by Pentecostal Association for Theological Accreditation (PATA)</Text>
            <Text style={S.address}>Post Box – 115, Tuikhual North 'D' Mual, Aizawl – 796001, Mizoram, India</Text>
          </View>
        </View>
        <View style={S.rule} />
        <Text style={S.transcriptTitle}>TRANSCRIPT</Text>

        <View style={S.studentInfo}>
          <Text style={S.infoLine}>Name: <Text style={S.infoValue}>{studentName}</Text></Text>
          <Text style={S.infoLine}>AB No: <Text style={S.infoValue}>{abNumber || '—'}</Text></Text>
        </View>
        <View style={S.studentInfo}>
          <Text style={S.infoLine}>Course: <Text style={S.infoValueCourse}>{displayCourse}</Text></Text>
          <Text style={S.infoLine}>Year of Study : {academicYear}</Text>
        </View>

        {[1, 2, 3].map((year) => <YearSection key={year} year={year} marks={marks} />)}

        <Text style={S.remarkTitle}>REMARK</Text>
        <View style={S.resultRow}>
          <Text style={S.resultCell}>Class : {displayClass}</Text>
          <Text style={S.resultCell}>Final Grade : {displayGrade}</Text>
          <Text style={[S.resultCell, S.lastResultCell]}>GPA : {displayGpa}</Text>
        </View>

        <Text style={S.gradingTitle}>GRADING SYSTEM</Text>
        <View style={S.gradingTable}>
          <View style={S.gradingRow}>
            <Text style={[S.gradingCell, S.gradingHeader]}>First Class</Text>
            <Text style={[S.gradingCell, S.gradingHeader]}>GPA</Text>
            <Text style={[S.gradingCell, S.gradingHeader]}>Second Class</Text>
            <Text style={[S.gradingCell, S.gradingHeader]}>GPA</Text>
            <Text style={[S.gradingCell, S.gradingHeader]}>Third Class</Text>
            <Text style={[S.gradingCell, S.gradingHeader]}>GPA</Text>
          </View>
          <View style={S.gradingRow}>
            <Text style={S.gradingCell}>A+ = 80% &amp; Above</Text><Text style={S.gradingCell}>4.0</Text>
            <Text style={S.gradingCell}>B+ = 65 - 69%</Text><Text style={S.gradingCell}>3.0</Text>
            <Text style={S.gradingCell}>C+ = 50 - 54%</Text><Text style={S.gradingCell}>2.0</Text>
          </View>
          <View style={S.gradingRow}>
            <Text style={S.gradingCell}>A = 75 - 79%</Text><Text style={S.gradingCell}>3.7</Text>
            <Text style={S.gradingCell}>B = 60 - 64%</Text><Text style={S.gradingCell}>2.7</Text>
            <Text style={S.gradingCell}>C = 45 - 49%</Text><Text style={S.gradingCell}>1.7</Text>
          </View>
          <View style={S.gradingRow}>
            <Text style={S.gradingCell}>A- = 70 - 74%</Text><Text style={S.gradingCell}>3.3</Text>
            <Text style={S.gradingCell}>B- = 55 - 59%</Text><Text style={S.gradingCell}>2.3</Text>
            <Text style={S.gradingCell}>C- = 40 - 44%</Text><Text style={S.gradingCell}>1.3</Text>
          </View>
        </View>

        <View style={S.footer}>
          <Image src="/logo.png" style={S.seal} />
          <View style={S.signatureBlock}>
            <View style={S.signatureLine} />
            <Text style={S.signatureText}>Academic Dean</Text>
          </View>
        </View>
        {remarks ? <Text style={{ position: 'absolute', left: 40, bottom: 6, fontSize: 6 }}>Remarks: {remarks}</Text> : null}
        <Text style={{ position: 'absolute', right: 40, bottom: 6, fontSize: 6 }}>Generated {generated.toLocaleDateString('en-IN')}</Text>
      </Page>
    </Document>
  );
}
