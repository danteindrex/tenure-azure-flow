import React from 'react'
import { CMSPage, CMSPageBlock } from '../../hooks/useCMSPage'
import { HeroBlock } from './HeroBlock'
import { FeaturesBlock } from './FeaturesBlock'
import { CTABlock } from './CTABlock'
import { AnimatedBackgroundBlock } from './AnimatedBackgroundBlock'
import { InteractiveCardsBlock } from './InteractiveCardsBlock'
import { AnimatedContentBlock } from './AnimatedContentBlock'

interface PageRendererProps {
  page: CMSPage
}

export function PageRenderer({ page }: PageRendererProps) {
  const renderBlock = (block: CMSPageBlock) => {
    switch (block.blockType) {
      case 'hero':
        return (
          <HeroBlock
            key={block.id}
            title={block.title}
            subtitle={block.subtitle}
            backgroundImage={block.backgroundImage}
            style={block.style}
            buttons={block.buttons}
          />
        )
      
      case 'features':
        return (
          <FeaturesBlock
            key={block.id}
            title={block.title}
            description={block.description}
            layout={block.layout}
            features={block.features}
          />
        )
      
      case 'cta':
        return (
          <CTABlock
            key={block.id}
            title={block.title}
            description={block.description}
            buttonText={block.buttonText}
            buttonLink={block.buttonLink}
            buttonStyle={block.buttonStyle}
          />
        )
      
      case 'animatedBackground':
        return (
          <AnimatedBackgroundBlock
            key={block.id}
            backgroundType={block.backgroundType}
            title={block.title}
            subtitle={block.subtitle}
            overlay={block.overlay}
            hexagonSettings={block.hexagonSettings}
            holeSettings={block.holeSettings}
            starsSettings={block.starsSettings}
            gravityStarsSettings={block.gravityStarsSettings}
            content={block.content}
          />
        )
      
      case 'interactiveCards':
        return (
          <InteractiveCardsBlock
            key={block.id}
            title={block.title}
            description={block.description}
            layout={block.layout}
            cards={block.cards}
          />
        )
      
      case 'animatedContent':
        return (
          <AnimatedContentBlock
            key={block.id}
            title={block.title}
            content={block.content}
            animation={block.animation}
            delay={block.delay}
          />
        )
      
      default:
        console.warn(`Unknown block type: ${block.blockType}`)
        return null
    }
  }

  return (
    <div className="min-h-screen">
      {page.layout.map(renderBlock)}
    </div>
  )
}