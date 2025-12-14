import fetch from 'node-fetch';

const CMS_URL = 'http://localhost:3002';

async function seedCMS() {
  console.log('🌱 Seeding CMS with sample content...');

  try {
    // Create sample homepage
    const homePage = {
      title: 'Home Solutions - Your Trusted Partner',
      slug: 'home',
      status: 'published',
      layout: [
        {
          blockType: 'hero',
          title: 'Welcome to Home Solutions',
          subtitle: 'Your trusted partner for comprehensive home services and solutions. Join our membership program and compete for monthly cash prizes.',
          style: 'centered',
          buttons: [
            {
              text: 'Get Started',
              link: '/signup',
              variant: 'primary'
            },
            {
              text: 'Sign In',
              link: '/login',
              variant: 'outline'
            }
          ]
        },
        {
          blockType: 'features',
          title: 'Why Choose Home Solutions?',
          description: 'We provide comprehensive home services with a unique membership model that rewards our loyal customers.',
          layout: 'grid-3',
          features: [
            {
              title: 'Monthly Cash Prizes',
              description: 'Members compete for $100,000 monthly cash prizes through our unique queue system.',
              icon: 'diamond'
            },
            {
              title: 'Comprehensive Services',
              description: 'From maintenance to major renovations, we handle all your home service needs.',
              icon: 'shield'
            },
            {
              title: 'Trusted Professionals',
              description: 'Our vetted team of professionals ensures quality service every time.',
              icon: 'target'
            }
          ]
        },
        {
          blockType: 'cta',
          title: 'Ready to Get Started?',
          description: 'Join thousands of satisfied members and start competing for monthly cash prizes today.',
          buttonText: 'Join Now for $325',
          buttonLink: '/signup'
        }
      ]
    };

    console.log('📄 Creating homepage...');
    const pageResponse = await fetch(`${CMS_URL}/api/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(homePage)
    });

    if (pageResponse.ok) {
      console.log('✅ Homepage created successfully');
    } else {
      console.log('❌ Failed to create homepage:', await pageResponse.text());
    }

    // Create sample posts
    const posts = [
      {
        title: 'Welcome to Home Solutions Membership Program',
        slug: 'welcome-to-home-solutions',
        excerpt: 'We are excited to announce the launch of our new membership program with monthly cash prizes for our loyal customers.',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "We are thrilled to welcome you to the Home Solutions membership program! Our innovative approach combines quality home services with exciting monthly cash prizes.",
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Every month, we award $100,000 to eligible members through our unique queue system. The more you engage with our services, the better your chances of winning!",
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
              }
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
          }
        },
        status: 'published',
        publishedAt: new Date().toISOString()
      },
      {
        title: 'How Our Queue System Works',
        slug: 'how-queue-system-works',
        excerpt: 'Learn about our innovative queue system and how members compete for monthly cash prizes.',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Our queue system is designed to be fair and transparent. When you join as a member, you enter the queue and your position determines your eligibility for monthly prizes.",
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "The top members in the queue are eligible for the monthly $100,000 prize draw. Your position improves based on your tenure and engagement with our services.",
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
              }
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
          }
        },
        status: 'published',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      },
      {
        title: 'New Service Areas Added',
        slug: 'new-service-areas-added',
        excerpt: 'We are expanding our service coverage to include three new metropolitan areas this month.',
        content: {
          root: {
            children: [
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "Great news! We are expanding our service coverage to better serve our growing member base. This month, we are adding three new metropolitan areas to our coverage map.",
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
              },
              {
                children: [
                  {
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: "If you live in one of these new areas, you can now enjoy our full range of home services while participating in our monthly prize program.",
                    type: "text",
                    version: 1
                  }
                ],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
              }
            ],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
          }
        },
        status: 'published',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      }
    ];

    console.log('📝 Creating sample posts...');
    for (const post of posts) {
      const postResponse = await fetch(`${CMS_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });

      if (postResponse.ok) {
        console.log(`✅ Created post: ${post.title}`);
      } else {
        console.log(`❌ Failed to create post: ${post.title}`, await postResponse.text());
      }
    }

    console.log('🎉 CMS seeding completed!');
    console.log('🌐 Visit http://localhost:3001/admin to manage content');
    console.log('🏠 Visit http://localhost:3000 to see the homepage');

  } catch (error) {
    console.error('❌ Error seeding CMS:', error);
  }
}

seedCMS();