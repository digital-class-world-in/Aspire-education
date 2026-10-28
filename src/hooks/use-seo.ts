import { useEffect } from "react"

export function useSEO(title?: string, description?: string, pageName?: string, instituteName?: string) {
  useEffect(() => {
    // Auto-generate title if not provided
    let finalTitle = title
    if (!finalTitle && pageName && instituteName) {
      const slug = `${pageName}-${instituteName}`.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
      finalTitle = slug
    }

    if (finalTitle) {
      document.title = finalTitle
    }

    // Auto-generate description if not provided
    let finalDesc = description
    if (!finalDesc && pageName && instituteName) {
      finalDesc = `Learn more about ${pageName} at ${instituteName}. Explore our programs, faculty and campus life.`
    }

    if (finalDesc) {
      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
      if (!metaDesc) {
        metaDesc = document.createElement("meta")
        metaDesc.name = "description"
        document.head.appendChild(metaDesc)
      }
      metaDesc.content = finalDesc
    }
  }, [title, description, pageName, instituteName])
}
