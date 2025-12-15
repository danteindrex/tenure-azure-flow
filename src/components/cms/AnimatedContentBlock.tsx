import React, { useEffect, useState } from 'react'

interface AnimatedContentBlockProps {
  title?: string
  content: any // Rich text content
  animation: 'fade-in' | 'slide-up' | 'slide-left' | 'scale-in'
  delay?: number
}

export function AnimatedContentBlock({
  title,
  content,
  animation,
  delay = 0,
}: AnimatedContentBlockProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-1000 ease-out'
    
    if (!isVisible) {
      switch (animation) {
        case 'fade-in':
          return `${baseClasses} opacity-0`
        case 'slide-up':
          return `${baseClasses} opacity-0 translate-y-8`
        case 'slide-left':
          return `${baseClasses} opacity-0 translate-x-8`
        case 'scale-in':
          return `${baseClasses} opacity-0 scale-95`
        default:
          return `${baseClasses} opacity-0`
      }
    }

    return `${baseClasses} opacity-100 translate-y-0 translate-x-0 scale-100`
  }

  const renderRichText = (content: any) => {
    if (typeof content === 'string') {
      return <div dangerouslySetInnerHTML={{ __html: content }} />
    }
    
    // Handle Lexical rich text format
    if (content?.root?.children) {
      return (
        <div>
          {content.root.children.map((child: any, index: number) => {
            if (child.type === 'paragraph') {
              return (
                <p key={index} className="mb-4">
                  {child.children?.map((textNode: any, textIndex: number) => (
                    <span key={textIndex}>{textNode.text}</span>
                  ))}
                </p>
              )
            }
            return null
          })}
        </div>
      )
    }

    return <div>{JSON.stringify(content)}</div>
  }

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className={getAnimationClasses()}>
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center">
              {title}
            </h2>
          )}
          <div className="prose prose-lg max-w-none">
            {renderRichText(content)}
          </div>
        </div>
      </div>
    </section>
  )
}