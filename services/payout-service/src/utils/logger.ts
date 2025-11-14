/**
 * Logger Utility
 * 
 * Structured logging using Winston for the Payout Service.
 * Provides consistent log formatting and multiple log levels.
 * 
 * Features:
 * - JSON formatted logs for easy parsing
 * - Multiple log levels (error, warn, info, debug)
 * - Automatic timestamp inclusion
 * - Sensitive data redaction
 * - Console and file output support
 */

import winston from 'winston'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

// Define colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
}

winston.addColors(colors)

// Get log level from environment or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info'

// Create Winston logger instance
export const logger = winston.createLogger({
  level: logLevel,
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'payout-service' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          let msg = `${timestamp} [${service}] ${level}: ${message}`
          
          // Add metadata if present
          if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`
          }
          
          return msg
        })
      ),
    }),
  ],
})

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  )
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  )
}

/**
 * Redact sensitive information from logs
 * 
 * @param data - Object that may contain sensitive data
 * @returns Object with sensitive fields redacted
 */
export function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveFields = [
    'password',
    'accountNumber',
    'routingNumber',
    'ssn',
    'tin',
    'bankDetails',
    'token',
    'secret',
    'apiKey',
  ]

  const redacted = { ...data }

  for (const field of sensitiveFields) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]'
    }
  }

  return redacted
}

export default logger
