import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import {
  BellRing,
  BookOpenCheck,
  CreditCard,
  FileSpreadsheet,
  QrCode,
  Rows3,
  ShieldCheck,
  Users,
} from "lucide-react";

type GuideSection = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips: string[];
};

const englishSections: GuideSection[] = [
  {
    id: "start",
    title: "Getting Started",
    summary: "Use the dashboard for daily work and the Students area as the master record for every student.",
    steps: [
      "Login with your admin account and review the dashboard cards for admissions, seats, payments, and notifications.",
      "Use Seat Management to generate an admission QR for an available seat and shift combination.",
      "Check Admissions to review pending requests before approving or rejecting them.",
    ],
    tips: [
      "Students is the long-term profile area where future history, documents, payments, and notes should always be visible.",
      "Use Notifications to jump directly to the page that needs action.",
    ],
  },
  {
    id: "qr",
    title: "QR Admission Flow",
    summary: "The QR form is mobile-first and accepts required student details, optional guardian details, and photo upload.",
    steps: [
      "Create or open a seat QR from the Seat Management page.",
      "The student opens the secure QR link, uploads a photo, enters required details, and selects one or more preferred shifts.",
      "The system validates the link, seat, shifts, and file size before saving the admission request.",
    ],
    tips: [
      "QR links expire after 5 minutes for safety.",
      "If a link is expired, the student sees a contact message for Gyan Sthal Library.",
    ],
  },
  {
    id: "approval",
    title: "Approval Workflow",
    summary: "The approval dialog shows the student's submitted data first so the admin can review before saving.",
    steps: [
      "Open Admissions and choose a pending request.",
      "Review the student's submitted details, uploaded photo, selected shifts, and requested seat.",
      "Enter approval details such as admission date, fee, receipt number, and first payment information, then approve.",
    ],
    tips: [
      "Reject only when the request should not move into the Students area.",
      "If a mobile number already exists, the system blocks duplicate approval to protect student records.",
    ],
  },
  {
    id: "seat-shift",
    title: "Seat and Shift Rules",
    summary: "A student can be assigned across approved shift options, and every seat action must stay within valid limits.",
    steps: [
      "Use only valid seats and valid shift options shown by the system.",
      "Students can request multiple shifts, and admin can approve up to the allowed shift combination.",
      "When changing a seat later, use the seat-change dialog so history and validation are preserved.",
    ],
    tips: [
      "Never write seat numbers manually outside the provided options.",
      "Seat changes should always be done from the Students or Seat Management workflow, not by direct database edits.",
    ],
  },
  {
    id: "payments",
    title: "Payments, Receipts, and Reminders",
    summary: "Payments are tracked month by month so previous receipt history and the next due cycle stay visible.",
    steps: [
      "During approval, record the first payment details and receipt number.",
      "Open the student profile to see monthly payment records, receipt history, dues, and recent payment status.",
      "Use the Payments area for collection work and follow reminders for upcoming or overdue months.",
    ],
    tips: [
      "Receipt numbers should stay unique and easy to trace.",
      "The student profile should always show the latest receipt and previous month records together.",
    ],
  },
  {
    id: "student-record",
    title: "Student Master Record",
    summary: "Every long-term detail for a student should eventually be visible in the student profile.",
    steps: [
      "Open Students to access the student's overview, payments, timeline, and documents.",
      "Use this section as the primary place for printing or exporting a complete student record.",
      "Future notes, documents, follow-ups, and audit history should all stay attached to the same student profile.",
    ],
    tips: [
      "This keeps the system easy to search and easy to expand later.",
      "Avoid spreading student history across multiple unrelated pages.",
    ],
  },
  {
    id: "notifications",
    title: "Notifications and Redirects",
    summary: "Notifications should guide the admin to the exact screen where action is needed.",
    steps: [
      "Open the notification bell from the top bar.",
      "Click a notification to mark it as read and move directly to the related page.",
      "Use notifications for pending admissions, upcoming fees, overdue fees, and seat changes.",
    ],
    tips: [
      "A strong notification system reduces missed follow-up work.",
      "Keep messages short and action-based so staff knows what to do next.",
    ],
  },
  {
    id: "exports",
    title: "Export, Print, and Safety",
    summary: "Exports should help the admin share, print, and back up records without losing structure.",
    steps: [
      "Use export actions from Students or Payments when you need Excel-style data or printable records.",
      "Use print and PDF-friendly layouts for full student profiles.",
      "Regularly review storage usage, backup data, and health checks from the admin side.",
    ],
    tips: [
      "Uploaded photos are compressed to save Atlas storage.",
      "Always verify sensitive details like Aadhaar before printing or sharing records.",
    ],
  },
];

