import React from 'react'
import { Button } from '../ui/button'
import { LiquidButton } from '../animate-ui/components/buttons/liquid'

interface CTABlockProps {
  title: string
  description?: string
  buttonText: string
  buttonLink: string
  buttonStyle?: 'default' | 'liquid'
}

export function CTABlock({ title, description, buttonText, buttonLink, buttonStyle = 'default' }: CTABlockProps) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {title}
          </h2>
          {description && (
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {description}
            </p>
          )}
          {buttonStyle === 'liquid' ? (
            <LiquidButton
              size="lg"
              className="bg-white text-blue-600"
              asChild
            >
              <a href={buttonLink}>{buttonText}</a>
            </LiquidButton>
          ) : (
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-blue-600 hover:bg-gray-100"
              asChild
            >
              <a href={buttonLink}>{buttonText}</a>
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}