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
    return Timestamp.fromMillis(date.getTime());
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
