import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const W = 595; // A4 portrait width in points
const H = 842; // A4 portrait height in points

const DEEP_NAVY = '#1a2744';
const ROYAL_GOLD = '#b8860b';
const LIGHT_GOLD = '#d4af37';
const IVORY = '#fffef5';
const SLATE_TEXT = '#3d4f5f';
const TABLE_HEADER_BG = '#1a2744';
const TABLE_ROW_ALT = '#f5f3ea';

const S = StyleSheet.create({
  page: {
    width: W,
    height: H,
    position: 'relative',
    fontFamily: 'Times-Roman',
    backgroundColor: IVORY,
    padding: 0,
  },
  outerBorder: {
    position: 'absolute',
    top: 15,
    left: 15,
    right: 15,
    bottom: 15,
    borderWidth: 2.5,
    borderColor: ROYAL_GOLD,
    zIndex: 1,
  },
  innerBorder: {
    position: 'absolute',
    top: 21,
    left: 21,
    right: 21,
    bottom: 21,
    borderWidth: 0.5,
    borderColor: DEEP_NAVY,
    zIndex: 1,
  },
  content: {
    position: 'absolute',
    top: 35,
    left: 40,
    right: 40,
    bottom: 40,
    zIndex: 10,
  },
  header: { alignItems: 'center', marginBottom: 6 },
  collegeName: {
    fontSize: 22,
    fontFamily: 'Times-Bold',
    color: DEEP_NAVY,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subHeader: {
    fontSize: 8,
    fontFamily: 'Times-Italic',
    color: SLATE_TEXT,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  goldLine: {
    width: 250,
    height: 1,
    backgroundColor: ROYAL_GOLD,
    marginTop: 6,
    marginBottom: 4,
  },
  titleSection: { alignItems: 'center', marginTop: 10, marginBottom: 8 },
  title: {
    fontSize: 14,
    fontFamily: 'Times-Bold',
    color: ROYAL_GOLD,
    textAlign: 'center',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  titleUnderline: {
    width: 200,
    height: 0.5,
    backgroundColor: LIGHT_GOLD,
    marginTop: 4,
  },
  studentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
    paddingHorizontal: 10,
  },
  infoBlock: { flexDirection: 'row' },
  infoLabel: {
    fontSize: 9,
    fontFamily: 'Times-Bold',
    color: SLATE_TEXT,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: 'Times-Roman',
    color: DEEP_NAVY,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: TABLE_HEADER_BG,
    borderBottomWidth: 1,
    borderBottomColor: ROYAL_GOLD,
  },
  th: {
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#ffffff',
    padding: 4,
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d0cbb0',
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d0cbb0',
    backgroundColor: TABLE_ROW_ALT,
  },
  td: {
    fontSize: 8,
    fontFamily: 'Times-Roman',
    color: DEEP_NAVY,
    padding: 4,
    textAlign: 'left',
  },
  tdCenter: {
    fontSize: 8,
    fontFamily: 'Times-Roman',
    color: DEEP_NAVY,
    padding: 4,
    textAlign: 'center',
  },
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: ROYAL_GOLD,
    borderRadius: 2,
    padding: 6,
    width: 160,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Times-Italic',
    color: SLATE_TEXT,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    color: DEEP_NAVY,
  },
  remarks: {
    marginTop: 10,
    paddingHorizontal: 10,
    fontSize: 8,
    fontFamily: 'Times-Italic',
    color: SLATE_TEXT,
  },
  sigSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sigBlock: { alignItems: 'center', width: 130 },
  sigLine: {
    width: 110,
    height: 0.5,
    backgroundColor: DEEP_NAVY,
    marginBottom: 3,
  },
  sigName: {
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: DEEP_NAVY,
    textAlign: 'center',
  },
  sigTitle: {
    fontSize: 7,
    fontFamily: 'Times-Italic',
    color: SLATE_TEXT,
    textAlign: 'center',
    marginTop: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    fontSize: 6,
    fontFamily: 'Helvetica',
    color: '#999',
    textAlign: 'center',
  },
});

type MarkRow = {
  year_of_study: number;
  semester: number;
  academic_year: string;
  subject_name: string;
  credit_hours: number;
  marks: number;
  grade: string;
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

export function MarksheetDocument({
  studentName,
  course,
  abNumber,
  pataRegNo,
  marks,
  finalGrade,
  gpa,
  classResult,
  remarks,
  generatedDate,
}: Props) {
  const date = new Date(generatedDate);
  const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const colWidths = { year: '8%', sem: '7%', aYear: '15%', subject: '35%', credits: '10%', marks: '12%', grade: '13%' };

  return (
    <Document>
      <Page size={[W, H]} style={S.page}>
        <View style={S.outerBorder} />
        <View style={S.innerBorder} />

        <View style={S.content}>
          {/* Header */}
          <View style={S.header}>
            <Text style={S.collegeName}>Aizawl Bible College</Text>
            <Text style={S.subHeader}>A Theological Institution of Assemblies of God Mizoram District</Text>
            <View style={S.goldLine} />
            <Text style={S.subHeader}>Accredited by Pentecostal Association for Theological Accreditation (PATA)</Text>
          </View>

          {/* Title */}
          <View style={S.titleSection}>
            <Text style={S.title}>Academic Marksheet</Text>
            <View style={S.titleUnderline} />
          </View>

          {/* Student info */}
          <View style={S.studentInfo}>
            <View style={S.infoBlock}>
              <Text style={S.infoLabel}>Name: </Text>
              <Text style={S.infoValue}>{studentName}</Text>
            </View>
            {abNumber && (
              <View style={S.infoBlock}>
                <Text style={S.infoLabel}>AB No: </Text>
                <Text style={S.infoValue}>{abNumber}</Text>
              </View>
            )}
          </View>
          <View style={S.studentInfo}>
            <View style={S.infoBlock}>
              <Text style={S.infoLabel}>Course: </Text>
              <Text style={S.infoValue}>{course || '—'}</Text>
            </View>
            {pataRegNo && (
              <View style={S.infoBlock}>
                <Text style={S.infoLabel}>PATA Reg No: </Text>
                <Text style={S.infoValue}>{pataRegNo}</Text>
              </View>
            )}
          </View>

          {/* Marks table */}
          <View style={S.tableHeader}>
            <Text style={[S.th, { width: colWidths.year }]}>Year</Text>
            <Text style={[S.th, { width: colWidths.sem }]}>Sem</Text>
            <Text style={[S.th, { width: colWidths.aYear }]}>Academic Year</Text>
            <Text style={[S.th, { width: colWidths.subject }]}>Subject</Text>
            <Text style={[S.th, { width: colWidths.credits }]}>Credits</Text>
            <Text style={[S.th, { width: colWidths.marks }]}>Marks</Text>
            <Text style={[S.th, { width: colWidths.grade }]}>Grade</Text>
          </View>

          {marks.map((m, i) => (
            <View key={i} style={i % 2 === 1 ? S.tableRowAlt : S.tableRow}>
              <Text style={[S.tdCenter, { width: colWidths.year }]}>{m.year_of_study}</Text>
              <Text style={[S.tdCenter, { width: colWidths.sem }]}>{m.semester}</Text>
              <Text style={[S.td, { width: colWidths.aYear }]}>{m.academic_year || '—'}</Text>
              <Text style={[S.td, { width: colWidths.subject }]}>{m.subject_name}</Text>
              <Text style={[S.tdCenter, { width: colWidths.credits }]}>{m.credit_hours}</Text>
              <Text style={[S.tdCenter, { width: colWidths.marks }]}>{m.marks}</Text>
              <Text style={[S.tdCenter, { width: colWidths.grade }]}>{m.grade || '—'}</Text>
            </View>
          ))}

          {/* Summary */}
          <View style={S.summarySection}>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Final Grade</Text>
              <Text style={S.summaryValue}>{finalGrade || '—'}</Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>GPA</Text>
              <Text style={S.summaryValue}>{gpa != null ? gpa.toFixed(2) : '—'}</Text>
            </View>
            <View style={S.summaryBox}>
              <Text style={S.summaryLabel}>Class Result</Text>
              <Text style={S.summaryValue}>{classResult || '—'}</Text>
            </View>
          </View>

          {remarks && (
            <Text style={S.remarks}>Remarks: {remarks}</Text>
          )}

          {/* Signatures */}
          <View style={S.sigSection}>
            <View style={S.sigBlock}>
              <View style={S.sigLine} />
              <Text style={S.sigName}>Principal</Text>
              <Text style={S.sigTitle}>Aizawl Bible College</Text>
            </View>
            <View style={S.sigBlock}>
              <View style={S.sigLine} />
              <Text style={S.sigName}>Dean of Academics</Text>
              <Text style={S.sigTitle}>Aizawl Bible College</Text>
            </View>
          </View>
        </View>

        <Text style={S.footer}>Generated on {formattedDate} · Aizawl Bible College</Text>
      </Page>
    </Document>
  );
}
