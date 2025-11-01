import { toNodeHandler } from 'better-auth/node'
import { auth } from '../../../lib/auth'

// Disable Next.js body parser - Better Auth needs raw body
export const config = {
  api: {
    bodyParser: false
  }
}

export default toNodeHandler(auth)