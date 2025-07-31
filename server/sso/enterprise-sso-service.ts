/**
 * Enterprise SSO Service
 * Provides SAML, OIDC, and OAuth2 single sign-on capabilities
 */

import { db } from '../db';
import { ssoProviders, auditLogs, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as saml from 'samlify';
import openidClient from 'openid-client';
import * as jwt from 'jsonwebtoken';

interface SSOConfig {
  providerType: 'saml' | 'oidc' | 'oauth2';
  providerName: string;
  entityId?: string;
  ssoUrl?: string;
  certificateData?: string;
  clientId?: string;
  clientSecret?: string;
  discoveryUrl?: string;
  metadata?: any;
}

export class EnterpriseSSOService {
  private samlProviders: Map<number, any> = new Map();
  private oidcProviders: Map<number, any> = new Map();

  async configureSSOProvider(
    organizationId: number,
    config: SSOConfig
  ): Promise<any> {
    // Create or update SSO provider
    const existingProvider = await db.select()
      .from(ssoProviders)
      .where(eq(ssoProviders.organizationId, organizationId))
      .limit(1);

    let providerId: number;

    if (existingProvider.length > 0) {
      // Update existing
      await db.update(ssoProviders)
        .set({
          providerType: config.providerType,
          providerName: config.providerName,
          entityId: config.entityId,
          ssoUrl: config.ssoUrl,
          certificateData: config.certificateData,
          metadata: config.metadata,
          updatedAt: new Date(),
        })
        .where(eq(ssoProviders.id, existingProvider[0].id));
      
      providerId = existingProvider[0].id;
    } else {
      // Create new
      const [provider] = await db.insert(ssoProviders).values({
        organizationId,
        providerType: config.providerType,
        providerName: config.providerName,
        entityId: config.entityId,
        ssoUrl: config.ssoUrl,
        certificateData: config.certificateData,
        metadata: config.metadata,
        isActive: true,
      }).returning();
      
      providerId = provider.id;
    }

    // Initialize provider
    await this.initializeProvider(providerId, config);

    // Log configuration
    await this.logAuditEvent(organizationId, null, 'sso_configured', {
      providerId,
      providerType: config.providerType,
    });

    return { providerId, success: true };
  }

  private async initializeProvider(
    providerId: number,
    config: SSOConfig
  ): Promise<void> {
    switch (config.providerType) {
      case 'saml':
        await this.initializeSAMLProvider(providerId, config);
        break;
      case 'oidc':
        await this.initializeOIDCProvider(providerId, config);
        break;
      case 'oauth2':
        // OAuth2 doesn't require initialization
        break;
    }
  }

  private async initializeSAMLProvider(
    providerId: number,
    config: SSOConfig
  ): Promise<void> {
    const sp = saml.ServiceProvider({
      entityID: `https://e-code.com/saml/sp/${providerId}`,
      authnRequestsSigned: false,
      wantAssertionsSigned: true,
      wantMessageSigned: true,
      wantLogoutResponseSigned: true,
      wantLogoutRequestSigned: true,
      privateKey: this.getPrivateKey(),
      privateKeyPass: process.env.SAML_KEY_PASS,
      isAssertionEncrypted: false,
      assertionConsumerService: [{
        Binding: saml.Constants.namespace.binding.post,
        Location: `https://e-code.com/api/sso/saml/${providerId}/acs`,
      }],
    });

    const idp = saml.IdentityProvider({
      entityID: config.entityId!,
      singleSignOnService: [{
        Binding: saml.Constants.namespace.binding.redirect,
        Location: config.ssoUrl!,
      }],
      singleLogoutService: [{
        Binding: saml.Constants.namespace.binding.redirect,
        Location: config.ssoUrl!.replace('/sso', '/slo'),
      }],
      isAssertionEncrypted: false,
      messageSigningOrder: 'sign-then-encrypt',
      wantLogoutRequestSigned: true,
      wantAuthnRequestsSigned: false,
      wantMessageSigned: true,
      signingCert: config.certificateData!,
    });

    this.samlProviders.set(providerId, { sp, idp });
  }

  private async initializeOIDCProvider(
    providerId: number,
    config: SSOConfig
  ): Promise<void> {
    const issuer = await openidClient.Issuer.discover(config.discoveryUrl || config.ssoUrl!);
    
    const client = new issuer.Client({
      client_id: config.metadata?.clientId,
      client_secret: config.metadata?.clientSecret,
      redirect_uris: [`https://e-code.com/api/sso/oidc/${providerId}/callback`],
      response_types: ['code'],
    });

    this.oidcProviders.set(providerId, client);
  }

  async generateSAMLRequest(providerId: number): Promise<string> {
    const provider = this.samlProviders.get(providerId);
    if (!provider) {
      throw new Error('SAML provider not configured');
    }

    const { sp, idp } = provider;
    const request = sp.createLoginRequest(idp, 'redirect');
    
    return request;
  }

  async processSAMLResponse(
    providerId: number,
    samlResponse: string
  ): Promise<any> {
    const provider = this.samlProviders.get(providerId);
    if (!provider) {
      throw new Error('SAML provider not configured');
    }

    const { sp, idp } = provider;
    
    try {
      const parseResult = await sp.parseLoginResponse(idp, 'post', {
        body: { SAMLResponse: samlResponse },
      });

      const claims = parseResult.extract;
      
      // Find or create user
      const email = claims.attributes.email || claims.nameID;
      const user = await this.findOrCreateSSOUser(email, claims);

      // Log successful login
      const [providerData] = await db.select()
        .from(ssoProviders)
        .where(eq(ssoProviders.id, providerId));

      await this.logAuditEvent(
        providerData.organizationId,
        user.id,
        'sso_login_success',
        { providerId, method: 'saml' }
      );

      return { user, claims };
    } catch (error) {
      await this.logAuditEvent(null, null, 'sso_login_failed', {
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async generateOIDCAuthUrl(providerId: number): Promise<string> {
    const client = this.oidcProviders.get(providerId);
    if (!client) {
      throw new Error('OIDC provider not configured');
    }

    const authUrl = client.authorizationUrl({
      scope: 'openid email profile',
      state: crypto.randomBytes(16).toString('hex'),
      nonce: crypto.randomBytes(16).toString('hex'),
    });

    return authUrl;
  }

  async processOIDCCallback(
    providerId: number,
    code: string,
    state: string
  ): Promise<any> {
    const client = this.oidcProviders.get(providerId);
    if (!client) {
      throw new Error('OIDC provider not configured');
    }

    try {
      const tokenSet = await client.callback(
        `https://e-code.com/api/sso/oidc/${providerId}/callback`,
        { code, state }
      );

      const userInfo = await client.userinfo(tokenSet.access_token!);
      
      // Find or create user
      const user = await this.findOrCreateSSOUser(userInfo.email, userInfo);

      // Log successful login
      const [providerData] = await db.select()
        .from(ssoProviders)
        .where(eq(ssoProviders.id, providerId));

      await this.logAuditEvent(
        providerData.organizationId,
        user.id,
        'sso_login_success',
        { providerId, method: 'oidc' }
      );

      return { user, tokenSet, userInfo };
    } catch (error) {
      await this.logAuditEvent(null, null, 'sso_login_failed', {
        providerId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private async findOrCreateSSOUser(
    email: string,
    claims: any
  ): Promise<any> {
    let [user] = await db.select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      // Create new user from SSO
      const username = email.split('@')[0] + '-' + Date.now();
      
      [user] = await db.insert(users).values({
        username,
        email,
        displayName: claims.name || claims.displayName || username,
        emailVerified: true,
        password: crypto.randomBytes(32).toString('hex'), // Random password
      }).returning();
    }

    return user;
  }

  async logAuditEvent(
    organizationId: number | null,
    userId: number | null,
    action: string,
    details: any,
    status: 'success' | 'failure' = 'success'
  ): Promise<void> {
    await db.insert(auditLogs).values({
      organizationId,
      userId,
      action,
      resourceType: 'authentication',
      details,
      status,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
    });
  }

  async getAuditLogs(
    organizationId: number,
    filters?: {
      userId?: number;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    let query = db.select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId));

    // Apply filters
    // In production, add proper filtering logic

    return await query.orderBy(auditLogs.timestamp);
  }

  async generateAuditReport(
    organizationId: number,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const logs = await this.getAuditLogs(organizationId, {
      startDate,
      endDate,
    });

    // Generate report
    const report = {
      organizationId,
      period: { startDate, endDate },
      totalEvents: logs.length,
      successfulLogins: logs.filter(l => l.action === 'sso_login_success').length,
      failedLogins: logs.filter(l => l.action === 'sso_login_failed').length,
      configurationChanges: logs.filter(l => l.action === 'sso_configured').length,
      uniqueUsers: new Set(logs.map(l => l.userId).filter(Boolean)).size,
      eventsByDay: this.groupEventsByDay(logs),
      topActions: this.getTopActions(logs),
    };

    return report;
  }

  private groupEventsByDay(logs: any[]): any {
    // Group events by day for chart visualization
    const grouped = {};
    logs.forEach(log => {
      const day = log.timestamp.toISOString().split('T')[0];
      grouped[day] = (grouped[day] || 0) + 1;
    });
    return grouped;
  }

  private getTopActions(logs: any[]): any {
    // Get top actions for summary
    const actionCounts = {};
    logs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    
    return Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));
  }

  private getPrivateKey(): string {
    // In production, load from secure storage
    return process.env.SAML_PRIVATE_KEY || `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDN...
-----END PRIVATE KEY-----`;
  }

  async testSSOConnection(providerId: number): Promise<any> {
    const [provider] = await db.select()
      .from(ssoProviders)
      .where(eq(ssoProviders.id, providerId));

    if (!provider) {
      throw new Error('Provider not found');
    }

    try {
      switch (provider.providerType) {
        case 'saml':
          // Test SAML metadata endpoint
          const response = await fetch(provider.ssoUrl + '/metadata');
          return { success: response.ok, metadata: await response.text() };
        
        case 'oidc':
          // Test OIDC discovery
          const issuer = await openidClient.Issuer.discover((provider.metadata as any)?.discoveryUrl);
          return { success: true, issuer: issuer.metadata };
        
        default:
          return { success: true };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const enterpriseSSOService = new EnterpriseSSOService();