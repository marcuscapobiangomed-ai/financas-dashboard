export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

export interface SyncActionDescriptor {
  id: string
  action: string
  args: any[]
  createdAt: number
}
