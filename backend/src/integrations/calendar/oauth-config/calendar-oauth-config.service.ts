import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CalendarProvider } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class CalendarOAuthConfigService {
  private readonly logger = new Logger(CalendarOAuthConfigService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private prisma: PrismaService) {
    // Use environment variable for encryption key
    // In production, this should be a secure random key stored in env
    const key =
      process.env.ENCRYPTION_KEY ||
      'your-32-character-secret-key!!'; // 32 chars for AES-256
    this.encryptionKey = Buffer.from(key.padEnd(32, '0').slice(0, 32));
  }

  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  async getConfig(provider: string) {
    const providerEnum =
      provider.toUpperCase() as keyof typeof CalendarProvider;

    const config = await this.prisma.calendarOAuthConfig.findUnique({
      where: { provider: CalendarProvider[providerEnum] },
    });

    if (!config) {
      return null;
    }

    // Decrypt client secret
    return {
      ...config,
      clientSecret: config.clientSecret
        ? this.decrypt(config.clientSecret)
        : '',
    };
  }

  async saveConfig(
    provider: string,
    data: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
      scopes: string;
      isEnabled: boolean;
    },
  ) {
    const providerEnum =
      provider.toUpperCase() as keyof typeof CalendarProvider;

    // Encrypt client secret
    const encryptedSecret = this.encrypt(data.clientSecret);

    const config = await this.prisma.calendarOAuthConfig.upsert({
      where: { provider: CalendarProvider[providerEnum] },
      update: {
        clientId: data.clientId,
        clientSecret: encryptedSecret,
        redirectUri: data.redirectUri,
        scopes: data.scopes,
        isEnabled: data.isEnabled,
      },
      create: {
        provider: CalendarProvider[providerEnum],
        clientId: data.clientId,
        clientSecret: encryptedSecret,
        redirectUri: data.redirectUri,
        scopes: data.scopes,
        isEnabled: data.isEnabled,
      },
    });

    return config;
  }

  async getAllConfigs() {
    const configs = await this.prisma.calendarOAuthConfig.findMany();

    return configs.map((config) => ({
      ...config,
      clientSecret: config.clientSecret
        ? this.decrypt(config.clientSecret)
        : '',
    }));
  }

  async getConfigByProvider(provider: CalendarProvider) {
    const config = await this.prisma.calendarOAuthConfig.findUnique({
      where: { provider },
    });

    if (!config) {
      return null;
    }

    return {
      ...config,
      clientSecret: this.decrypt(config.clientSecret),
    };
  }

  async isProviderEnabled(provider: CalendarProvider): Promise<boolean> {
    const config = await this.prisma.calendarOAuthConfig.findUnique({
      where: { provider },
    });

    return config?.isEnabled ?? false;
  }
}
