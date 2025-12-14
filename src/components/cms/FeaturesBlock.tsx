import React from 'react'

interface Feature {
  title: string
  description: string
  icon?: string
}

interface FeaturesBlockProps {
  title?: string
  description?: string
  layout: 'grid-2' | 'grid-3' | 'grid-4'
  features: Feature[]
}

export function FeaturesBlock({ title, description, layout, features }: FeaturesBlockProps) {
  const getGridCols = () => {
    switch (layout) {
      case 'grid-2': return 'md:grid-cols-2'
      case 'grid-3': return 'md:grid-cols-2 lg:grid-cols-3'
      case 'grid-4': return 'md:grid-cols-2 lg:grid-cols-4'
      default: return 'md:grid-cols-2 lg:grid-cols-3'
    }
  }

  const getIconEmoji = (icon?: string) => {
    switch (icon) {
      case 'lightning': return '⚡'
      case 'shield': return '🛡️'
      case 'rocket': return '🚀'
      case 'diamond': return '💎'
      case 'target': return '🎯'
      case 'lock': return '🔒'
      default: return '✨'
    }
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {(title || description) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}
        
        <div className={`grid gap-8 ${getGridCols()}`}>
          {features.map((feature, index) => (
            <div key={index} className="text-center group">
              <div className="mb-4">
                <span className="text-4xl block mb-2 group-hover:scale-110 transition-transform duration-200">
                  {getIconEmoji(feature.icon)}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}