const hindiSections: GuideSection[] = [
  {
    id: "start",
    title: "शुरुआत कैसे करें",
    summary: "डैशबोर्ड रोज़ के काम के लिए है और Students सेक्शन हर छात्र का मुख्य रिकॉर्ड है।",
    steps: [
      "एडमिन लॉगिन के बाद डैशबोर्ड पर admissions, seats, payments और notifications देखें।",
      "Seat Management से किसी उपलब्ध सीट और शिफ्ट के लिए admission QR बनाएं।",
      "Admissions सेक्शन में pending request देखकर approve या reject करें।",
    ],
    tips: [
      "Students सेक्शन ही वह जगह है जहां छात्र की पूरी history, payments, documents और notes दिखने चाहिए।",
      "Notifications पर क्लिक करके सीधे उसी page पर जाएं जहां action लेना है।",
    ],
  },
  {
    id: "qr",
    title: "QR प्रवेश प्रक्रिया",
    summary: "QR form mobile-friendly है और इसमें जरूरी student details, optional guardian details और photo upload शामिल है।",
    steps: [
      "Seat Management page से QR link खोलें या generate करें।",
      "छात्र secure QR link खोलकर photo upload करे, required details भरे और preferred shifts चुने।",
      "System link, seat, shifts और file size validate करके admission request save करता है।",
    ],
    tips: [
      "QR link सुरक्षा के लिए 5 मिनट बाद expire हो जाता है।",
      "Link expire होने पर छात्र को Gyan Sthal Library से contact करने का message दिखेगा।",
    ],
  },
  {
    id: "approval",
    title: "Approval प्रक्रिया",
    summary: "Approval dialog में पहले छात्र द्वारा भरी गई details दिखती हैं ताकि admin सही तरह review कर सके।",
    steps: [
      "Admissions page में pending request खोलें।",
      "Student की details, uploaded photo, selected shifts और requested seat ध्यान से देखें।",
      "Admission date, fee, receipt number और पहली payment details भरकर approve करें।",
    ],
    tips: [
      "अगर request को Students area में नहीं ले जाना है तभी reject करें।",
      "अगर वही mobile number पहले से मौजूद है तो system duplicate approval रोक देता है।",
    ],
  },
  {
    id: "seat-shift",
    title: "Seat और Shift नियम",
    summary: "Student को approved shift options के अंदर ही रखा जाए और हर seat action valid limit के अनुसार हो।",
    steps: [
      "सिर्फ वही valid seats और shift options चुनें जो system दिखा रहा है।",
      "Student multiple shifts चुन सकता है और admin allowed combination के अनुसार approve कर सकता है।",
      "बाद में seat change करने के लिए seat-change dialog का ही use करें ताकि history और validation दोनों बने रहें।",
    ],
    tips: [
      "Seat number manually type करके invalid entry न करें।",
      "Database में direct change करने के बजाय app workflow का use करें।",
    ],
  },
  {
    id: "payments",
    title: "Payments, Receipt और Reminder",
    summary: "Payment month-wise track होती है ताकि previous receipts और next due cycle साफ दिखे।",
    steps: [
      "Approval के समय पहली payment और receipt number दर्ज करें।",
      "Student profile में monthly records, previous receipts, due amount और latest status देखें।",
      "Payments page और reminders का use करके अगली या overdue payment follow करें।",
    ],
    tips: [
      "Receipt number unique और साफ होना चाहिए।",
      "Student profile में current और previous month payment records साथ में दिखने चाहिए।",
    ],
  },
  {
    id: "student-record",
    title: "Student Master Record",
    summary: "किसी भी छात्र से जुड़ी पूरी जानकारी एक ही student profile में दिखनी चाहिए।",
    steps: [
      "Students section में overview, payments, timeline और documents देखें।",
      "Print या export के लिए इसी section को primary source मानें।",
      "Future notes, follow-up, documents और audit history भी इसी profile से जुड़नी चाहिए।",
    ],
    tips: [
      "इससे system future में बढ़ाना आसान हो जाता है।",
      "छात्र की history को कई अलग pages में बिखरने न दें।",
    ],
  },
  {
    id: "notifications",
    title: "Notifications और Redirect",
    summary: "Notification system ऐसा होना चाहिए कि admin सीधे सही page पर पहुंच जाए।",
    steps: [
      "Top bar से notification bell खोलें।",
      "किसी notification पर click करें, वह read mark हो जाए और related page खुल जाए।",
      "Pending admissions, upcoming fees, overdue fees और seat updates के लिए notifications देखें।",
    ],
    tips: [
      "Strong notification system से follow-up miss नहीं होता।",
      "Messages छोटे और action-based रखें ताकि staff तुरंत समझ सके।",
    ],
  },
  {
    id: "exports",
    title: "Export, Print और Safety",
    summary: "Export का use sharing, print और backup के लिए करें, लेकिन structure और privacy बरकरार रखें।",
    steps: [
      "Students और Payments से जरूरत के अनुसार Excel-style export या printable record निकालें।",
      "Full student profile के लिए print और PDF-friendly layout का use करें।",
      "Storage usage, backup और health checks को समय-समय पर देखें।",
    ],
    tips: [
      "Atlas storage बचाने के लिए uploaded photos compressed रहते हैं।",
      "Aadhaar जैसी sensitive details print या share करने से पहले verify करें।",
    ],
  },
];

