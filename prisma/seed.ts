import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding template library...');

  const templates = [
    // HVAC Templates
    {
      category: 'HVAC',
      name: 'HVAC Standard',
      templateType: 'standard',
      messageText:
        "Hi! Thanks for calling {business_name}. We're currently helping another customer but we'll call you back within the hour. If this is an emergency, reply URGENT and we'll prioritize your call.",
    },
    {
      category: 'HVAC',
      name: 'HVAC Voicemail',
      templateType: 'voicemail',
      messageText:
        "Thanks for calling {business_name} and leaving a voicemail. We'll review it and get back to you within 2 hours. For HVAC emergencies, reply EMERGENCY.",
    },
    {
      category: 'HVAC',
      name: 'HVAC After Hours',
      templateType: 'after_hours',
      messageText:
        "Thanks for contacting {business_name}. We're currently closed but we'll be back {business_hours}. We'll reach out first thing when we open. For emergencies, reply EMERGENCY.",
    },
    {
      category: 'HVAC',
      name: 'HVAC Standard - Friendly',
      templateType: 'standard',
      messageText:
        "Hey there! {business_name} here. We're with a customer right now but saw your call. We'll ring you back in 30-60 minutes. Reply ASAP if it's urgent!",
    },
    {
      category: 'HVAC',
      name: 'HVAC Voicemail - Detailed',
      templateType: 'voicemail',
      messageText:
        "Hi from {business_name}! We got your voicemail and are on it. Our team will call you back within 2 hours during business hours. Emergency? Text EMERGENCY right away.",
    },
    {
      category: 'HVAC',
      name: 'HVAC After Hours - Weekend',
      templateType: 'after_hours',
      messageText:
        "Thanks for reaching out to {business_name}. We're closed for the weekend. Office hours are {business_hours}. We'll contact you Monday morning. For emergencies, reply 911.",
    },

    // Plumbing Templates
    {
      category: 'Plumbing',
      name: 'Plumbing Standard',
      templateType: 'standard',
      messageText:
        "Hi! {business_name} here. We're currently on a job but saw your call. We'll get back to you within 60 minutes. Got a leak or emergency? Reply URGENT.",
    },
    {
      category: 'Plumbing',
      name: 'Plumbing Voicemail',
      templateType: 'voicemail',
      messageText:
        "Thanks for your voicemail to {business_name}. We'll listen and call you back within 2 hours. If you have a plumbing emergency, text EMERGENCY now.",
    },
    {
      category: 'Plumbing',
      name: 'Plumbing After Hours',
      templateType: 'after_hours',
      messageText:
        "You've reached {business_name} after hours. We're back {business_hours}. We'll call you first thing. For burst pipes or emergencies, reply EMERGENCY.",
    },
    {
      category: 'Plumbing',
      name: 'Plumbing Standard - Professional',
      templateType: 'standard',
      messageText:
        "Thank you for contacting {business_name}. We're currently assisting another customer. You'll receive a callback within one hour. Reply URGENT for immediate assistance.",
    },
    {
      category: 'Plumbing',
      name: 'Plumbing Voicemail - Quick',
      templateType: 'voicemail',
      messageText:
        "Got your message at {business_name}. We'll review and return your call ASAP. Emergency plumbing issue? Text EMERGENCY immediately.",
    },
    {
      category: 'Plumbing',
      name: 'Plumbing After Hours - Detailed',
      templateType: 'after_hours',
      messageText:
        "Hi! {business_name} is closed now. Our hours are {business_hours}. We'll reach out when we reopen. For flooding, burst pipes, or emergencies, reply EMERGENCY for 24/7 service.",
    },

    // Medical/Dental Templates
    {
      category: 'Medical',
      name: 'Medical Standard',
      templateType: 'standard',
      messageText:
        "Thank you for calling {business_name}. All of our lines are currently busy. We'll return your call within 30 minutes. For medical emergencies, please call 911.",
    },
    {
      category: 'Medical',
      name: 'Medical Voicemail',
      templateType: 'voicemail',
      messageText:
        "Thank you for your message to {business_name}. We'll review your voicemail and call you back within one hour during business hours.",
    },
    {
      category: 'Medical',
      name: 'Medical After Hours',
      templateType: 'after_hours',
      messageText:
        "{business_name} is currently closed. Our office hours are {business_hours}. We'll contact you when we reopen. For medical emergencies, please dial 911.",
    },
    {
      category: 'Medical',
      name: 'Dental Standard',
      templateType: 'standard',
      messageText:
        "Hi! Thanks for calling {business_name}. We're with a patient but will call you back within 45 minutes. Dental emergency? Reply EMERGENCY.",
    },

    // Legal Templates
    {
      category: 'Legal',
      name: 'Legal Standard',
      templateType: 'standard',
      messageText:
        "Thank you for contacting {business_name}. We're currently with a client. We'll return your call within 2 hours. For urgent matters, reply URGENT.",
    },
    {
      category: 'Legal',
      name: 'Legal Voicemail',
      templateType: 'voicemail',
      messageText:
        "Thank you for your voicemail to {business_name}. We've received your message and will respond within 4 business hours. For time-sensitive matters, reply URGENT.",
    },
    {
      category: 'Legal',
      name: 'Legal After Hours',
      templateType: 'after_hours',
      messageText:
        "{business_name} is closed. Office hours: {business_hours}. We'll contact you during our next business day. For emergencies, reply EMERGENCY and include your case number.",
    },

    // Restaurant Templates
    {
      category: 'Restaurant',
      name: 'Restaurant Standard',
      templateType: 'standard',
      messageText:
        "Hi! Thanks for calling {business_name}. We're busy serving customers. We'll call you back in 15-20 minutes. Want to order? Visit our website or reply MENU.",
    },
    {
      category: 'Restaurant',
      name: 'Restaurant Voicemail',
      templateType: 'voicemail',
      messageText:
        "Thanks for your message to {business_name}. We'll get back to you within 30 minutes. To place an order now, reply ORDER and we'll text you our menu!",
    },
    {
      category: 'Restaurant',
      name: 'Restaurant After Hours',
      templateType: 'after_hours',
      messageText:
        "{business_name} is closed right now. We're open {business_hours}. We'll reach out when we open! Want to place an order for tomorrow? Reply ORDER.",
    },

    // General Templates
    {
      category: 'General',
      name: 'General Standard',
      templateType: 'standard',
      messageText:
        "Hi! Thanks for calling {business_name}. We're currently unavailable but will return your call within one hour. For urgent matters, reply URGENT.",
    },
    {
      category: 'General',
      name: 'General Voicemail',
      templateType: 'voicemail',
      messageText:
        "Thank you for leaving a voicemail with {business_name}. We'll review your message and get back to you within 2 hours during business hours.",
    },
    {
      category: 'General',
      name: 'General After Hours',
      templateType: 'after_hours',
      messageText:
        "Thanks for contacting {business_name}. We're currently closed. Our business hours are {business_hours}. We'll reach out when we reopen. For emergencies, reply EMERGENCY.",
    },
  ];

  for (const template of templates) {
    await prisma.templateLibrary.upsert({
      where: {
        id: `${template.category}-${template.name}`.toLowerCase().replace(/\s+/g, '-'),
      },
      update: {},
      create: template,
    });
  }

  console.log('✅ Template library seeded successfully!');
  console.log(`Created ${templates.length} templates across 6 categories.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
