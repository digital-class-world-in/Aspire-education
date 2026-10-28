"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useInstituteData } from "@/hooks/use-institute-data"
import { useSEO } from "@/hooks/use-seo"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { EnquiryModal } from "@/components/enquiry-modal"
import { ChevronRight, Mail, Building2, Calendar, ShieldCheck, HelpCircle } from "lucide-react"

export default function PrivacyPolicyPage() {
  const {
    profile,
    settings,
    courses,
    isLoading,
    instituteName,
    resolvedUid
  } = useInstituteData()

  const [isEnquiryOpen, setIsEnquiryOpen] = useState(false)
  const [forceLoad, setForceLoad] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    const timer = setTimeout(() => {
      setForceLoad(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  useSEO(
    "Privacy Policy",
    "Privacy Policy for digital class",
    "privacy-policy",
    instituteName
  )

  if (isLoading && !forceLoad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl font-black animate-pulse text-black tracking-widest">
          Syncing Portal...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: settings?.styling?.fontFamily || "Poppins" }}>
      <Navbar
        profile={{ ...profile, ...settings?.about }}
        instituteName={instituteName}
        onApplyClick={() => setIsEnquiryOpen(true)}
      />

      {/* Main Page Container */}
      <main className="flex-grow pt-32 pb-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-10 bg-white">
          
          {/* Top Hero Section */}
          <div className="relative w-full h-[220px] rounded-2xl md:rounded-3xl bg-gradient-to-r from-[#8E24AA] via-[#9C27B0] to-[#7B1FA2] overflow-hidden shadow-lg flex items-center justify-center px-4 py-8">
            {/* Subtle background decoration patterns */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,#fff_1px,transparent_1px)] bg-[length:20px_20px]" />
            <div className="relative z-10 max-w-4xl mx-auto">
              <h1 className="text-[28px] md:text-[48px] font-bold text-white text-center leading-[1.3] tracking-tight">
                Privacy Policy
              </h1>
            </div>
          </div>

          {/* Content Section Design */}
          <div className="mt-[50px] space-y-2">
            
            {/* Metadata Section Removed */}

            {/* Introduction Paragraphs */}
            <div className="py-5 border-b border-[#f1f5f9]">
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-6">
                At digital class we are committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application, which is available on the Google Play Store.
              </p>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-6">
                Please read this policy carefully to understand our views and practices regarding your data and how we will treat it.
              </p>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                This Privacy Policy applies to the digital class App developed under the Next Gen Edu Soft white-label solutions. Next Gen Edu Soft, a brand under Mohkar Educom India Pvt. Ltd., provides the platform for creating educational apps and platform to clients. The content, management, and operations and data security of these apps and platforms are controlled by the respective clients, who are responsible for their privacy practices concerning end-user and all data and content.
              </p>
            </div>

            {/* 1. Information We Collect */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                1. Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-[22px] md:text-[28px] font-semibold text-[#1f2937] mt-[35px] mb-[15px] transition-all duration-300 hover:text-[#8E24AA]">
                    1.1 Personal Information
                  </h3>
                  <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-4">
                    We may collect the following personal identifiers when you register, log in, or interact with forms inside our application:
                  </p>
                  <ul className="pl-[25px] space-y-2 list-none text-[15px] md:text-[17px] leading-[2] text-[#4b5563]">
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Name:</strong> Full name of parents, guardians, students, or staff members.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Email Address:</strong> Used for account creation, alerts, notifications, and customer support.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Phone Number:</strong> For emergency alerts, OTP verification, and direct school communication.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Any other information:</strong> Collected via customized forms, admission profiles, and formats submitted by you.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[22px] md:text-[28px] font-semibold text-[#1f2937] mt-[35px] mb-[15px] transition-all duration-300 hover:text-[#8E24AA]">
                    1.2 Non-Personal Information
                  </h3>
                  <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-4">
                    Our platform automatically gathers system data and logs to maintain the reliability and security of our application:
                  </p>
                  <ul className="pl-[25px] space-y-2 list-none text-[15px] md:text-[17px] leading-[2] text-[#4b5563]">
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Device Information:</strong> Hardware model, operating system version, and unique device identifiers.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">IP Address:</strong> Logged for security, monitoring, and network diagnostics.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">App Usage Data:</strong> Interacted features, pages viewed, time spent on the app, and navigation path.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Crash logs and diagnostic data:</strong> Technical error dumps collected to fix bugs.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Network Information:</strong> Connection type, signal strength, and carrier information.
                    </li>
                    <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                      <strong className="text-[#1f2937]">Other Information:</strong> Locale settings and timestamps of activities.
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-[22px] md:text-[28px] font-semibold text-[#1f2937] mt-[35px] mb-[15px] transition-all duration-300 hover:text-[#8E24AA]">
                    1.3 Information from Third Parties
                  </h3>
                  <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                    We may receive information about you from third-party services such as Google Play Services, Firebase, or analytics providers. This data helps us monitor app performance, track marketing campaigns, and ensure app stability.
                  </p>
                </div>
              </div>
            </div>

            {/* 2. How We Use Your Information */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                2. How We Use Your Information
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-4">
                We use the information we collect in the following ways to deliver the best educational portal experience:
              </p>
              <ul className="pl-[25px] space-y-2 list-none text-[15px] md:text-[17px] leading-[2] text-[#4b5563]">
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Provide, operate, and maintain the features and functionalities of the app.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Improve, personalize, and expand the app services based on your user preferences and usage patterns.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Understand and analyze how users interact with our system modules (e.g. fees, notices, attendance).
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Develop new products, services, features, and enhanced software tools for preschool operations.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Communicate with you directly or via partner networks to supply updates, administrative alerts, and user support.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Send emails, push notifications, or SMS alerts with institutional announcements and attendance updates.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  Detect, investigate, and prevent fraudulent transactions, unauthorized access, and other illegal activities.
                </li>
              </ul>
            </div>

            {/* 3. Sharing and Disclosure of Information */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                3. Sharing and Disclosure of Information
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-4">
                We do not sell your personal data. We only share or disclose information under the following situations:
              </p>
              <ul className="pl-[25px] space-y-3 list-none text-[15px] md:text-[17px] leading-[2] text-[#4b5563]">
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  <strong className="text-[#1f2937]">Service Providers:</strong> We share data with third-party vendors, cloud storage hosts, email/SMS gateways, or security analysts who perform essential functions on our behalf.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  <strong className="text-[#1f2937]">Legal Authorities:</strong> We disclose information where legally required to comply with court orders, regulatory mandates, laws, or state emergency declarations.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  <strong className="text-[#1f2937]">Business Transfers:</strong> Data may be transferred during mergers, sales of corporate assets, consolidations, or acquisitions of all or a portion of Mohkar Educom India Pvt. Ltd. operations.
                </li>
              </ul>
            </div>

            {/* 4. Third-Party Services */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                4. Third-Party Services
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-4">
                Our application integrates third-party services that collect diagnostic and analytics identifiers. These external providers governed by their respective privacy terms include:
              </p>
              <ul className="pl-[25px] space-y-2 list-none text-[15px] md:text-[17px] leading-[2] text-[#4b5563]">
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  <strong className="text-[#1f2937]">Google Play Services:</strong> Used to facilitate smooth installation and authentication systems.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  <strong className="text-[#1f2937]">Firebase Analytics & Crashlytics:</strong> Used to trace app errors, usage duration, and load times to enhance application performance.
                </li>
              </ul>
            </div>

            {/* 5. Data Retention */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                5. Data Retention
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                We retain your personal details only as long as your account remains active or as required by the client school (digital class) to fulfill standard educational record requirements. If you submit an account deletion request or your student profile is archived, we will delete or anonymize your data, except where required by law to maintain transactional archives or prevent security incidents.
              </p>
            </div>

            {/* 6. Security */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                6. Security
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                We value your trust in providing us with your personal data. We utilize commercially acceptable technical safeguards, including SSL encryption, secure firebase storage, and access controls to prevent unauthorized access. However, no transmission method over the internet, or electronic storage database is 100% secure, and we cannot guarantee its absolute safety.
              </p>
            </div>

            {/* 7. Your Rights */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                7. Your Rights
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-4">
                As a user, you possess key rights regarding the administration of your personal data:
              </p>
              <ul className="pl-[25px] space-y-2 list-none text-[15px] md:text-[17px] leading-[2] text-[#4b5563]">
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  The right to access, update, or delete the information we have on your profile.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  The right of rectification (to modify inaccurate or incomplete data).
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  The right to restrict or object to certain processing types of your data.
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  The right to data portability (receiving a copy of your records in a structured format).
                </li>
                <li className="relative pl-6 before:content-[''] before:absolute before:left-0 before:top-[12px] before:w-[6px] before:h-[6px] before:rounded-full before:bg-[#9C27B0]">
                  The right to withdraw consent at any time for data processing activities.
                </li>
              </ul>
            </div>

            {/* 8. Children’s Privacy */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                8. Children’s Privacy
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                Our app is designed for use by parents, teachers, and school administrators of digital class. We do not knowingly collect personal information directly from children under 13 without verifiable consent from their parent or legal guardian. If we learn that a student under 13 has bypassed authorization and provided personal details directly, we will delete that data from our database immediately.
              </p>
            </div>

            {/* 9. Changes to This Privacy Policy */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                9. Changes to This Privacy Policy
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                We may revise this Privacy Policy periodically to incorporate new features or regulatory requirements. We advise you to review this page regularly to keep abreast of revisions. We will notify you of updates by modifying the Effective Date at the top of this document. Any changes become effective immediately when posted here.
              </p>
            </div>

            {/* 10. Misuse and Termination */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                10. Misuse and Termination
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                Any misuse of the app, attempts to extract private databases, reverse engineer scripts, upload malicious content, or circumvent API protection layers will result in immediate cancellation of your application login. digital class and NextGenEduSoft reserve the right to report malicious actions to law enforcement authorities.
              </p>
            </div>

            {/* 11. Limitation of Liability */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                11. Limitation of Liability
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                To the fullest extent permitted by local laws, NextGenEduSoft, digital class, and its parent Mohkar Educom India Pvt. Ltd. shall not be liable for any indirect, special, incidental, punitive, or consequential damages resulting from your use, inability to use, or dependence on the services, data inputs, or platform features.
              </p>
            </div>

            {/* 12. Content Ownership, Service Offered and Management */}
            <div className="py-5 border-b border-[#f1f5f9] group">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mt-[50px] mb-[25px] transition-all duration-300 group-hover:text-[#8E24AA]">
                12. Content Ownership, Service Offered and Management
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563]">
                This mobile application is developed under the NextGenEduSoft white-label solutions framework. NextGenEduSoft (a brand under Mohkar Educom India Pvt. Ltd.) provides the platform engine and technical service interface to digital class. The client (digital class) controls all information management, operations, student and fee registers, media postings, and compliance reviews. They are responsible for acquiring appropriate parent consents and managing data policies in agreement with the local rules.
              </p>
            </div>

            {/* 13. Contact Us */}
            <div className="pt-10">
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#111827] mb-[25px] transition-all duration-300 hover:text-[#8E24AA]">
                13. Contact Us
              </h2>
              <p className="text-[15px] md:text-[17px] leading-[1.9] text-[#4b5563] mb-6">
                If you have any questions, comments, or data erasure requests concerning this privacy policy, feel free to contact our development team:
              </p>
              
              {/* Contact Card */}
              <div className="bg-gradient-to-br from-[#ffffff] to-[#faf5ff] border border-[#f3e8ff] rounded-2xl p-6 md:p-8 max-w-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-[#9C27B0]" />
                    <span className="text-[15px] md:text-[17px] text-[#4b5563]">
                      <strong className="text-[#1f2937]">Company Name:</strong> NextGenEduSoft
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#9C27B0]" />
                    <span className="text-[15px] md:text-[17px] text-[#4b5563]">
                      <strong className="text-[#1f2937]">Email:</strong>{" "}
                      <a href="mailto:nextgenedusoft@gmail.com" className="text-[#9C27B0] hover:underline transition-colors font-medium">
                        nextgenedusoft@gmail.com
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer
        profile={profile || {}}
        settings={settings || {}}
        instituteName={instituteName}
        courses={courses || []}
      />

      <EnquiryModal 
        isOpen={isEnquiryOpen} 
        onOpenChange={setIsEnquiryOpen} 
        resolvedUid={resolvedUid} 
        displayedCourses={courses} 
      />
    </div>
  )
}
