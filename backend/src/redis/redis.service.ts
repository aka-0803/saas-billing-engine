import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: '127.0.0.1',
      port: 6379,
    });
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: any, ttl: number) {
    return this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }
}
