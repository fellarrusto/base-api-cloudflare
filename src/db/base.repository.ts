export type WhereCondition =
  | { op: '=' | '!=' | '<' | '<=' | '>' | '>='; field: string; value: any }
  | { op: 'LIKE'; field: string; value: string }
  | { op: 'IN'; field: string; values: any[] };

export interface BaseRepository {
  findOne(id: string): Promise<Record<string, any> | null>;
  findOneBy(field: string, value: string): Promise<Record<string, any> | null>;
  findMany(filters?: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;
  findManyBy(filters: Record<string, any>, limit?: number): Promise<Record<string, any>[]>;
  findManyByIn(field: string, values: any[], limit?: number): Promise<Record<string, any>[]>;
  findManyWhere(conditions: WhereCondition[], limit?: number): Promise<Record<string, any>[]>;
  countBy(groupByField: string): Promise<Record<string, number>>;
  insertOne(data: Record<string, any>): Promise<string>;
  updateOne(id: string, data: Record<string, any>): Promise<boolean>;
  updateManyBy(filters: Record<string, any>, data: Record<string, any>): Promise<number>;
  deleteOne(id: string): Promise<boolean>;
}