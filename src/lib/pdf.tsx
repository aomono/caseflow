import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";

Font.register({
  family: "NotoSansJP",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Regular.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansjp/NotoSansJP-Bold.ttf",
      fontWeight: 700,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansJP",
    padding: 50,
    fontSize: 11,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  issueDate: {
    fontSize: 10,
    color: "#555",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  recipient: {
    fontSize: 14,
    marginBottom: 20,
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontSize: 10,
    color: "#555",
    marginBottom: 4,
  },
  value: {
    fontSize: 12,
    lineHeight: 1.6,
  },
  amountSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
  amountLabel: {
    fontSize: 10,
    color: "#555",
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 9,
    color: "#999",
  },
});

interface ReportPdfData {
  companyName: string;
  clientName: string;
  period: string;
  workDescription: string;
  amount: number;
  issueDate: Date;
}

function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}年${m}月${d}日`;
}

function ReportDocument({ data }: { data: ReportPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.companyName}>{data.companyName}</Text>
          <Text style={styles.issueDate}>
            発行日: {formatDate(data.issueDate)}
          </Text>
        </View>

        <Text style={styles.title}>業務完了報告書</Text>

        <Text style={styles.recipient}>{data.clientName} 御中</Text>

        <View style={styles.section}>
          <Text style={styles.label}>対象期間</Text>
          <Text style={styles.value}>{data.period}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>業務内容</Text>
          <Text style={styles.value}>{data.workDescription}</Text>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>金額</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(data.amount)}
          </Text>
        </View>

        <Text style={styles.footer}>
          {data.companyName} — 業務完了報告書
        </Text>
      </Page>
    </Document>
  );
}

export async function generateReportPdf(data: ReportPdfData): Promise<Buffer> {
  const buffer = await renderToBuffer(<ReportDocument data={data} />);
  return Buffer.from(buffer);
}
