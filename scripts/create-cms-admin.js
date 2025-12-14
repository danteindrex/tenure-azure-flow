import fetch from 'node-fetch';

const CMS_URL = 'http://localhost:3002';

async function createAdmin() {
  console.log('👤 Creating CMS admin user...');

  try {
    const adminUser = {
      email: 'admin@homesolutions.com',
      password: 'admin123',
      name: 'CMS Admin'
    };

    const response = await fetch(`${CMS_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminUser)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@homesolutions.com');
      console.log('🔑 Password: admin123');
      console.log('🌐 Admin URL: http://localhost:3002/admin');
    } else {
      const error = await response.text();
      if (error.includes('already exists') || error.includes('duplicate')) {
        console.log('ℹ️  Admin user already exists');
        console.log('📧 Email: admin@homesolutions.com');
        console.log('🔑 Password: admin123');
        console.log('🌐 Admin URL: http://localhost:3002/admin');
      } else {
        console.log('❌ Failed to create admin user:', error);
      }
    }
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  }
}

createAdmin();