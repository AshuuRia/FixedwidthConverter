import { type User, type InsertUser, type LiquorRecord, type InsertLiquorRecord } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Liquor record methods
  createLiquorRecord(record: InsertLiquorRecord): Promise<LiquorRecord>;
  getLiquorRecords(): Promise<LiquorRecord[]>;
  clearLiquorRecords(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private liquorRecords: Map<string, LiquorRecord>;

  constructor() {
    this.users = new Map();
    this.liquorRecords = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createLiquorRecord(insertRecord: InsertLiquorRecord): Promise<LiquorRecord> {
    const id = randomUUID();
    const record: LiquorRecord = { 
      id,
      ...insertRecord,
      adaNumber: insertRecord.adaNumber || null,
      adaName: insertRecord.adaName || null,
      vendorName: insertRecord.vendorName || null,
      proof: insertRecord.proof || null,
      bottleSize: insertRecord.bottleSize || null,
      packSize: insertRecord.packSize || null,
      onPremisePrice: insertRecord.onPremisePrice || null,
      offPremisePrice: insertRecord.offPremisePrice || null,
      shelfPrice: insertRecord.shelfPrice || null,
      upcCode1: insertRecord.upcCode1 || null,
      upcCode2: insertRecord.upcCode2 || null,
      effectiveDate: insertRecord.effectiveDate || null,
    };
    this.liquorRecords.set(id, record);
    return record;
  }

  async getLiquorRecords(): Promise<LiquorRecord[]> {
    return Array.from(this.liquorRecords.values());
  }

  async clearLiquorRecords(): Promise<void> {
    this.liquorRecords.clear();
  }
}

export const storage = new MemStorage();
