export function invokeCustomerUploadRefresh(refresh: () => Promise<unknown>): void {
  void refresh();
}