const highlightCards = [
  {
    icon: QrCode,
    title: "Secure QR Admissions",
    description: "Short-lived links, mobile-first forms, and validated student intake.",
  },
  {
    icon: Rows3,
    title: "Seat + Shift Control",
    description: "Clear handling for seats, multi-shift selection, and later seat changes.",
  },
  {
    icon: CreditCard,
    title: "Monthly Payment Ledger",
    description: "Receipts, due tracking, reminders, and a clean student payment history.",
  },
  {
    icon: BellRing,
    title: "Actionable Notifications",
    description: "Alerts that redirect staff straight to the correct workflow page.",
  },
];

const quickLinks = [
  { icon: BookOpenCheck, label: "Dashboard", note: "Daily overview and storage status" },
  { icon: Users, label: "Students", note: "Master profile for each student" },
  { icon: FileSpreadsheet, label: "Payments", note: "Collection work and export-ready data" },
  { icon: ShieldCheck, label: "Admissions", note: "Review, approve, reject, and verify" },
];

function GuideAccordion({ sections }: { sections: GuideSection[] }) {
  return (
    <Accordion type="single" collapsible className="space-y-3">
      {sections.map((section) => (
        <AccordionItem
          key={section.id}
          value={section.id}
          className="rounded-2xl border border-border bg-card px-4 sm:px-6"
        >
          <AccordionTrigger className="gap-4 py-5 text-left text-base font-semibold text-foreground hover:no-underline">
            <div className="space-y-1">
              <div>{section.title}</div>
              <p className="text-sm font-normal text-muted-foreground">{section.summary}</p>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pb-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Steps</h3>
              <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                {section.steps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Important Notes</h3>
              <div className="mt-3 grid gap-2">
                {section.tips.map((tip) => (
                  <div
                    key={tip}
                    className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-foreground"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
          <div className="space-y-4">
            <Badge className="rounded-full px-3 py-1 text-xs" variant="secondary">
              Help Center • English + Hindi
            </Badge>
            <div className="space-y-3">
              <Logo size="lg" showTagline />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  System Guide for New Staff
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Learn the full Gyan Sthal Library workflow in one place. This guide explains how admissions,
                  seats, shifts, students, payments, notifications, and exports work so new team members can start
                  confidently.
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  यह guide नए staff को system समझने में मदद करेगा ताकि admission, seat management, payment tracking
                  और student records को सही तरीके से संभाला जा सके।
                </p>
              </div>
            </div>
          </div>

          <Card className="border-primary/15 bg-background/85 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Orientation</CardTitle>
              <CardDescription>Open these sections first when training a new admin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickLinks.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <item.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.note}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {highlightCards.map((card) => (
          <Card key={card.title} className="border-border/80">
            <CardHeader className="space-y-3 pb-3">
              <div className="w-fit rounded-2xl bg-primary/10 p-3 text-primary">
                <card.icon size={20} />
              </div>
              <div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription className="mt-1 leading-6">{card.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-xl">How the System Works</CardTitle>
            <CardDescription>
              Switch between English and Hindi. Every section is written for real admin work and mobile-friendly use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="english" className="space-y-4">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl p-1">
                <TabsTrigger className="rounded-lg py-2" value="english">
                  English Guide
                </TabsTrigger>
                <TabsTrigger className="rounded-lg py-2" value="hindi">
                  हिंदी गाइड
                </TabsTrigger>
              </TabsList>
              <TabsContent value="english" className="mt-0">
                <GuideAccordion sections={englishSections} />
              </TabsContent>
              <TabsContent value="hindi" className="mt-0">
                <GuideAccordion sections={hindiSections} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-primary/15 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Important Rules</CardTitle>
              <CardDescription>Keep these points consistent across the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground">
              <div className="rounded-xl bg-background px-4 py-3">
                Always approve students only after reviewing their submitted details, photo, seat, and shifts.
              </div>
              <div className="rounded-xl bg-background px-4 py-3">
                Seat, shift, mobile number, Aadhaar, payments, and receipts should always follow system validation.
              </div>
              <div className="rounded-xl bg-background px-4 py-3">
                Use the student profile as the main record for print, export, and future history tracking.
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="text-lg">महत्वपूर्ण नियम</CardTitle>
              <CardDescription>इन नियमों को पूरे system में एक जैसा रखें।</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-foreground">
              <div className="rounded-xl bg-background px-4 py-3">
                Approve करने से पहले student की submitted details, photo, seat और shifts को ध्यान से verify करें।
              </div>
              <div className="rounded-xl bg-background px-4 py-3">
                Seat, shift, mobile number, Aadhaar, payment और receipt हमेशा system validation के अनुसार ही save करें।
              </div>
              <div className="rounded-xl bg-background px-4 py-3">
                Print, export और future history के लिए student profile को मुख्य record मानें।
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
