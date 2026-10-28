"use client";

import React from "react";

export type CertificateField = {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'image' | 'qr';
  x: number; // percentage
  y: number; // percentage
  fontSize?: number; // px
  color?: string;
  fontWeight?: string;
  fontStyle?: 'normal' | 'italic';
  tracking?: number;
};

interface CertificateTemplateProps {
  studentName: string;
  academicYear: string;
  achievementTitle?: string;
  courseName?: string;
  certificateNo?: string;
  issueDate?: string;
  instituteName?: string;
  config?: {
    frameUrl: string;
    fields: CertificateField[];
    baseFontFamily?: string;
    baseFontSize?: string;
  };
  fontFamily?: string;
  baseFontSize?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function CertificateTemplate({
  studentName,
  academicYear,
  achievementTitle = "For Outstanding Academic Achievement in Studies.",
  courseName,
  certificateNo,
  issueDate,
  instituteName,
  config,
  fontFamily = "'Inter', sans-serif",
  baseFontSize = "Default",
  containerRef,
}: CertificateTemplateProps) {
  const fonts = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@400;700;900&family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,600;1,600&family=Montserrat:wght@600;800&family=Dancing+Script:wght@600&display=swap');
  `;

  // Variables mapping
  const variables: Record<string, string | undefined> = {
    studentName,
    academicYear,
    courseName: courseName || achievementTitle,
    certificateNo,
    issueDate,
    instituteName,
  };

  // If no config, use the default vintage design
  if (!config) {
    return (
      <div
        ref={containerRef}
        className="relative mx-auto shadow-2xl overflow-hidden bg-white"
        style={{
          width: "1123px",
          height: "794px",
          fontFamily: "'Playfair Display', serif",
          color: "#2c2118",
        }}
      >
        {/* Render background as an img tag with crossOrigin for html2canvas to capture it cleanly */}
        <img src="/images/certificate-bg.jpg" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-fill z-0" alt="background" />
        
        <div className="relative z-10 w-full h-full">
            <style dangerouslySetInnerHTML={{ __html: fonts }} />

        {/* DEFAULT NAME */}
        <div
          className="absolute w-full text-center"
          style={{
            top: "330px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <p
            className="text-[115px] font-black italic tracking-[-2.5px] leading-[0.85]"
            style={{
              color: "#1a120b",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {studentName || "Rajesh Patel"}
          </p>
        </div>

        {/* DEFAULT SESSION */}
        <div
          className="absolute w-full text-center"
          style={{
            top: "440px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <p
            className="text-[82px] font-black tracking-wide leading-none"
            style={{
              color: "#2c2118",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            {academicYear || "2024-2025"}
          </p>
        </div>

        {/* DEFAULT REGISTRY */}
        {certificateNo && (
          <div
            className="absolute"
            style={{
              bottom: "68px",
              left: "72px",
              opacity: 0.85,
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[2px] text-[#2c2118]">
              Registry No: <span className="font-mono tracking-normal">{certificateNo}</span>
            </p>
          </div>
        )}
        </div>
      </div>
    );
  }

  // CUSTOM DYNAMIC DESIGN
  return (
    <div
      ref={containerRef}
      className="relative mx-auto shadow-2xl overflow-hidden bg-white"
      style={{
        width: "1123px",
        height: "794px",
        fontFamily: config.baseFontFamily || fontFamily,
      }}
    >
      {/* Use proxied img tag for background to completely bypass Firebase CORS blocks in html2canvas PDF generation */}
      <img src={`/api/proxy-image?url=${encodeURIComponent(config.frameUrl)}`} crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-fill z-0" alt="custom frame" />
      
      <div className="relative z-10 w-full h-full">
          <style dangerouslySetInnerHTML={{ __html: fonts }} />

      {config.fields.map((field) => {
        const value = variables[field.key];
        
        if (field.type === 'qr') {
            return (
                <div
                    key={field.id}
                    className="absolute border-2 border-black flex items-center justify-center bg-white p-1"
                    style={{
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: '80px',
                        height: '80px',
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <div className="w-full h-full bg-zinc-100 flex flex-col items-center justify-center text-[10px] font-black leading-none text-center">
                        <Award className="w-4 h-4 mb-1" />
                        VERIFY
                    </div>
                </div>
            )
        }

        const activeFontSize = config.baseFontSize || baseFontSize;

        return (
          <div
            key={field.id}
            className="absolute whitespace-nowrap"
            style={{
              left: `${field.x}%`,
              top: `${field.y}%`,
              transform: 'translate(-50%, -50%)',
              color: field.color || '#000',
              fontSize: activeFontSize && activeFontSize !== "Default" ? activeFontSize : `${field.fontSize || 24}px`,
              fontWeight: field.fontWeight || 'bold',
              fontStyle: field.fontStyle || 'normal',
              letterSpacing: `${field.tracking || 0}px`,
            }}
          >
            {value || `[${field.label}]`}
          </div>
        );
      })}
      </div>
    </div>
  );
}

function Award({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
        </svg>
    )
}