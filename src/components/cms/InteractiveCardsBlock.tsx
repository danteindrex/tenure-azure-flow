import React from 'react'
import { PreviewCard } from '../animate-ui/components/base/preview-card'
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../animate-ui/components/animate/tooltip'

interface Card {
  title: string
  description: string
  image?: {
    url: string
    alt?: string
  }
  link?: string
  cardType: 'preview' | 'hover' | 'tooltip'
}

interface InteractiveCardsBlockProps {
  title?: string
  description?: string
  layout: 'grid-2' | 'grid-3' | 'grid-4'
  cards: Card[]
}

export function InteractiveCardsBlock({
  title,
  description,
  layout,
  cards,
}: InteractiveCardsBlockProps) {
  const getGridCols = () => {
    switch (layout) {
      case 'grid-2': return 'md:grid-cols-2'
      case 'grid-3': return 'md:grid-cols-2 lg:grid-cols-3'
      case 'grid-4': return 'md:grid-cols-2 lg:grid-cols-4'
      default: return 'md:grid-cols-2 lg:grid-cols-3'
    }
  }

  const renderCard = (card: Card, index: number) => {
    const cardContent = (
      <div className="group cursor-pointer">
        {card.image && (
          <div className="aspect-video overflow-hidden rounded-lg mb-4">
            <img
              src={card.image.url}
              alt={card.image.alt || card.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
          {card.title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {card.description}
        </p>
      </div>
    )

    switch (card.cardType) {
      case 'preview':
        return (
          <div key={index} className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <PreviewCard>
              {cardContent}
            </PreviewCard>
          </div>
        )
      
      case 'tooltip':
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                  {card.image && (
                    <div className="aspect-video overflow-hidden rounded-lg mb-4">
                      <img
                        src={card.image.url}
                        alt={card.image.alt || card.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {card.title}
                  </h3>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{card.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      
      case 'hover':
      default:
        return (
          <div
            key={index}
            className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
            onClick={() => card.link && (window.location.href = card.link)}
          >
            {cardContent}
          </div>
        )
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
          {cards.map(renderCard)}
        </div>
      </div>
    </section>
  )
}