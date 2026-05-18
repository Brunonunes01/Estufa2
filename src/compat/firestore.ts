export type Unsubscribe = () => void;

const removed = (fn: string) => {
  throw new Error(`Firebase removido do app (Supabase-only). Função legada chamada: ${fn}.`);
};

export class Timestamp {
  readonly seconds: number;
  readonly nanoseconds: number;

  constructor(seconds: number, nanoseconds = 0) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  static now() {
    return Timestamp.fromDate(new Date());
  }

  static fromDate(date: Date) {
    const ms = date.getTime();
    return Timestamp.fromMillis(ms);
  }

  static fromMillis(ms: number) {
    const seconds = Math.floor(ms / 1000);
    const millisRemainder = ms - seconds * 1000;
    return new Timestamp(seconds, millisRemainder * 1_000_000);
  }

  toDate() {
    return new Date(this.toMillis());
  }

  toMillis() {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1_000_000);
  }
}

export const collection: any = (..._args: any[]) => removed('collection');
export const addDoc: any = (..._args: any[]) => removed('addDoc');
export const query: any = (..._args: any[]) => removed('query');
export const where: any = (..._args: any[]) => removed('where');
export const getDocs: any = (..._args: any[]) => removed('getDocs');
export const deleteDoc: any = (..._args: any[]) => removed('deleteDoc');
export const doc: any = (..._args: any[]) => removed('doc');
export const updateDoc: any = (..._args: any[]) => removed('updateDoc');
export const getDoc: any = (..._args: any[]) => removed('getDoc');
export const getAggregateFromServer: any = (..._args: any[]) => removed('getAggregateFromServer');
export const sum: any = (..._args: any[]) => removed('sum');
export const setDoc: any = (..._args: any[]) => removed('setDoc');
export const writeBatch: any = (..._args: any[]) => removed('writeBatch');
export const runTransaction: any = (..._args: any[]) => removed('runTransaction');
export const orderBy: any = (..._args: any[]) => removed('orderBy');
export const limit: any = (..._args: any[]) => removed('limit');
export const waitForPendingWrites: any = async (..._args: any[]) => removed('waitForPendingWrites');
