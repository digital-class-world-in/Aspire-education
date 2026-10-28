export interface DynamicField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[]
  isDefault?: boolean
}

export const DEFAULT_DYNAMIC_FIELDS: Record<string, Record<string, DynamicField[]>> = {
  front_office: {
    admission_enquiry: [
      { id: "enquirerFirstName", label: "Name", type: "text", required: true, isDefault: true },
      { id: "enquirerEmail", label: "Email", type: "email", required: false, isDefault: true },
      { id: "enquirerPhoneNumber", label: "Phone", type: "tel", required: true, isDefault: true },
      { id: "courseName", label: "Enquire For Course Or Class", type: "select", required: true, isDefault: true, options: ["Software Engineering", "Data Science"] },
      { id: "enquiryDate", label: "Enquiry Date", type: "date", required: true, isDefault: true },
      { id: "followUpDate", label: "Follow Up Date", type: "date", required: false, isDefault: true },
      { id: "source", label: "Source", type: "select", required: false, isDefault: true, options: ["Direct", "Referral"] },
      { id: "status", label: "Status", type: "select", required: false, isDefault: true, options: ["Active", "Inactive", "Done", "Rejected"] },
      { id: "demoTaken", label: "Demo Taken", type: "select", required: false, isDefault: true, options: ["Yes", "No"] },
      { id: "enquiryCategory", label: "Enquiry Category", type: "select", required: false, isDefault: true, options: ["General"] },
      { id: "city", label: "City", type: "text", required: false, isDefault: true },
      { id: "state", label: "State", type: "text", required: false, isDefault: true },
      { id: "address", label: "Address", type: "textarea", required: false, isDefault: true },
      { id: "remark", label: "Remark", type: "textarea", required: false, isDefault: true },
    ]
  }
}
