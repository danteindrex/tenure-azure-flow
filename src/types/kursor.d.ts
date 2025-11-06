declare module 'kursor/dist/kursor.js' {
  interface KursorOptions {
    type?: 1 | 2 | 3 | 4
    color?: string
    removeDefaultCursor?: boolean
  }

  class Kursor {
    constructor(options?: KursorOptions)
  }

  export default Kursor
}

declare module 'kursor/dist/kursor.css'
