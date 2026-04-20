import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    });
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async set(key: string, value: any, ttl: number) {
    return this.client.set(key, JSON.stringify(value), 'EX', ttl);
  }

  async incr(key: string) {
    return this.client.incr(key);
  }

  async expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }

  async del(key: string) {
    return this.client.del(key);
  }
}
