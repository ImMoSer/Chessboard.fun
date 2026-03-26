import { databaseClient } from '../DatabaseClient'

export class SettingsRepository {
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const rows = await databaseClient.query<{ value: string }>('user',
      'SELECT value FROM settings WHERE key = ?',
      [key],
    )
    if (rows.length === 0 || !rows[0]) return defaultValue
    try {
      return JSON.parse(rows[0].value) as T
    } catch {
      return rows[0].value as unknown as T
    }
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    await databaseClient.exec('user', `
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, JSON.stringify(value)])
  }

  async deleteSetting(key: string): Promise<void> {
    await databaseClient.exec('user', 'DELETE FROM settings WHERE key = ?', [key])
  }
}

export const settingsRepository = new SettingsRepository()
