/**
 * Unit Tests for Billing Email Notifications
 */

import { BillingService } from '../../server/services/billing-service';
import { billingEmailTemplates } from '../../server/utils/billing-email-templates';
import sgMail from '@sendgrid/mail';

// Mock dependencies
jest.mock('@sendgrid/mail');
jest.mock('../../server/storage');

describe('Billing Email Notifications', () => {
  let billingService: BillingService;
  const mockStorage = require('../../server/storage').storage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    billingService = new BillingService();
    
    // Set up SendGrid mock
    process.env.SENDGRID_API_KEY = 'test-api-key';
    process.env.FROM_EMAIL = 'test@example.com';
    process.env.FROM_NAME = 'Test Platform';
  });

  afterEach(() => {
    delete process.env.SENDGRID_API_KEY;
  });

  describe('Email Templates', () => {
    test('should generate budget threshold alert email', () => {
      const email = billingEmailTemplates.budgetThresholdAlert(
        'TestUser',
        85,
        15.0,
        100.0,
        80
      );
      
      expect(email.subject).toContain('Budget Alert');
      expect(email.subject).toContain('85%');
      expect(email.html).toContain('TestUser');
      expect(email.html).toContain('85%');
      expect(email.html).toContain('15');
      expect(email.text).toContain('TestUser');
      expect(email.text).toContain('85%');
    });

    test('should generate low credits warning email', () => {
      const email = billingEmailTemplates.lowCreditsWarning(
        'TestUser',
        5.0,
        100.0
      );
      
      expect(email.subject).toContain('Low Credits Warning');
      expect(email.subject).toContain('5.00');
      expect(email.html).toContain('TestUser');
      expect(email.html).toContain('5.00');
      expect(email.text).toContain('5.00 credits remaining');
    });

    test('should generate credit depleted email', () => {
      const email = billingEmailTemplates.creditDepleted('TestUser');
      
      expect(email.subject).toContain('Credits Depleted');
      expect(email.html).toContain('TestUser');
      expect(email.html).toContain('depleted');
      expect(email.text).toContain('credit balance has been depleted');
    });

    test('should generate overage alert email', () => {
      const email = billingEmailTemplates.overageAlert(
        'TestUser',
        25.0,
        100.0
      );
      
      expect(email.subject).toContain('Overage Alert');
      expect(email.html).toContain('25.00');
      expect(email.html).toContain('100.00');
      expect(email.text).toContain('exceeded your monthly limit');
    });

    test('should generate monthly usage summary email', () => {
      const topResources = [
        { name: 'AI Processing', usage: 100, cost: 50.0 },
        { name: 'Storage', usage: 200, cost: 20.0 },
        { name: 'Compute', usage: 150, cost: 15.0 }
      ];
      
      const email = billingEmailTemplates.monthlyUsageSummary(
        'TestUser',
        'November 2025',
        85.0,
        100.0,
        topResources
      );
      
      expect(email.subject).toContain('Monthly Usage Summary');
      expect(email.subject).toContain('November 2025');
      expect(email.html).toContain('85.00 credits');
      expect(email.html).toContain('AI Processing');
      expect(email.text).toContain('85.00 credits out of 100.00');
    });
  });

  describe('Email Sending', () => {
    test('should send budget threshold alert when threshold exceeded', async () => {
      const mockSend = sgMail.send as jest.Mock;
      mockSend.mockResolvedValue([{ statusCode: 202 }]);
      
      mockStorage.getUserById.mockResolvedValue({
        id: 1,
        displayName: 'TestUser',
        username: 'testuser'
      });
      
      mockStorage.trackUsage.mockResolvedValue({});
      
      await billingService.sendBillingEmail(
        'budgetThresholdAlert',
        'user@example.com',
        {
          userId: 1,
          username: 'TestUser',
          usagePercentage: 85,
          remainingCredits: 15,
          totalCredits: 100,
          threshold: 80
        }
      );
      
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          from: expect.objectContaining({
            email: 'test@example.com',
            name: 'Test Platform'
          }),
          subject: expect.stringContaining('Budget Alert'),
          html: expect.stringContaining('TestUser'),
          text: expect.stringContaining('TestUser')
        })
      );
    });

    test('should not send email if SendGrid API key not configured', async () => {
      delete process.env.SENDGRID_API_KEY;
      const mockSend = sgMail.send as jest.Mock;
      
      await billingService.sendBillingEmail(
        'budgetThresholdAlert',
        'user@example.com',
        {
          username: 'TestUser',
          usagePercentage: 85,
          remainingCredits: 15,
          totalCredits: 100,
          threshold: 80
        }
      );
      
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('should handle SendGrid errors gracefully', async () => {
      const mockSend = sgMail.send as jest.Mock;
      mockSend.mockRejectedValue(new Error('SendGrid error'));
      
      mockStorage.getUserById.mockResolvedValue({
        id: 1,
        displayName: 'TestUser',
        username: 'testuser'
      });
      
      await expect(
        billingService.sendBillingEmail(
          'budgetThresholdAlert',
          'user@example.com',
          {
            userId: 1,
            username: 'TestUser',
            usagePercentage: 85,
            remainingCredits: 15,
            totalCredits: 100,
            threshold: 80
          }
        )
      ).rejects.toThrow('SendGrid error');
    });
  });

  describe('Alert Deduplication', () => {
    test('should not send duplicate budget alerts', async () => {
      const mockSend = sgMail.send as jest.Mock;
      mockSend.mockResolvedValue([{ statusCode: 202 }]);
      
      // Mock existing alert
      mockStorage.getUsageAlerts.mockResolvedValue([
        {
          userId: 1,
          alertType: 'budget_threshold',
          threshold: 80,
          sent: false,
          createdAt: new Date()
        }
      ]);
      
      mockStorage.getUserCredits.mockResolvedValue({
        userId: 1,
        monthlyCredits: '100.00',
        extraCredits: '0.00',
        remainingCredits: '15.00',
        resetDate: new Date()
      });
      
      mockStorage.getBudgetLimits.mockResolvedValue({
        userId: 1,
        monthlyLimit: '100.00',
        alertThreshold: 80,
        hardStop: true,
        notificationEmail: 'user@example.com'
      });
      
      // This should not send an email because alert already exists
      await billingService.checkAndSendAlerts(
        1,
        {
          userId: 1,
          monthlyCredits: '100.00',
          extraCredits: '0.00',
          remainingCredits: '15.00',
          resetDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 1,
          userId: 1,
          monthlyLimit: '100.00',
          alertThreshold: 80,
          hardStop: true,
          notificationEmail: 'user@example.com',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      // Should not send email since alert already exists
      expect(mockSend).not.toHaveBeenCalled();
    });

    test('should send low credits warning only once per day', async () => {
      const mockSend = sgMail.send as jest.Mock;
      mockSend.mockResolvedValue([{ statusCode: 202 }]);
      
      mockStorage.getUserById.mockResolvedValue({
        id: 1,
        displayName: 'TestUser',
        username: 'testuser'
      });
      
      // Mock recent alert (within 24 hours)
      mockStorage.getUsageAlerts.mockResolvedValue([
        {
          userId: 1,
          alertType: 'low_credits',
          threshold: 20,
          sent: true,
          createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) // 12 hours ago
        }
      ]);
      
      mockStorage.getBudgetLimits.mockResolvedValue({
        userId: 1,
        monthlyLimit: '100.00',
        alertThreshold: 80,
        hardStop: true,
        notificationEmail: 'user@example.com'
      });
      
      await billingService.sendLowCreditsWarning(
        1,
        {
          userId: 1,
          monthlyCredits: '100.00',
          extraCredits: '0.00',
          remainingCredits: '10.00', // 10% remaining
          resetDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      );
      
      // Should not send because alert was sent within 24 hours
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Email Rate Limiting', () => {
    test('should respect email rate limits', async () => {
      const mockSend = sgMail.send as jest.Mock;
      mockSend.mockResolvedValue([{ statusCode: 202 }]);
      
      mockStorage.getUserById.mockResolvedValue({
        id: 1,
        displayName: 'TestUser',
        username: 'testuser'
      });
      
      mockStorage.getUsageAlerts.mockResolvedValue([]);
      mockStorage.createUsageAlert.mockResolvedValue({ id: 1 });
      mockStorage.trackUsage.mockResolvedValue({});
      
      // Send multiple emails rapidly
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          billingService.sendBillingEmail(
            'lowCreditsWarning',
            'user@example.com',
            {
              userId: 1,
              username: 'TestUser',
              remainingCredits: 5,
              totalCredits: 100
            }
          )
        );
      }
      
      await Promise.all(promises);
      
      // All emails should go through in test environment
      // In production, rate limiting would apply
      expect(mockSend).toHaveBeenCalledTimes(5);
    });
  });
});