import { Service } from './types';

export interface ProviderResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  rawResponse?: string;
  isSimulated?: boolean;
}

export interface ProviderBalanceResponse {
  balance: string | number;
  currency: string;
}

export interface ProviderAddOrderResponse {
  order: number | string;
}

export interface ProviderRawService {
  service: number | string;
  name: string;
  category: string;
  rate: string | number;
  min: number | string;
  max: number | string;
  type?: string;
  dripfeed?: boolean | number | string;
  refill?: boolean | number | string;
  desc?: string;
}

export class SmmApiService {
  /**
   * Test connection & fetch balance from external SMM API
   */
  static async checkBalance(apiUrl: string, apiKey: string): Promise<ProviderResponse<ProviderBalanceResponse>> {
    if (!apiUrl || !apiKey) {
      return { success: false, error: 'API URL and API Key are required' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('key', apiKey);
      formData.append('action', 'balance');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        // Not JSON
        return {
          success: false,
          statusCode: response.status,
          rawResponse: text,
          error: `Invalid response format from API provider (Status ${response.status}). Response was not JSON.`,
        };
      }

      if (json.balance !== undefined) {
        return {
          success: true,
          statusCode: response.status,
          data: {
            balance: json.balance,
            currency: json.currency || 'USD',
          },
          rawResponse: JSON.stringify(json, null, 2),
        };
      }

      if (json.error) {
        return {
          success: false,
          statusCode: response.status,
          error: json.error,
          rawResponse: JSON.stringify(json, null, 2),
        };
      }

      return {
        success: false,
        statusCode: response.status,
        error: 'Unrecognized response schema from API provider',
        rawResponse: text,
      };
    } catch (err: any) {
      // Typically CORS or Network Error in browser
      console.warn('Direct API fetch failed, could be CORS:', err);
      return {
        success: false,
        error: `Browser Network / CORS Notice: ${err.message || 'Failed to fetch'}. Note: If your provider does not enable Access-Control-Allow-Origin, you can use our built-in Provider Simulator or configure a backend proxy.`,
      };
    }
  }

  /**
   * Fetch services list from external SMM API
   */
  static async fetchServices(apiUrl: string, apiKey: string): Promise<ProviderResponse<ProviderRawService[]>> {
    if (!apiUrl || !apiKey) {
      return { success: false, error: 'API URL and API Key are required' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('key', apiKey);
      formData.append('action', 'services');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return {
          success: false,
          statusCode: response.status,
          rawResponse: text,
          error: `Provider did not return JSON (Status ${response.status})`,
        };
      }

      if (Array.isArray(json)) {
        return {
          success: true,
          statusCode: response.status,
          data: json,
          rawResponse: JSON.stringify(json.slice(0, 10), null, 2) + `\n... [${json.length} total services]`,
        };
      }

      if (json.error) {
        return {
          success: false,
          statusCode: response.status,
          error: json.error,
          rawResponse: JSON.stringify(json, null, 2),
        };
      }

      return {
        success: false,
        statusCode: response.status,
        error: 'Unexpected response schema (expected array of services)',
        rawResponse: text,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Direct API call failed (${err.message || 'CORS / Network restriction'}). Use Demo Sync mode or Paste Raw Services JSON directly.`,
      };
    }
  }

  /**
   * Send order to external SMM API
   */
  static async sendOrder(
    apiUrl: string,
    apiKey: string,
    params: {
      service: number | string;
      link: string;
      quantity: number;
      runs?: number;
      interval?: number;
    }
  ): Promise<ProviderResponse<ProviderAddOrderResponse>> {
    if (!apiUrl || !apiKey) {
      return { success: false, error: 'API URL and API Key are required' };
    }

    try {
      const formData = new URLSearchParams();
      formData.append('key', apiKey);
      formData.append('action', 'add');
      formData.append('service', String(params.service));
      formData.append('link', params.link);
      formData.append('quantity', String(params.quantity));
      if (params.runs) formData.append('runs', String(params.runs));
      if (params.interval) formData.append('interval', String(params.interval));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        return {
          success: false,
          statusCode: response.status,
          rawResponse: text,
          error: `Provider error response (Status ${response.status})`,
        };
      }

      if (json.order) {
        return {
          success: true,
          statusCode: response.status,
          data: { order: json.order },
          rawResponse: JSON.stringify(json, null, 2),
        };
      }

      return {
        success: false,
        statusCode: response.status,
        error: json.error || 'Failed to place order on provider',
        rawResponse: JSON.stringify(json, null, 2),
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Provider dispatch failed: ${err.message}`,
      };
    }
  }

  /**
   * Convert external provider raw services to ViralCute service format with markup
   */
  static mapRawServicesToInternal(
    rawServices: ProviderRawService[],
    markupPercent: number
  ): Service[] {
    return rawServices.map((raw, index) => {
      const baseRate = parseFloat(String(raw.rate)) || 1.0;
      const rateWithMarkup = Number((baseRate * (1 + markupPercent / 100)).toFixed(3));

      // Guess platform from category or service name
      const nameAndCat = `${raw.name} ${raw.category}`.toLowerCase();
      let platform: Service['platform'] = 'Instagram';
      if (nameAndCat.includes('tiktok')) platform = 'TikTok';
      else if (nameAndCat.includes('youtube') || nameAndCat.includes('yt')) platform = 'YouTube';
      else if (nameAndCat.includes('twitter') || nameAndCat.includes(' x ')) platform = 'Twitter';
      else if (nameAndCat.includes('spotify')) platform = 'Spotify';
      else if (nameAndCat.includes('telegram') || nameAndCat.includes('tg')) platform = 'Telegram';
      else if (nameAndCat.includes('threads')) platform = 'Threads';
      else if (nameAndCat.includes('twitch')) platform = 'Twitch';
      else if (nameAndCat.includes('facebook') || nameAndCat.includes('fb')) platform = 'Facebook';

      const hasRefill = Boolean(raw.refill) || nameAndCat.includes('refill') || nameAndCat.includes('guarantee');

      return {
        id: typeof raw.service === 'number' ? raw.service : Number(raw.service) || index + 1000,
        name: raw.name,
        category: raw.category || `${platform} Services`,
        platform,
        rate: rateWithMarkup,
        originalRate: baseRate,
        min: Number(raw.min) || 50,
        max: Number(raw.max) || 100000,
        dripfeed: Boolean(raw.dripfeed),
        refill: hasRefill,
        refillDays: hasRefill ? 30 : 0,
        avgTime: '10-30 min',
        speed: '10K-50K/Day',
        quality: baseRate > 2 ? 'VIP Cute' : 'High Quality',
        description: raw.desc || `Provider Service ID: ${raw.service}. Rate: $${rateWithMarkup}/1k with ${markupPercent}% profit margin applied.`,
        providerServiceId: raw.service,
      };
    });
  }
}
