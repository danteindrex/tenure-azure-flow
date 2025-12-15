// Use ONLY the generated schema from migrations which matches the actual database
// This ensures we have the exact database structure
export * from './migrations/schema'

// Backward compatibility aliases
export { users as user } from './migrations/schema'