// ==============================================================================
// Ardab Market - Seed Initial Security Data (Detection Rules, Firewall, Alerts)
// ==============================================================================

import { prisma } from '../src/shared/config/database.js';

async function seedSecurity() {
  console.log('[SEED] Seeding Platform Security data...');

  // 1. Detection Rules
  const rules = [
    {
      name: 'Rapid Failed Login Burst',
      description: 'Triggers when 5 or more failed logins occur from the same IP within 10 minutes',
      eventType: 'LOGIN_FAILED',
      threshold: 5,
      timeWindowSeconds: 600,
      severity: 'HIGH',
      isActive: true,
    },
    {
      name: 'Password Reset Flood',
      description: 'Triggers when 3 or more password reset requests occur from an IP within 5 minutes',
      eventType: 'PASSWORD_RESET_REQUESTED',
      threshold: 3,
      timeWindowSeconds: 300,
      severity: 'MEDIUM',
      isActive: true,
    },
    {
      name: 'Rate Limit Violation Surge',
      description: 'Triggers when an IP repeatedly triggers 429 rate limits across endpoints',
      eventType: 'RATE_LIMIT_TRIGGERED',
      threshold: 10,
      timeWindowSeconds: 300,
      severity: 'HIGH',
      isActive: true,
    },
  ];

  for (const rule of rules) {
    await prisma.securityDetectionRule.upsert({
      where: { name: rule.name },
      update: rule,
      create: rule,
    });
  }
  console.log('[SEED] Detection rules upserted.');

  // 2. IP Block Rules
  const ipRules = [
    {
      ipAddress: '197.156.98.12',
      reason: 'Internal Sub Admin Gateway — Authorized VPN Proxy',
      status: 'WHITELISTED',
      blockedBy: 'Eden Tilahun (Sub Admin)',
    },
    {
      ipAddress: '102.218.45.89',
      reason: 'Repeated brute force attempts on customer authentication endpoint',
      status: 'BLOCKED',
      blockedBy: 'Security Automation Engine',
    },
    {
      ipAddress: '196.188.64.10',
      reason: 'Suspicious scraping of merchant commodity pricing API',
      status: 'BLOCKED',
      blockedBy: 'Eden Tilahun (Sub Admin)',
    },
  ];

  for (const r of ipRules) {
    await prisma.ipBlockRule.upsert({
      where: { ipAddress: r.ipAddress },
      update: r,
      create: r,
    });
  }
  console.log('[SEED] IP Firewall rules upserted.');

  // 3. Realistic Security Events & Alerts
  const existingEventsCount = await prisma.securityEvent.count();
  if (existingEventsCount === 0) {
    const event1 = await prisma.securityEvent.create({
      data: {
        eventType: 'LOGIN_FAILED',
        severity: 'LOW',
        source: 'CUSTOMER_WEB',
        actorType: 'CUSTOMER',
        actorEmail: 'yonas.tadesse@example.com',
        ipAddress: '102.218.45.89',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        endpoint: '/api/customer/auth/login',
        httpMethod: 'POST',
        metadata: { failureReason: 'Invalid password', attemptCount: 1, city: 'Gondar, Ethiopia' },
      },
    });

    const event2 = await prisma.securityEvent.create({
      data: {
        eventType: 'LOGIN_FAILED',
        severity: 'MEDIUM',
        source: 'CUSTOMER_WEB',
        actorType: 'CUSTOMER',
        actorEmail: 'yonas.tadesse@example.com',
        ipAddress: '102.218.45.89',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        endpoint: '/api/customer/auth/login',
        httpMethod: 'POST',
        metadata: { failureReason: 'Invalid password', attemptCount: 2, city: 'Gondar, Ethiopia' },
      },
    });

    const event3 = await prisma.securityEvent.create({
      data: {
        eventType: 'SUSPICIOUS_LOGIN',
        severity: 'HIGH',
        source: 'SELLER_WEB',
        actorType: 'SELLER',
        actorEmail: 'meron.supplier@grainunion.et',
        ipAddress: '196.188.64.10',
        userAgent: 'Python-urllib/3.10',
        endpoint: '/api/seller/auth/login',
        httpMethod: 'POST',
        metadata: { failureReason: 'Anomalous User Agent & Geolocation discrepancy' },
      },
    });

    // Create Security Alert for suspicious login
    await prisma.securityAlert.create({
      data: {
        alertType: 'SUSPICIOUS_LOGIN',
        severity: 'HIGH',
        title: 'Anomalous Automated Login Request',
        description: 'Automated Python client script attempted authenticated access against seller credentials from IP 196.188.64.10.',
        status: 'OPEN',
        source: 'SELLER_WEB',
        eventId: event3.id,
        ipAddress: '196.188.64.10',
      },
    });

    // Create Critical Alert for credential stuffing
    await prisma.securityAlert.create({
      data: {
        alertType: 'CREDENTIAL_STUFFING',
        severity: 'CRITICAL',
        title: 'Potential Distributed Credential Stuffing',
        description: 'Rapid series of 15 authentication attempts across multiple customer accounts originated from IP 102.218.45.89.',
        status: 'INVESTIGATING',
        source: 'API',
        eventId: event2.id,
        ipAddress: '102.218.45.89',
      },
    });

    console.log('[SEED] Initial security events and alerts created.');
  }

  console.log('[SEED] Security seeding completed successfully.');
}

seedSecurity()
  .catch((e) => {
    console.error('[SEED] Error seeding security data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
