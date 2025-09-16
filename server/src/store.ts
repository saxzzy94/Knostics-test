export type StoreType = 'strings' | 'classifications';
const data: Record<StoreType, string[][]> = {
  strings: [],
  classifications: [],
};
function get(type: StoreType): string[][] {
  return data[type];
}
function set(type: StoreType, rows: string[][]): void {
  data[type] = rows.map((r) => r.map((v) => (v ?? '').toString().trim()));
}
export default { get, set };
