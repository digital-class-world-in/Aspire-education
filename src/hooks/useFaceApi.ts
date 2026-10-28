import { useState, useEffect } from 'react'
import * as faceapi from '@vladmandic/face-api'

export function useFaceApi() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadModels() {
      try {
        if (faceapi.tf) {
            try {
              await (faceapi.tf as any).setBackend('webgl')
              await (faceapi.tf as any).ready()
            } catch (e) {
              console.warn("WebGL initialization failed", e)
            }
        }
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        ])
        if (mounted) setIsLoaded(true)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err : new Error(String(err)))
        console.error("Face API Models Failed to Load:", err)
      }
    }

    loadModels()

    return () => {
      mounted = false
    }
  }, [])

  return { faceapi, isLoaded, error }
}
