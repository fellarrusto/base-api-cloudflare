export interface BaseRepository {
  findOne(id: string): Promise<Record<string, any> | null>;
  findOneBy(field: string, value: string): Promise<Record<string, any> | null>;
  findMany(filters?: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;
  findManyBy(filters: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;
  insertOne(data: Record<string, any>): Promise<string>;
  updateOne(id: string, data: Record<string, any>): Promise<boolean>;
  updateManyBy(filters: Record<string, any>, data: Record<string, any>): Promise<number>;
  deleteOne(id: string): Promise<boolean>;
}