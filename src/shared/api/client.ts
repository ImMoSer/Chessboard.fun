import { z } from 'zod'

export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string

if (!BACKEND_API_URL) {
    console.error('[API Client] Critical Configuration Error: VITE_BACKEND_API_URL is not defined in your .env file.')
}

/**
 * Base error class for API requests
 */
export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: unknown,
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Perform a generic fetch request
 */
export async function apiClient<T>(
    endpoint: string,
    options: RequestInit = {},
    schema?: z.ZodSchema<T>
): Promise<T> {
    const url = `${BACKEND_API_URL}${endpoint}`

    const defaultHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
        // by default always include credentials if interacting with our backend, as seen in AuthService.
        credentials: options.credentials || 'include',
    })

    if (!response.ok) {
        let errorData
        try {
            errorData = await response.json()
        } catch {
            // Not JSON
            errorData = await response.text()
        }
        throw new ApiError(response.status, response.statusText, errorData)
    }

    const data = await response.json()

    if (schema) {
        const parsed = schema.safeParse(data)
        if (!parsed.success) {
            console.error('[API Client] Zod Validation Failed:', parsed.error)
            throw new Error('Invalid data schema')
        }
        return parsed.data
    }

    return data as T
}
