import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { Profile, ResumeContent } from "@/lib/types";

// Server-side PDF of a resume — what the browser extension attaches to application forms.

const s = StyleSheet.create({
  page: { paddingVertical: 36, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10, lineHeight: 1.4, color: "#111" },
  name: { fontSize: 19, lineHeight: 1.15, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 1.5, textTransform: "uppercase" },
  contact: { fontSize: 9, textAlign: "center", color: "#333", marginTop: 3 },
  headline: { fontSize: 10, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 4 },
  summary: { marginTop: 8 },
  section: { marginTop: 11 },
  sectionTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 1.2, borderBottomColor: "#111", paddingBottom: 2, marginBottom: 5 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowMain: { flex: 1, paddingRight: 12 },
  bold: { fontFamily: "Helvetica-Bold" },
  muted: { color: "#333", flexShrink: 0 },
  bullet: { flexDirection: "row", marginTop: 1.5, paddingLeft: 8 },
  dot: { width: 9 },
  item: { marginBottom: 6 },
});

function ResumePdf({ profile, content }: { profile: Profile; content: ResumeContent }) {
  const contact = [profile.location, profile.email, profile.phone, profile.linkedin].filter(Boolean).join("  ·  ");
  return (
    <Document title={`${profile.fullName} — Resume`} author={profile.fullName}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{profile.fullName}</Text>
        <Text style={s.contact}>{contact}</Text>
        {content.headline ? <Text style={s.headline}>{content.headline}</Text> : null}
        {content.summary ? <Text style={s.summary}>{content.summary}</Text> : null}

        {content.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {content.education.map(ed => (
              <View key={ed.school + ed.degree} style={s.row}>
                <Text style={s.rowMain}>
                  <Text style={s.bold}>{ed.school}</Text> — {ed.degree}
                </Text>
                <Text style={s.muted}>{ed.period}</Text>
              </View>
            ))}
          </View>
        )}

        {content.experiences.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Experience</Text>
            {content.experiences.map(exp => (
              <View key={exp.experienceId} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.rowMain}>
                    <Text style={s.bold}>{exp.company}</Text> — {exp.title}
                  </Text>
                  <Text style={s.muted}>{exp.period}</Text>
                </View>
                {exp.bullets.map(b => (
                  <View key={b} style={s.bullet}>
                    <Text style={s.dot}>•</Text>
                    <Text style={{ flex: 1 }}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {(content.skills.length > 0 || profile.languages.length > 0) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills</Text>
            {content.skills.length > 0 && (
              <Text>
                <Text style={s.bold}>Skills: </Text>
                {content.skills.join(", ")}
              </Text>
            )}
            {profile.languages.length > 0 && (
              <Text>
                <Text style={s.bold}>Languages: </Text>
                {profile.languages.join(", ")}
              </Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
}

export function renderResumePdf(profile: Profile, content: ResumeContent) {
  return renderToBuffer(<ResumePdf profile={profile} content={content} />);
}

export const resumeFileName = (profile: Profile) => `${profile.fullName.replace(/[^\p{L}\p{N}]+/gu, "_")}_Resume.pdf`;
