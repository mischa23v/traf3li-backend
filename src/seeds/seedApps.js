/**
 * Seed script for Apps
 * Run: node src/seeds/seedApps.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../configs/db');

// Import App model directly since we need to run this standalone
const App = require('../models/app.model');

const appsData = [
    // Communication Apps
    {
        name: 'Telegram',
        iconName: 'telegram',
        category: 'communication',
        desc: 'Connect with Telegram for real-time communication.',
        descAr: 'تواصل عبر تيليجرام للمراسلة الفورية.',
        sortOrder: 1
    },
    {
        name: 'WhatsApp',
        iconName: 'whatsapp',
        category: 'communication',
        desc: 'Easily integrate WhatsApp for direct messaging.',
        descAr: 'دمج واتساب للمراسلة المباشرة بسهولة.',
        sortOrder: 2
    },
    {
        name: 'Slack',
        iconName: 'slack',
        category: 'communication',
        desc: 'Integrate Slack for efficient team communication.',
        descAr: 'دمج سلاك للتواصل الفعال بين الفريق.',
        sortOrder: 3
    },
    {
        name: 'Discord',
        iconName: 'discord',
        category: 'communication',
        desc: 'Connect with Discord for seamless team communication.',
        descAr: 'تواصل عبر ديسكورد للتواصل السلس بين الفريق.',
        sortOrder: 4
    },
    {
        name: 'Skype',
        iconName: 'skype',
        category: 'communication',
        desc: 'Connect with Skype contacts seamlessly.',
        descAr: 'تواصل مع جهات اتصال سكايب بسلاسة.',
        sortOrder: 5
    },
    {
        name: 'Zoom',
        iconName: 'zoom',
        category: 'communication',
        desc: 'Host Zoom meetings directly from the dashboard.',
        descAr: 'استضافة اجتماعات زووم مباشرة من لوحة التحكم.',
        sortOrder: 6
    },
    {
        name: 'Microsoft Teams',
        iconName: 'teams',
        category: 'communication',
        desc: 'Communicate and collaborate with Teams.',
        descAr: 'التواصل والتعاون عبر مايكروسوفت تيمز.',
        sortOrder: 7
    },
    {
        name: 'Gmail',
        iconName: 'gmail',
        category: 'communication',
        desc: 'Access and manage Gmail messages effortlessly.',
        descAr: 'الوصول إلى رسائل جيميل وإدارتها بسهولة.',
        sortOrder: 8
    },
    {
        name: 'Outlook',
        iconName: 'outlook',
        category: 'communication',
        desc: 'Manage email and calendar with Outlook.',
        descAr: 'إدارة البريد الإلكتروني والتقويم عبر أوتلوك.',
        sortOrder: 9
    },

    // Productivity Apps
    {
        name: 'Notion',
        iconName: 'notion',
        category: 'productivity',
        desc: 'Effortlessly sync Notion pages for seamless collaboration.',
        descAr: 'مزامنة صفحات نوشن بسهولة للتعاون السلس.',
        sortOrder: 10
    },
    {
        name: 'Trello',
        iconName: 'trello',
        category: 'productivity',
        desc: 'Sync Trello cards for streamlined project management.',
        descAr: 'مزامنة بطاقات تريلو لإدارة المشاريع بكفاءة.',
        sortOrder: 11
    },
    {
        name: 'Asana',
        iconName: 'asana',
        category: 'productivity',
        desc: 'Manage projects and tasks with Asana.',
        descAr: 'إدارة المشاريع والمهام عبر أسانا.',
        sortOrder: 12
    },
    {
        name: 'Jira',
        iconName: 'jira',
        category: 'productivity',
        desc: 'Track projects and tasks using Jira.',
        descAr: 'تتبع المشاريع والمهام باستخدام جيرا.',
        sortOrder: 13
    },
    {
        name: 'Evernote',
        iconName: 'evernote',
        category: 'productivity',
        desc: 'Take and organize notes with Evernote.',
        descAr: 'تدوين وتنظيم الملاحظات عبر إيفرنوت.',
        sortOrder: 14
    },
    {
        name: 'Calendly',
        iconName: 'calendly',
        category: 'productivity',
        desc: 'Schedule appointments easily with clients.',
        descAr: 'جدولة المواعيد بسهولة مع العملاء.',
        sortOrder: 15
    },
    {
        name: 'Google Calendar',
        iconName: 'googlecalendar',
        category: 'productivity',
        desc: 'Sync appointments and events with Google Calendar.',
        descAr: 'مزامنة المواعيد والأحداث مع تقويم جوجل.',
        sortOrder: 16
    },
    {
        name: 'Zapier',
        iconName: 'zapier',
        category: 'productivity',
        desc: 'Automate workflows between different apps.',
        descAr: 'أتمتة سير العمل بين التطبيقات المختلفة.',
        sortOrder: 17
    },
    {
        name: 'Microsoft 365',
        iconName: 'microsoft365',
        category: 'productivity',
        desc: 'Integrate with Microsoft apps for productivity.',
        descAr: 'التكامل مع تطبيقات مايكروسوفت للإنتاجية.',
        sortOrder: 18
    },

    // Finance Apps
    {
        name: 'Stripe',
        iconName: 'stripe',
        category: 'finance',
        desc: 'Easily manage Stripe transactions and payments.',
        descAr: 'إدارة معاملات ومدفوعات سترايب بسهولة.',
        sortOrder: 19
    },
    {
        name: 'QuickBooks',
        iconName: 'quickbooks',
        category: 'finance',
        desc: 'Manage accounting and finances with QuickBooks.',
        descAr: 'إدارة المحاسبة والمالية عبر كويك بوكس.',
        sortOrder: 20
    },
    {
        name: 'Xero',
        iconName: 'xero',
        category: 'finance',
        desc: 'Manage accounting and invoices with Xero.',
        descAr: 'إدارة المحاسبة والفواتير عبر زيرو.',
        sortOrder: 21
    },

    // Storage Apps
    {
        name: 'Google Drive',
        iconName: 'googledrive',
        category: 'storage',
        desc: 'Access and manage your files on Google Drive.',
        descAr: 'الوصول إلى ملفاتك وإدارتها على جوجل درايف.',
        sortOrder: 22
    },
    {
        name: 'Dropbox',
        iconName: 'dropbox',
        category: 'storage',
        desc: 'Sync and manage your files on Dropbox.',
        descAr: 'مزامنة وإدارة ملفاتك على دروبوكس.',
        sortOrder: 23
    },
    {
        name: 'OneDrive',
        iconName: 'onedrive',
        category: 'storage',
        desc: 'Store and share files via OneDrive.',
        descAr: 'تخزين ومشاركة الملفات عبر ون درايف.',
        sortOrder: 24
    },

    // Development Apps
    {
        name: 'GitHub',
        iconName: 'github',
        category: 'development',
        desc: 'Streamline code management with GitHub integration.',
        descAr: 'تبسيط إدارة الكود مع تكامل جيت هاب.',
        sortOrder: 25
    },
    {
        name: 'GitLab',
        iconName: 'gitlab',
        category: 'development',
        desc: 'Efficiently manage code projects with GitLab integration.',
        descAr: 'إدارة مشاريع الكود بكفاءة مع تكامل جيت لاب.',
        sortOrder: 26
    },
    {
        name: 'Docker',
        iconName: 'docker',
        category: 'development',
        desc: 'Effortlessly manage Docker containers on your dashboard.',
        descAr: 'إدارة حاويات دوكر بسهولة من لوحة التحكم.',
        sortOrder: 27
    },
    {
        name: 'Figma',
        iconName: 'figma',
        category: 'development',
        desc: 'View and collaborate on Figma designs in one place.',
        descAr: 'عرض والتعاون على تصاميم فيجما في مكان واحد.',
        sortOrder: 28
    },

    // Other Apps
    {
        name: 'Medium',
        iconName: 'medium',
        category: 'other',
        desc: 'Explore and share Medium stories on your dashboard.',
        descAr: 'استكشاف ومشاركة قصص ميديوم من لوحة التحكم.',
        sortOrder: 29
    },
    {
        name: 'DocuSign',
        iconName: 'docusign',
        category: 'other',
        desc: 'Sign documents electronically and securely.',
        descAr: 'توقيع المستندات إلكترونياً وبشكل آمن.',
        sortOrder: 30
    }
];

const seedApps = async () => {
    try {
        // Connect to database
        await connectDB();
        console.log('📦 Connected to database');

        // Clear existing apps (optional - comment out to preserve existing)
        await App.deleteMany({});
        console.log('🗑️  Cleared existing apps');

        // Insert new apps
        const result = await App.insertMany(appsData);
        console.log(`✅ Successfully seeded ${result.length} apps`);

        // Log summary by category
        const categories = [...new Set(appsData.map(a => a.category))];
        categories.forEach(cat => {
            const count = appsData.filter(a => a.category === cat).length;
            console.log(`   - ${cat}: ${count} apps`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding apps:', error);
        process.exit(1);
    }
};

// Run the seed
seedApps();
